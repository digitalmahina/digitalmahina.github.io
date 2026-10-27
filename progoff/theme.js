/* Theme engine. A theme = id + decor list + token values in CSS ([data-theme=id]).
   Built-in themes live in style.css; a custom theme (step 3) is {tokens:{name:value}} applied inline.
   JS-drawn SVG reads its colours from tokens via THEME.t(name), refreshed on every apply(). */
var THEME=(function(){
  var KEY='progoff.theme',root=document.documentElement;
  var BUILTIN={retro:{name:'Ретро',deco:'tiles stripes cables scan leds numbers',meta:'#2B2724'}};
  var cache={},subs=[];
  function read(){var cs=getComputedStyle(root);cache={};return cs}
  function t(name){if(!(name in cache)){cache[name]=getComputedStyle(root).getPropertyValue('--'+name).trim()}return cache[name]}
  function current(){try{return localStorage.getItem(KEY)||'retro'}catch(e){return 'retro'}}
  function apply(id){var th=BUILTIN[id]||BUILTIN.retro;if(!BUILTIN[id])id='retro';
    root.setAttribute('data-theme',id);root.setAttribute('data-deco',th.deco||'');
    var m=document.querySelector('meta[name=theme-color]');if(m&&th.meta)m.setAttribute('content',th.meta);
    read();if(window.GZ&&GZ.retheme)GZ.retheme(t);
    try{localStorage.setItem(KEY,id)}catch(e){}
    subs.forEach(function(f){try{f(id)}catch(e){}});return id}
  function on(f){subs.push(f)}
  function list(){return Object.keys(BUILTIN).map(function(k){return {id:k,name:BUILTIN[k].name}})}
  return {t:t,apply:apply,on:on,list:list,current:current};
})();
THEME.apply(THEME.current());
