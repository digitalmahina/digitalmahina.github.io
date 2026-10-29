/* Data layer: the only code that touches storage. Local now; later Supabase (kv sync or tables). */
var Store=(function(){
  var K='progoff.v1';
  function load(){try{return JSON.parse(localStorage.getItem(K))||{v:1,entries:[],meditations:[]}}catch(e){return {v:1,entries:[],meditations:[]}}}
  var db=load();
  function save(){try{localStorage.setItem(K,JSON.stringify(db));return true}catch(e){alert('Не удалось сохранить: мало места на устройстве.');return false}}
  function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  /* Read-only import of notes written in the Ganzhi app on this device (same origin). */
  function ganzhi(){var out=[];try{var s=JSON.parse(localStorage.getItem('central-session')||'null');if(!s)return out;
    var notes=JSON.parse(localStorage.getItem('central-notes:'+s.user_id)||'[]');
    notes.forEach(function(n){out.push({id:'gz-'+n.id,kind:'day',date:n.day,text:n.text||'',vis:n.visibility||'private',src:'ganzhi',created:n.created_at})})}catch(e){}return out}
  return {
    entries:function(){return db.entries.concat(ganzhi())},
    byDate:function(k){return this.entries().filter(function(e){return e.date===k}).sort(function(a,b){return (a.created||'')<(b.created||'')?-1:1})},
    add:function(e){e.id=id();e.created=new Date().toISOString();e.vis='private';db.entries.push(e);return save()?e:null},
    update:function(eid,p){db.entries.forEach(function(e){if(e.id===eid)for(var k in p)e[k]=p[k]});save()},
    remove:function(eid){db.entries.forEach(function(e){if(e.id===eid&&e.audio&&window.VOICE)VOICE.del(e.audio)});db.entries=db.entries.filter(function(e){return e.id!==eid});save()},
    exportJSON:function(){return JSON.stringify(db,null,2)},
    importJSON:function(txt){var d=JSON.parse(txt);if(!d||!Array.isArray(d.entries))throw new Error('Не тот файл');db=d;save()}
  };
})();
