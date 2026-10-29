/* Voice notes: recording (MediaRecorder) -> IndexedDB blobs; offline transcription via stt-worker.js. Entries keep only e.audio (blob id), e.dur, e.mime. */
var VOICE=(function(){
  var DBN='progoff-audio',ST='clips',dbp=null;
  function db(){if(dbp)return dbp;dbp=new Promise(function(ok,no){var r=indexedDB.open(DBN,1);r.onupgradeneeded=function(){r.result.createObjectStore(ST)};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}});return dbp}
  function tx(mode,fn){return db().then(function(d){return new Promise(function(ok,no){var t=d.transaction(ST,mode),s=t.objectStore(ST),res=fn(s);t.oncomplete=function(){ok(res&&res.result!==undefined?res.result:undefined)};t.onerror=function(){no(t.error)}})})}
  function put(id,blob){return tx('readwrite',function(s){return s.put(blob,id)})}
  function get(id){return db().then(function(d){return new Promise(function(ok,no){var r=d.transaction(ST).objectStore(ST).get(id);r.onsuccess=function(){ok(r.result||null)};r.onerror=function(){no(r.error)}})})}
  function del(id){return tx('readwrite',function(s){return s['delete'](id)})}
  function keys(){return db().then(function(d){return new Promise(function(ok,no){var r=d.transaction(ST).objectStore(ST).getAllKeys();r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})})}
  function nid(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function supported(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder&&window.indexedDB)}
  function pickMime(){var c=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'];for(var i=0;i<c.length;i++)if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(c[i]))return c[i];return ''}
  /* recorder */
  function record(){return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(stream){
    var mime=pickMime(),mr=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:32000}:undefined),chunks=[],t0=Date.now();
    mr.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};mr.start(1000);
    return {t0:t0,stop:function(){return new Promise(function(ok){mr.onstop=function(){stream.getTracks().forEach(function(t){t.stop()});
      var type=mr.mimeType||mime||'audio/webm';ok({blob:new Blob(chunks,{type:type}),mime:type,dur:Math.round((Date.now()-t0)/1000)})};mr.stop()})},
      cancel:function(){try{mr.onstop=null;mr.stop()}catch(e){}stream.getTracks().forEach(function(t){t.stop()})}}})}
  function persist(){try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}}
  /* decode to 16 kHz mono Float32 */
  function pcm16k(blob){return blob.arrayBuffer().then(function(buf){var AC=window.AudioContext||window.webkitAudioContext,ac=new AC();
    return new Promise(function(ok,no){ac.decodeAudioData(buf,ok,no)}).then(function(ab){try{ac.close()}catch(e){}
      var n=Math.ceil(ab.duration*16000),oc=new OfflineAudioContext(1,n,16000),src=oc.createBufferSource();src.buffer=ab;src.connect(oc.destination);src.start();
      return oc.startRendering()}).then(function(r){return r.getChannelData(0)})})}
  /* model */
  var MODEL_FILES=['encoder_model_quantized.onnx','decoder_model_merged_quantized.onnx'],MB=250;
  function modelCached(){if(!window.caches)return Promise.resolve(false);return caches.open('transformers-cache').then(function(c){return c.keys()}).then(function(ks){
    var u=ks.map(function(r){return r.url});return MODEL_FILES.every(function(f){return u.some(function(x){return x.indexOf('whisper-small')>=0&&x.indexOf(f)>=0})})}).catch(function(){return false})}
  var W=null,Q={},prog={},onProg=null,readyCbs=[];
  function worker(){if(W)return W;W=new Worker('stt-worker.js?v=1',{type:'module'});
    W.onmessage=function(e){var m=e.data;
      if(m.type==='progress'){prog[m.file]={l:m.loaded||0,t:m.total||0};var L=0,T=0;for(var k in prog){L+=prog[k].l;T+=prog[k].t}if(onProg)onProg(L,T)}
      else if(m.type==='ready'){var c=readyCbs;readyCbs=[];c.forEach(function(f){f[0]()})}
      else if(m.type==='done'&&Q[m.id]){Q[m.id][0](m.text);delete Q[m.id]}
      else if(m.type==='error'){if(m.id&&Q[m.id]){Q[m.id][1](new Error(m.msg));delete Q[m.id]}else{var c2=readyCbs;readyCbs=[];c2.forEach(function(f){f[1](new Error(m.msg))})}}};
    W.onerror=function(e){var err=new Error(e.message||'Ошибка распознавания');readyCbs.splice(0).forEach(function(f){f[1](err)});Object.keys(Q).forEach(function(k){Q[k][1](err);delete Q[k]})};return W}
  function loadModel(cb){onProg=cb||null;return new Promise(function(ok,no){readyCbs.push([ok,no]);worker().postMessage({type:'load'})})}
  function transcribe(audioId){return get(audioId).then(function(b){if(!b)throw new Error('Запись не найдена');return pcm16k(b)}).then(function(a){
    return new Promise(function(ok,no){var id=nid();Q[id]=[ok,no];worker().postMessage({type:'run',id:id,audio:a},[a.buffer])})})}
  /* backup */
  function b64(blob){return new Promise(function(ok){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1])};r.readAsDataURL(blob)})}
  function exportAll(ids){var out={};return Promise.all(ids.map(function(id){return get(id).then(function(b){if(b)return b64(b).then(function(s){out[id]={mime:b.type,b64:s}})})})).then(function(){return out})}
  function importAll(map){if(!map)return Promise.resolve();return Promise.all(Object.keys(map).map(function(id){var m=map[id],bin=atob(m.b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return put(id,new Blob([u],{type:m.mime}))}))}
  function fmt(s){s=s||0;return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  return {supported:supported,record:record,put:put,get:get,del:del,keys:keys,nid:nid,persist:persist,modelCached:modelCached,loadModel:loadModel,transcribe:transcribe,exportAll:exportAll,importAll:importAll,fmt:fmt,MB:MB};
})();
