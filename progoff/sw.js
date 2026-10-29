/* Network-first: always fresh when online, cached copy when offline. */
var C='progoff-v3';
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==C&&n.indexOf('progoff-')===0}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);
  /* transformers.js library + ONNX runtime from the CDN: cache-first, so offline transcription works after the first load. */
  if(u.hostname==='cdn.jsdelivr.net'&&u.pathname.indexOf('@huggingface/transformers')>=0){e.respondWith(caches.match(r).then(function(h){return h||fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});return res})}));return}
  if(u.origin!==location.origin)return;
  /* no-cache: always revalidate with the server (cheap 304), so a new version shows up on the next open. */
  e.respondWith(fetch(r,{cache:'no-cache'}).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});return res})
    .catch(function(){return caches.match(r,{ignoreSearch:true})}))});
