/* On-device diagnostics: collects errors and long tasks from the first moment, then runs a short test on request. */
(function(){var D=window.DIAG={t0:Date.now(),errs:[],long:[],renders:{}};
  function push(a,x){a.push(x);if(a.length>30)a.shift()}
  window.addEventListener('error',function(e){push(D.errs,{t:Date.now()-D.t0,m:String(e.message||e.type)+(e.filename?' @'+e.filename.split('/').pop()+':'+e.lineno:'')})},true);
  window.addEventListener('unhandledrejection',function(e){push(D.errs,{t:Date.now()-D.t0,m:'promise: '+String(e.reason&&e.reason.message||e.reason)})});
  try{new PerformanceObserver(function(l){l.getEntries().forEach(function(x){push(D.long,{t:Math.round(x.startTime),d:Math.round(x.duration)})})}).observe({type:'longtask',buffered:true})}catch(e){D.noLongtask=true}
  D.rec=function(tab,ms){var r=D.renders[tab]=D.renders[tab]||[];r.push(ms);if(r.length>20)r.shift()};
  /* Frame test: run for ms, optionally doing work each frame (scroll etc.). */
  D.frames=function(ms,each){return new Promise(function(ok){var fs=[],last=performance.now(),end=last+ms;
    function f(t){fs.push(t-last);last=t;if(each)each(t);if(t<end)requestAnimationFrame(f);else{fs.shift();var n=fs.length||1,sum=fs.reduce(function(a,b){return a+b},0);
      ok({fps:Math.round(1000*n/sum),worst:Math.round(Math.max.apply(null,fs.concat([0]))),jank:fs.filter(function(x){return x>34}).length,n:n})}}
    requestAnimationFrame(function(t){last=t;requestAnimationFrame(f)})})};
})();
