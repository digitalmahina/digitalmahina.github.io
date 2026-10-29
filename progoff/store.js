/* Data layer: the only code that touches storage. Local now; later Supabase (kv sync or tables). */
var Store=(function(){
  var K='progoff.v1';
  function load(){try{return JSON.parse(localStorage.getItem(K))||{v:1,entries:[],meditations:[]}}catch(e){return {v:1,entries:[],meditations:[]}}}
  var db=load();
  var subs=[],AT={};function now(){return new Date().toISOString()}
  function changed(){subs.forEach(function(f){try{f()}catch(e){}})}
  function save(){if(!db.dead)db.dead={};try{localStorage.setItem(K,JSON.stringify(db));return true}catch(e){alert('Не удалось сохранить: мало места на устройстве.');return false}}
  function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  /* Read-only import of notes written in the Ganzhi app on this device (same origin). */
  function ganzhi(){var out=[];try{var s=JSON.parse(localStorage.getItem('central-session')||'null');if(!s)return out;
    var notes=JSON.parse(localStorage.getItem('central-notes:'+s.user_id)||'[]');
    notes.forEach(function(n){out.push({id:'gz-'+n.id,kind:'day',date:n.day,text:n.text||'',vis:n.visibility||'private',src:'ganzhi',created:n.created_at})})}catch(e){}return out}
  return {
    entries:function(){return db.entries.concat(ganzhi())},
    byDate:function(k){return this.entries().filter(function(e){return e.date===k}).sort(function(a,b){return (a.created||'')<(b.created||'')?-1:1})},
    add:function(e){e.id=id();e.created=now();e.upd=e.created;e.vis='private';db.entries.push(e);if(save()){changed();return e}return null},
    update:function(eid,p){db.entries.forEach(function(e){if(e.id===eid){for(var k in p)e[k]=p[k];e.upd=now()}});save();changed()},
    remove:function(eid){if(!db.dead)db.dead={};var gone=[];db.entries.forEach(function(e){if(e.id===eid){gone.push(e);if(e.audio){var aid=e.audio;
        AT[aid]=setTimeout(function(){delete AT[aid];if(window.VOICE)VOICE.del(aid);db.deadAudio=(db.deadAudio||[]).concat([aid]);save();changed()},9000)}}});
      db.entries=db.entries.filter(function(e){return e.id!==eid});db.dead[eid]=now();save();changed();return gone},
    /* Undo a removal: put the entries back, drop their tombstones, cancel the pending audio deletion. */
    restore:function(list){var t=now();(list||[]).forEach(function(e){if(e.audio&&AT[e.audio]){clearTimeout(AT[e.audio]);delete AT[e.audio]}
        if(db.dead)delete db.dead[e.id];e.upd=t;if(!db.entries.some(function(x){return x.id===e.id}))db.entries.push(e)});
      db.entries.sort(function(a,b){return (a.created||'')<(b.created||'')?-1:1});save();changed()},
    onChange:function(f){subs.push(f)},
    snapshot:function(){return {entries:db.entries,dead:db.dead||{}}},
    /* Merge another copy (from the vault): newest version of each entry wins, tombstones beat older versions. Returns true if local changed. */
    merge:function(r){if(!r)return false;var before=JSON.stringify([db.entries,db.dead||{}]),dead={},k;var ld=db.dead||{},rd=r.dead||{};
      for(k in ld)dead[k]=ld[k];for(k in rd)if(!dead[k]||rd[k]>dead[k])dead[k]=rd[k];
      var m={};function t(e){return e.upd||e.created||''}
      db.entries.concat(r.entries||[]).forEach(function(e){if(!e||!e.id)return;if(!m[e.id]||t(e)>t(m[e.id]))m[e.id]=e});
      var out=[];for(k in m){var e=m[k];if(dead[k]&&dead[k]>=t(e))continue;out.push(e)}
      out.sort(function(a,b){return (a.created||'')<(b.created||'')?-1:1});
      db.entries=out;db.dead=dead;var ch=JSON.stringify([db.entries,db.dead])!==before;if(ch)save();return ch},
    takeDeadAudio:function(){var x=db.deadAudio||[];db.deadAudio=[];save();return x},
    exportJSON:function(){return JSON.stringify(db,null,2)},
    importJSON:function(txt){var d=JSON.parse(txt);if(!d||!Array.isArray(d.entries))throw new Error('Не тот файл');db=d;save();changed()}
  };
})();
