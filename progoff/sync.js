/* Vault sync: end-to-end encrypted. A bank code (100 random bits) derives vault id, auth token and AES-GCM key on the device.
   Server (progoff-vault.pages.dev) sees only ciphertext. Doc = {entries,dead}; audio clips are separate encrypted blobs. */
var SYNC=(function(){
  var API='https://progoff-vault.pages.dev/v1',LK='progoff.vault',AL='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var remote=[],st={code:null,vid:null,auth:null,key:null,ver:0,last:null,busy:false,err:null},subs=[],timer=null,again=false;
  function emit(){subs.forEach(function(f){try{f(info())}catch(e){}})}
  function info(){return {on:!!st.vid,last:st.last,busy:st.busy,err:st.err,code:st.code}}
  function norm(c){return String(c||'').toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V')}
  function pretty(c){return c.match(/.{1,5}/g).join('-')}
  function newCode(){var b=crypto.getRandomValues(new Uint8Array(20)),s='';for(var i=0;i<20;i++)s+=AL[b[i]&31];return s}
  function hex(u){return Array.prototype.map.call(u,function(x){return x.toString(16).padStart(2,'0')}).join('')}
  function derive(code){var enc=new TextEncoder();return crypto.subtle.importKey('raw',enc.encode(code),'PBKDF2',false,['deriveBits']).then(function(k){
    return crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode('progoff-vault-v1'),iterations:150000,hash:'SHA-256'},k,512)}).then(function(bits){var u=new Uint8Array(bits);
    return crypto.subtle.importKey('raw',u.slice(32,64),'AES-GCM',false,['encrypt','decrypt']).then(function(key){return {vid:hex(u.slice(0,12)),auth:hex(u.slice(12,32)),key:key}})})}
  function encBytes(buf){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},st.key,buf).then(function(c){var o=new Uint8Array(12+c.byteLength);o.set(iv);o.set(new Uint8Array(c),12);return o})}
  function decBytes(buf){var u=new Uint8Array(buf);return crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},st.key,u.slice(12))}
  function b64(u){var s='';for(var i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
  function unb64(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
  function req(path,opt){opt=opt||{};var h=opt.headers||{};h['X-Vault']=st.vid;h['Authorization']='Bearer '+st.auth;opt.headers=h;
    return fetch(API+path,opt).then(function(r){if(r.status===401)throw new Error('Банк не принял код');return r})}
  function json(r){return r.json().then(function(j){if(!r.ok&&r.status!==409)throw new Error(j.error||('Ошибка '+r.status));j._st=r.status;return j})}
  function persist(){localStorage.setItem(LK,JSON.stringify({code:st.code,ver:st.ver,last:st.last}))}
  function setup(code){code=norm(code);if(code.length!==20)return Promise.reject(new Error('Код — 20 знаков'));
    return derive(code).then(function(d){st.code=code;st.vid=d.vid;st.auth=d.auth;st.key=d.key;return d})}
  function boot(){try{var s=JSON.parse(localStorage.getItem(LK)||'null');if(s&&s.code)return setup(s.code).then(function(){st.ver=s.ver||0;st.last=s.last||null;emit();sync()})}catch(e){}return Promise.resolve()}
  function open(code,create){return setup(code||newCode()).then(function(){
    return fetch(API+'/vault',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vid:st.vid,auth:st.auth})})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error==='exists'?'Такой банк уже есть, но код не подошёл':'Не удалось открыть банк');if(!create&&j.created){}return j})})})
    .then(function(){st.ver=0;persist();emit();return sync()}).catch(function(e){st.code=st.vid=st.auth=st.key=null;emit();throw e})}
  function forget(){localStorage.removeItem(LK);st={code:null,vid:null,auth:null,key:null,ver:0,last:null,busy:false,err:null};emit()}
  function pull(){return req('/doc').then(json).then(function(j){if(!j.data)return {ver:0,doc:null};
    return decBytes(unb64(j.data)).then(function(p){return {ver:j.ver,doc:JSON.parse(new TextDecoder().decode(p))}})})}
  function push(ver){var body=new TextEncoder().encode(JSON.stringify(Store.snapshot()));return encBytes(body).then(function(c){
    return req('/doc',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ver:ver,data:b64(c)})}).then(json)})}
  function audio(){if(!window.VOICE||!window.indexedDB)return Promise.resolve(false);var got=false;
    return req('/a').then(json).then(function(j){var remote={};j.ids.forEach(function(i){remote[i]=1});
      var dead=Store.takeDeadAudio(),want={};Store.snapshot().entries.forEach(function(e){if(e.audio)want[e.audio]=e});
      return VOICE.keys().then(function(local){var lk={};local.forEach(function(i){lk[i]=1});var jobs=[];
        dead.forEach(function(i){if(remote[i]&&!want[i])jobs.push(function(){return req('/a/'+i,{method:'DELETE'})})});
        Object.keys(want).forEach(function(i){
          if(lk[i]&&!remote[i])jobs.push(function(){return VOICE.get(i).then(function(b){return b.arrayBuffer()}).then(encBytes).then(function(c){return req('/a/'+i,{method:'PUT',body:c})})});
          if(!lk[i]&&remote[i])jobs.push(function(){return req('/a/'+i).then(function(r){return r.arrayBuffer()}).then(decBytes).then(function(p){got=true;return VOICE.put(i,new Blob([p],{type:want[i].mime||'audio/webm'}))})})});
        return jobs.reduce(function(pr,f){return pr.then(f)},Promise.resolve())})}).then(function(){return got})}
  function sync(){if(!st.vid)return Promise.resolve(false);if(st.busy){again=true;return Promise.resolve(false)}
    if(!navigator.onLine){st.err='Нет сети — синхронизирую, когда появится';emit();return Promise.resolve(false)}
    st.busy=true;st.err=null;emit();var changed=false;
    function round(n){return pull().then(function(r){if(r.doc&&Store.merge(r.doc))changed=true;
        var same=r.doc&&JSON.stringify([r.doc.entries,r.doc.dead])===JSON.stringify([Store.snapshot().entries,Store.snapshot().dead]);
        if(same){st.ver=r.ver;return}
        return push(r.ver).then(function(j){if(j._st===409){if(n>3)throw new Error('Не удалось свести изменения');return round(n+1)}st.ver=j.ver})})}
    return round(0).then(audio).then(function(g){st.last=new Date().toISOString();persist();st.busy=false;emit();if(changed||g)remote.forEach(function(f){try{f()}catch(e){}});
        if(again){again=false;later()}return changed||g},
      function(e){st.busy=false;st.err=e.message||String(e);emit();return false})}
  function later(){clearTimeout(timer);timer=setTimeout(sync,3000)}
  Store.onChange(function(){if(st.vid)later()});
  window.addEventListener('online',function(){if(st.vid)sync()});
  return {boot:boot,open:open,forget:forget,sync:sync,on:function(f){subs.push(f)},onRemote:function(f){remote.push(f)},info:info,pretty:pretty};
})();
