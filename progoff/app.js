(function(){
  var $=function(s){return document.querySelector(s)};
  var T=THEME.t;
  var screen=$('#screen'),sheet=$('#sheet'),veil=$('#veil');
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  var TODAY,TS,WIN;
  function refresh(){TODAY=GZ.noon(new Date());TS=GZ.slot(TODAY);
    var start=TS.out?GZ.dateOf(TS.year,0,1):GZ.add(TODAY,1-TS.n);WIN=[];for(var i=0;i<60;i++)WIN.push(GZ.add(start,i))}
  refresh();
  var KIND={day:'день',fast:'пост',dream:'сон / образ',period:'начало этапа',now:'сейчас',stone:'веха',yearnote:'заметка к году',fork:'развилка',partner:'собеседник',dialog:'диалог',med:'тишина',todo:'дело',dreamx:'развёртка сна'};
  function ringId(sl){return sl.out?null:sl.year+'-'+sl.k}
  /* Periods: each lasts from its date until the next period starts (or today). */
  function periods(){var ps=Store.entries().filter(function(e){return e.kind==='period'}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:((a.created||'')<(b.created||'')?-1:1)});
    var tk=GZ.key(TODAY);ps=ps.filter(function(p){return p.date<=tk});
    return ps.map(function(p,i){var nx=ps[i+1],end=nx?GZ.key(GZ.add(GZ.parse(nx.date),-1)):tk;if(end<p.date)end=p.date;return {e:p,start:p.date,end:end,cur:!nx}})}
  function curPeriod(){var ps=periods();return ps.length?ps[ps.length-1]:null}
  function daysBetween(a,b){return Math.round((GZ.parse(b)-GZ.parse(a))/864e5)}
  function nowEntry(){var id=ringId(TS);if(!id)return null;return Store.entries().filter(function(e){return e.kind==='now'&&e.ring===id})[0]||null}

  var LAYER=(function(){try{return localStorage.getItem('progoff.layer')||'g'}catch(e){return 'g'}})();
  function setLayer(v){LAYER=v;try{localStorage.setItem('progoff.layer',v)}catch(e){}}
  function ringSVG(){
    var TH='',C=180,R=148,s='<svg class="ring" viewBox="0 0 360 360" role="img" aria-label="Круг 60 дней">';
    s+='<circle cx="'+C+'" cy="'+C+'" r="'+R+'" fill="none" stroke="'+T('ring-line')+'"/>';
    var w0=GZ.key(WIN[0]),w1=GZ.key(WIN[59]),RA=R+17,pi=0;
    function pt(i,r){var a=2*Math.PI*i/60;return [(C+r*Math.sin(a)).toFixed(1),(C-r*Math.cos(a)).toFixed(1)]}
    periods().forEach(function(p){if(p.end<w0||p.start>w1)return;
      var i0=Math.max(0,daysBetween(w0,p.start)),i1=Math.min(59,daysBetween(w0,p.end)),col=pi++%2?T('ring-ink-2'):T('ring-ink'),sw=p.cur?2.4:1.4;
      var a=pt(i0,RA),b=pt(i1,RA),big=(i1-i0)>30?1:0;
      if(i1>i0)s+='<path d="M'+a[0]+' '+a[1]+' A'+RA+' '+RA+' 0 '+big+' 1 '+b[0]+' '+b[1]+'" fill="none" stroke="'+col+'" stroke-width="'+sw+'" stroke-linecap="round"/>';
      if(p.start>=w0){var t0=pt(i0,RA-5),t1=pt(i0,RA+5);s+='<line x1="'+t0[0]+'" y1="'+t0[1]+'" x2="'+t1[0]+'" y2="'+t1[1]+'" stroke="'+col+'" stroke-width="1.6"/>'}
      else if(i1===i0)s+='<circle cx="'+a[0]+'" cy="'+a[1]+'" r="1.6" fill="'+col+'"/>'});
    var OR=T('moon-full'),VI=T('ekadashi'),MA=20;
    if(LAYER!=='g'&&MOON.phase){var w0k=GZ.key(WIN[0]),P=[];
      for(var q=0;q<=236;q++){var u=q/4,r0=R-MA*Math.cos(MOON.phase(w0k,u)*Math.PI/180);P.push(pt(u,r0).join(' '))}
      s+='<path d="M'+P.join(' L')+'" fill="none" stroke="'+OR+'" stroke-width="1.4" stroke-linejoin="round"/>'}
    WIN.forEach(function(d,i){
      var n=i+1,a=2*Math.PI*i/60,sx=Math.sin(a),cy=-Math.cos(a),x=C+R*sx,y=C+R*cy,el=GZ.EL[GZ.elem(n)],k=GZ.key(d);
      var es=Store.byDate(k).filter(function(e){return e.kind!=='period'&&e.kind!=='fast'&&e.kind!=='todo'}),j=0;
      es.slice(0,8).forEach(function(e){var rr=R-16-j*9;j++;
        s+=e.kind==='dream'?'<circle cx="'+(C+rr*sx).toFixed(1)+'" cy="'+(C+rr*cy).toFixed(1)+'" r="3.6" fill="none" stroke="'+el[1]+'" stroke-width="1.6"'+(e.mode==='twilight'?' stroke-dasharray="2 1.6"':'')+' data-day="'+k+'" style="cursor:pointer"/>'
          :e.kind==='dreamx'?'<circle cx="'+(C+rr*sx).toFixed(1)+'" cy="'+(C+rr*cy).toFixed(1)+'" r="2.4" fill="none" stroke="'+el[1]+'" stroke-width="1.2" data-day="'+k+'" style="cursor:pointer"/>'
          :'<circle cx="'+(C+rr*sx).toFixed(1)+'" cy="'+(C+rr*cy).toFixed(1)+'" r="3.4" fill="'+el[1]+'" data-day="'+k+'" style="cursor:pointer"/>'});
      if(LAYER!=='g'&&MOON.phase){var mr=R-MA*Math.cos(MOON.phase(k)*Math.PI/180),mx=+(C+mr*sx).toFixed(1),my=+(C+mr*cy).toFixed(1);
        if(MOON.nm(k))s+='<circle cx="'+mx+'" cy="'+my+'" r="4.6" fill="'+T('moon-new')+'" stroke="'+T('moon-new-edge')+'" stroke-width="1"/><circle cx="'+mx+'" cy="'+my+'" r="1.3" fill="'+T('moon-new-edge')+'"/>';
        else if(MOON.fm(k))s+='<circle cx="'+mx+'" cy="'+my+'" r="5" fill="'+OR+'"/>';
        if(LAYER==='e'&&MOON.ek(k)){var f=Store.byDate(k).some(function(e){return e.kind==='fast'}),q2=4.6;
          s+='<path d="M'+mx+' '+(my-q2)+' L'+(mx+q2)+' '+my+' L'+mx+' '+(my+q2)+' L'+(mx-q2)+' '+my+' Z" fill="'+(f?VI:T('moon-new'))+'" stroke="'+VI+'" stroke-width="1.3"/>'}}
      var tds=Store.byDate(k).filter(function(e){return e.kind==='todo'});
      if(tds.length){var dn=tds.every(function(e){return e.done}),t0=[C+(R+22)*sx,C+(R+22)*cy],t1=[C+(R+30)*sx,C+(R+30)*cy];
        s+='<line x1="'+t0[0].toFixed(1)+'" y1="'+t0[1].toFixed(1)+'" x2="'+t1[0].toFixed(1)+'" y2="'+t1[1].toFixed(1)+'" stroke="'+T('ring-ink')+'" stroke-width="1" stroke-linecap="round"/><circle cx="'+(C+(R+33)*sx).toFixed(1)+'" cy="'+(C+(R+33)*cy).toFixed(1)+'" r="2.4" fill="'+(dn?T('ring-ink'):T('moon-new'))+'" stroke="'+T('ring-ink')+'" stroke-width="1"/>'}
      var isT=k===GZ.key(TODAY);
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="6" fill="'+el[0]+'" stroke="'+el[1]+'" stroke-width=".9"/>';
      s+='<text x="'+x.toFixed(1)+'" y="'+(y+2).toFixed(1)+'" text-anchor="middle" font-size="'+(n>9?5.2:6)+'" font-weight="600" fill="'+el[1]+'" font-family="Space Mono,monospace" pointer-events="none">'+n+'</text>';
      if(isT)s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="9.5" fill="none" stroke="'+T('ring-ink')+'" stroke-width="1.5"/>';
      if(isT)TH='<circle data-day="'+k+'" class="todayhit" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="17" fill="transparent" style="cursor:pointer" aria-label="Сегодня"/>';
      else s+='<circle data-day="'+k+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="12" fill="transparent" style="cursor:pointer"/>';
    });
    if(LAYER!=='g'&&MOON.pname){var tk=GZ.key(TODAY);s+='<circle cx="'+C+'" cy="'+C+'" r="46" fill="'+T('ring-center')+'" stroke="'+T('ring-line')+'"/>'+
      '<text x="'+C+'" y="'+(C-8)+'" text-anchor="middle" font-size="9" fill="'+T('ring-ink-2')+'" font-family="Space Mono,monospace">сегодня</text>'+
      '<text x="'+C+'" y="'+(C+5)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+T('ring-ink')+'" font-family="Space Mono,monospace">'+GZ.short(TODAY)+'</text>'+
      '<text x="'+C+'" y="'+(C+18)+'" text-anchor="middle" font-size="9" fill="'+T('ring-ink-2')+'" font-family="Space Mono,monospace">'+MOON.pname(tk)+'</text>'}
    else s+='<circle cx="'+C+'" cy="'+C+'" r="3" fill="'+T('ring-ink')+'"/>';
    s+=TH+'</svg>';return s}

  /* Phase 5: rule-based hints, no AI. */
  function hints(){var H=[],es=Store.entries(),tk=GZ.key(TODAY);
    var days=es.filter(function(e){return e.kind==='day'||e.kind==='dream'}).map(function(e){return e.date}).sort();
    var last=days.length?days[days.length-1]:null;
    if(!last)H.push('Ты ещё ничего не записывал. Достаточно одной строки о сегодняшнем дне.');
    else{var g=daysBetween(last,tk);if(g>=3)H.push('Последняя запись была '+g+' дн. назад. Вернись к ней одной строкой, без итогов.')}
    if(!TS.out&&!nowEntry())H.push('В начале круга нет записи «Сейчас». Она помогает потом увидеть, как изменилось.');
    if(!TS.out&&TS.n>=53&&ents('stone').length<12)H.push('Круг подходит к концу. Была ли в нём веха — событие, которое поменяло направление?');
    var cp=curPeriod();if(!cp)H.push('Этап жизни не назван. Одно слово тоже подойдёт.');else if(daysBetween(cp.start,tk)>120)H.push('Этап «'+(cp.e.title||'')+'» идёт больше 120 дней. Он всё ещё тот же?');
    var dr=es.filter(function(e){return e.kind==='dream'&&daysBetween(e.date,tk)<=14}).length;
    var rec=dreamImages().filter(function(x){return x.n>=2})[0];if(rec)H.unshift('Образ «'+rec.w+'» приходит уже '+rec.n+'-й раз. Не толкуй его — разверни последний сон с ним.');
    if(dr>=3)H.push('За две недели накопились сны и образы. Не расшифровывай, просто заведи диалог с одним из них.');
    if(window.Moon&&Moon.ekadashi&&LAYER==='e'){}
    return H.slice(0,2)}
  function hintsCard(){var H=hints();return H.length?'<div class="card soft"><span class="label">Подсказка</span>'+H.map(function(t){return '<p>'+esc(t)+'</p>'}).join('')+'</div>':''}

  var STANDALONE=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true,BIP=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();BIP=e});
  window.addEventListener('appinstalled',function(){STANDALONE=true;BIP=null;if(tab==='krug')render()});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
  /* Bank (vault sync): E2E-encrypted, one code joins devices. */
  function syncLine(i){if(!i.on)return '';if(i.busy)return 'Синхронизирую…';if(i.err)return i.err;
    if(!i.last)return 'Ещё не синхронизировано';var d=new Date(i.last);return 'Синхронизировано '+GZ.short(d)+', '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function bankCard(){var i=SYNC.info();
    return '<div class="card" id="bank"><span class="label">Банк · синхронизация</span>'+(i.on?
      '<p class="sub" id="syncst">'+esc(syncLine(i))+'</p><div class="row"><button class="ghost" id="bsync">Синхронизировать</button><button class="ghost" id="bcode">Код для устройства</button></div><button class="link" id="bout">Отключить это устройство</button>':
      '<p class="sub">Твой банк: записи и голосовые шифруются на устройстве, сервер видит только шифр. Другие устройства подключаются одним кодом.</p><button class="primary" id="bnew">Создать банк</button><button class="ghost" id="bjoin">Подключить по коду</button>')+'</div>'}
  function bindBank(){var b;
    if((b=$('#bnew')))b.onclick=function(){var b=this;b.disabled=true;b.textContent='Создаю…';SYNC.open(null,true).then(function(){showCode(true)},function(e){b.disabled=false;b.textContent='Создать банк';alertSheet(e.message)})};
    if((b=$('#bjoin')))b.onclick=joinSheet;
    if((b=$('#bsync')))b.onclick=function(){SYNC.sync()};
    if((b=$('#bcode')))b.onclick=function(){showCode(false)};
    if((b=$('#bout')))b.onclick=function(){var b=this;if(b.dataset.sure){SYNC.forget();render()}else{b.dataset.sure='1';b.textContent='Записи останутся на устройстве, но перестанут сходиться. Нажми ещё раз'}}}
  function alertSheet(t){open('<div><h1>Банк</h1></div><p>'+esc(t)+'</p><button class="primary" id="aok">Понятно</button>');$('#aok').onclick=close}
  function showCode(fresh){var c=SYNC.pretty(SYNC.info().code);
    open('<div><h1>'+(fresh?'Банк создан':'Код банка')+'</h1><p class="sub">Введи его на другом устройстве: Круг → «Подключить по коду».</p></div>'+
      '<p class="bankcode" id="bc">'+c+'</p><p class="sub">Сохрани код в надёжном месте. Без него банк не открыть, восстановить его нельзя: ключ есть только у тебя.</p>'+
      '<button class="ghost" id="bcp">Скопировать</button><button class="primary" id="bok">Готово</button>');
    $('#bcp').onclick=function(){try{navigator.clipboard.writeText(c).then(function(){$('#bcp').textContent='Скопировано'})}catch(e){}};$('#bok').onclick=function(){close();render()}}
  function joinSheet(){open('<div><h1>Подключить по коду</h1><p class="sub">Код банка — 20 знаков, его показывает устройство, где банк создан.</p></div>'+
      '<input id="jc" class="field" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX"><p class="sub" id="jerr"></p>'+
      '<p class="sub">Записи этого устройства не пропадут: они сольются с банком.</p><button class="primary" id="jok">Подключить</button><button class="link" id="jno">Отмена</button>');
    $('#jno').onclick=close;$('#jok').onclick=function(){var b=$('#jok');b.disabled=true;b.textContent='Подключаю…';
      SYNC.open($('#jc').value,false).then(function(){close();render()},function(e){b.disabled=false;b.textContent='Подключить';$('#jerr').textContent=e.message})}}
  SYNC.on(function(i){var s=document.getElementById('syncst');if(s)s.textContent=syncLine(i)});
  SYNC.onRemote(function(){if(sheet.hidden)render()});
  SYNC.boot();
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&SYNC.info().on)SYNC.sync()});

  /* Settings live under the CENTRAL avatar in the header. */
  function settings(){var h='<div><h1>Настройки</h1></div>'+bankCard();
    h+='<h2>Скин</h2><div class="seg skins" id="skins">'+THEME.list().map(function(t){return '<button data-skin="'+t.id+'"'+(t.id===THEME.current()?' class="on"':'')+'><i></i>'+t.name+'</button>'}).join('')+'</div>';
    h+='<div class="row"><button class="link" id="exp">Скачать копию</button><button class="link" id="imp">Загрузить копию</button><button class="link" id="pdf">PDF кольца</button></div>';
    if(!STANDALONE)h+='<button class="ghost" id="a2hs">На экран «Домой»</button>';
    open(h);bindBank();
    sheet.querySelectorAll('[data-skin]').forEach(function(b){b.onclick=function(){THEME.apply(b.getAttribute('data-skin'));sheet.querySelectorAll('[data-skin]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    var ah=$('#a2hs');if(ah)ah.onclick=addHome;
    $('#exp').onclick=function(){var o=JSON.parse(Store.exportJSON()),ids=o.entries.filter(function(e){return e.audio}).map(function(e){return e.audio});
      (ids.length?VOICE.exportAll(ids):Promise.resolve(null)).then(function(au){if(au)o.audio=au;var b=new Blob([JSON.stringify(o)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='dnevnik-'+GZ.key(TODAY)+'.json';a.click()})};
    $('#pdf').onclick=function(){close();setTimeout(function(){window.print()},50)};
    $('#imp').onclick=function(){var i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=function(){var f=i.files[0];if(!f)return;f.text().then(function(t){importAsk(t)})};i.click()};
  }
  var BR=document.getElementById('brand');if(BR){BR.onclick=settings;BR.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();settings()}}}
  function syncDot(i){var d=document.getElementById('sdot');if(!d)return;d.hidden=!i.on;d.className='sdot'+(!i.on?'':i.err?' err':i.busy?' busy':i.last?' ok':' busy');
    d.title=i.on?syncLine(i):'Банк не подключён'}
  SYNC.on(syncDot);setTimeout(function(){syncDot(SYNC.info())},0);

  /* The main «+» button: tap opens the choice, long-press records voice right away. */
  function plusSheet(){var k=GZ.key(TODAY);
    open('<div><h1>Новая запись</h1><p class="sub">'+GZ.short(TODAY)+'</p></div><div class="plusgrid">'+
      '<button class="pk" data-p="text"><b>Текст</b><span>запись дня</span></button>'+
      (VOICE.supported()?'<button class="pk" data-p="voice"><b>Голос</b><span>надиктовать</span></button>':'')+
      '<button class="pk" data-p="dream"><b>Сон</b><span>или образ</span></button>'+
      '<button class="pk" data-p="todo"><b>Дело</b><span>в список</span></button></div>'+
      (VOICE.supported()?'<p class="sub">Подсказка: долгое нажатие на «+» сразу начинает голосовую запись.</p>':''));
    sheet.querySelectorAll('[data-p]').forEach(function(b){b.onclick=function(){var w=b.getAttribute('data-p');
      if(w==='text')editor(k);else if(w==='voice')voiceSheet(k,'day');else if(w==='dream')dreamEditor(k);else todoEditor()}})}
  (function(){var f=document.getElementById('fab');if(!f)return;var t=null,long=false;
    function down(e){long=false;clearTimeout(t);t=setTimeout(function(){long=true;if(navigator.vibrate)navigator.vibrate(20);if(VOICE.supported())voiceSheet(GZ.key(TODAY),'day',null,true);else plusSheet()},480)}
    function up(){clearTimeout(t)}
    f.addEventListener('pointerdown',down);f.addEventListener('pointerup',up);f.addEventListener('pointerleave',up);f.addEventListener('pointercancel',up);
    f.addEventListener('contextmenu',function(e){e.preventDefault()});
    f.onclick=function(e){if(long){long=false;e.preventDefault();return}plusSheet()}})();

  /* Undo instead of «нажми ещё раз»: remove at once, offer «Вернуть» for 8 seconds. */
  var TO=null;
  function toast(msg,act,fn){var el=document.getElementById('toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
    el.innerHTML='<span>'+esc(msg)+'</span>'+(act?'<button class="tact">'+esc(act)+'</button>':'');el.hidden=false;clearTimeout(TO);
    var b=el.querySelector('.tact');if(b)b.onclick=function(){el.hidden=true;clearTimeout(TO);fn()};TO=setTimeout(function(){el.hidden=true},8000)}
  function undoDel(ids,after,msg){var gone=[];ids.forEach(function(i){gone=gone.concat(Store.remove(i)||[])});after();
    toast(msg||'Удалено',gone.length?'Вернуть':null,function(){Store.restore(gone);after()})}

  /* Drafts: every field in a sheet is kept as you type; reopening the same form brings it back. */
  var DK=null,DRAFT='progoff.draft:';
  function hsh(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
  function draftFields(){return [].slice.call(sheet.querySelectorAll('textarea,input.field:not([type=date]):not([type=file])')).filter(function(f){return f.id})}
  function draftBind(){var fs=draftFields();DK=null;if(!fs.length)return;var h1=sheet.querySelector('h1'),sub=sheet.querySelector('h1+.sub');
    DK=DRAFT+hsh((h1?h1.textContent:'')+'|'+(sub?sub.textContent:'')+'|'+fs.map(function(f){return f.id+'='+f.value}).join('|'));
    var d=null;try{d=JSON.parse(localStorage.getItem(DK)||'null')}catch(e){}
    if(d&&Date.now()-d.t<14*864e5&&fs.some(function(f){return d.v[f.id]&&d.v[f.id]!==f.value})){var orig={};fs.forEach(function(f){orig[f.id]=f.value;if(d.v[f.id]!=null)f.value=d.v[f.id]});
      var n=document.createElement('p');n.className='sub draftnote';n.innerHTML='Восстановлен черновик · <button class="link" id="drx">Начать заново</button>';
      var first=fs[0];first.parentNode.insertBefore(n,first);
      n.querySelector('#drx').onclick=function(){fs.forEach(function(f){f.value=orig[f.id]});localStorage.removeItem(dk);n.remove();fs[0].focus()}}
    var dk=DK;fs.forEach(function(f){f.addEventListener('input',function(){var v={};fs.forEach(function(x){v[x.id]=x.value});
      if(fs.every(function(x){return !x.value.trim()}))localStorage.removeItem(dk);else localStorage.setItem(dk,JSON.stringify({t:Date.now(),v:v}))})})}
  Store.onChange(function(){if(DK&&!sheet.hidden){localStorage.removeItem(DK)}});
  (function(){try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&k.indexOf(DRAFT)===0){var d=JSON.parse(localStorage.getItem(k)||'{}');if(!d.t||Date.now()-d.t>14*864e5)localStorage.removeItem(k)}}}catch(e){}})();
  function addHome(){
    if(BIP){var p=BIP;BIP=null;p.prompt();p.userChoice.then(function(c){if(c&&c.outcome==='accepted'){STANDALONE=true;close();if(tab==='krug')render()}}).catch(function(){});return}
    var ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
        and=/Android/.test(ua),mac=/Macintosh/.test(ua)&&!ios,saf=/Safari/.test(ua)&&!/Chrome|Chromium|Edg|CriOS|FxiOS|Firefox/.test(ua),fx=/Firefox|FxiOS/.test(ua),
        tg=/Telegram/i.test(ua)||!!window.TelegramWebviewProxy;
    var how=tg?'<p>Ты открыл дневник внутри Telegram, отсюда иконку не добавить. Нажми ⋮ → «Открыть в браузере», а там снова эту кнопку.</p>'
      :ios?'<p>На iPhone и iPad браузер не разрешает сайтам ставить иконку самим. В Safari нажми «Поделиться» (квадрат со стрелкой) → «На экран „Домой“» → «Добавить».</p><p class="sub">В других браузерах на iPhone этого пункта может не быть, тогда открой страницу в Safari.</p>'
      :and?(fx?'<p>В Firefox: меню ⋮ → «Установить» или «Добавить на главный экран».</p>':'<p>Ещё секунду. Если окно установки не появится само, открой меню ⋮ справа вверху → «Установить приложение» или «Добавить на главный экран».</p>')
      :mac&&saf?'<p>В Safari на Mac: меню «Файл» → «Добавить в Dock».</p>'
      :fx?'<p>Firefox на компьютере не устанавливает такие приложения. Открой страницу в Chrome или Edge.</p>'
      :'<p>Ещё секунду. Если окно установки не появится само, нажми значок установки (монитор со стрелкой) справа в адресной строке или меню ⋮ → «Установить».</p>';
    open('<h2>На экран «Домой»</h2>'+how+'<p class="sub">Записи останутся в этом браузере на этом устройстве. Иконка откроет тот же дневник.</p><button class="primary" id="a2ok">Понятно</button>');
    $('#a2ok').onclick=close;
    /* Chrome may hand over the install prompt a moment later: switch to the one-tap button. */
    if(!ios&&!tg){var t0=Date.now(),iv=setInterval(function(){if(BIP&&$('#a2ok')){clearInterval(iv);var b=$('#a2ok');b.textContent='Установить';b.onclick=function(){addHome()}}else if(Date.now()-t0>15000||!$('#a2ok'))clearInterval(iv)},300)}
  }
  /* Wide screens (desktop app window): ring on the left, everything else on the right. */
  var WIDE=window.matchMedia?matchMedia('(min-width: 860px)'):{matches:false};
  function wideKrug(){if(!WIDE.matches)return;var L=document.createElement('div'),Rt=document.createElement('div');L.className='kl';Rt.className='kr';
    [].slice.call(screen.children).forEach(function(c){(c.matches('#lay,.ring,.legend')?L:Rt).appendChild(c)});screen.appendChild(L);screen.appendChild(Rt);screen.classList.add('wide')}
  if(WIDE.addEventListener)WIDE.addEventListener('change',function(){if(tab==='krug')render()});
  function krug(){screen.classList.remove('wide');
    var head=TS.out?'Между кругами':'Круг '+GZ.ROM[TS.k];
    var sub=TS.out?'Новый круг I начнётся '+GZ.short(WIN[0]):GZ.short(WIN[0])+' – '+GZ.short(WIN[59])+' · день '+TS.n+' из 60';
    var back=Store.byDate(GZ.key(GZ.add(TODAY,-60)));
    var cp=curPeriod(),nw=nowEntry();
    var h='<div><h1>'+head+'</h1><p class="sub">'+sub+'</p></div>';
    h+='<div class="card"><span class="label">Текущий этап</span>'+(cp?'<p class="ptitle">'+esc(cp.e.title||'Без названия')+'</p><p class="sub">с '+GZ.short(GZ.parse(cp.start))+' · '+(daysBetween(cp.start,GZ.key(TODAY))+1)+'-й день</p>'+(cp.e.text?'<p>'+esc(cp.e.text.slice(0,180))+(cp.e.text.length>180?'…':'')+'</p>':''):'<p class="sub">Этап — отрезок жизни со своим настроением. Назови тот, в котором ты сейчас.</p>')+
      '<button class="ghost" id="newp">Начался новый этап</button></div>';
    if(!TS.out)h+='<div class="card'+(nw?'':' soft')+'"><span class="label">Сейчас · начало круга '+GZ.ROM[TS.k]+'</span>'+(nw?'<p>'+esc(nw.text.slice(0,240))+(nw.text.length>240?'…':'')+'</p><p class="sub">записано '+GZ.short(GZ.parse(nw.date))+'</p>':'<p class="sub">Открытый момент: где ты стоишь на пороге этих 60 дней? Что уже есть, что только начинается?</p><button class="ghost" id="nowb">Записать «Сейчас»</button>')+'</div>';
    h+='<div class="row" id="lay">'+[['g','Ганьчжи'],['m','+ Луна'],['e','+ Экадаши']].map(function(x){return '<button class="'+(LAYER===x[0]?'primary':'ghost')+'" data-lay="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>';
    h+=ringSVG()+(LAYER!=='g'?'<p class="legend"><span style="color:'+T('moon-full')+'">●</span> полнолуние &nbsp; ◦ новолуние'+(LAYER==='e'?' &nbsp; <span style="color:'+T('ekadashi')+'">◇</span> экадаши (<span style="color:'+T('ekadashi')+'">◆</span> пост)':'')+'<br>линия: наружу — к полнолунию, внутрь — к новолунию</p>':'')+'<p class="legend">● запись дня &nbsp; ○ сон &nbsp; ◌ образ в полусне &nbsp; — этап &nbsp; · тап по точке — открыть день</p>';
    if(LAYER!=='g'&&MOON.ek){var ev=[],MN=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];for(var i1=0;i1<120&&ev.length<4;i1++){var d1=GZ.add(TODAY,i1),k1=GZ.key(d1),t1=MOON.nm(k1)?'новолуние':MOON.fm(k1)?'полнолуние':(LAYER==='e'&&MOON.ek(k1))?'экадаши':'';if(t1)ev.push(d1.getDate()+' '+MN[d1.getMonth()]+' — '+t1+(i1?' (через '+i1+' дн.)':' (сегодня)'))}
      if(ev.length)h+='<div class="legend" id="near"><b>Ближайшее</b><br>'+ev.join('<br>')+'</div>'}
    h+=hintsCard();
    h+='<div class="card"><span class="label">60 дней назад на этой точке</span>'+
      (back.length?back.map(function(e){return '<p>«'+esc((e.text||e.title||'').slice(0,140))+'»</p>'}).join('')+'<p class="sub">Что из этого продолжается? Продолжи:</p><div class="row"><button class="ghost" id="rd">Диалогом</button><button class="ghost" id="rs">Вехой</button><button class="ghost" id="rp">Этапом</button></div>':'<p class="sub">Пока пусто. Через 60 дней здесь появится то, что ты пишешь сегодня.</p>')+'</div>';
    screen.innerHTML=h;
    $('#newp').onclick=periodEditor;
    screen.querySelectorAll('[data-lay]').forEach(function(b){b.onclick=function(){setLayer(b.getAttribute('data-lay'));krug()}});
    var rd=$('#rd');if(rd){rd.onclick=function(){document.querySelector('#tabs [data-tab=dialogs]').onclick()};$('#rs').onclick=stoneEditor;$('#rp').onclick=periodEditor}
    var nb=$('#nowb');if(nb)nb.onclick=nowEditor;
    screen.querySelectorAll('[data-day]').forEach(function(c){c.onclick=function(){day(c.getAttribute('data-day'))}});
    wideKrug();
  }

  function importAsk(t){
    open('<div><h1>Загрузить копию</h1><p class="sub">Записи на этом устройстве заменятся записями из файла.</p></div><p class="sub" id="ierr"></p><button class="primary" id="iok">Заменить</button><button class="link" id="ino">Отмена</button>');
    $('#ino').onclick=close;$('#iok').onclick=function(){try{var d=JSON.parse(t),au=d.audio;delete d.audio;Store.importJSON(JSON.stringify(d));(au&&window.indexedDB?VOICE.importAll(au):Promise.resolve()).then(function(){close();render()},function(e){$('#ierr').textContent='Записи загружены, но голосовые не сохранились: '+e.message})}catch(e){$('#ierr').textContent=e.message}}}

  function periodEditor(){var tk=GZ.key(TODAY);
    open('<div><h1>Новый этап</h1><p class="sub">Прошлый этап закончится накануне.</p></div>'+
      '<input id="pt" class="field" maxlength="80" placeholder="Название этапа, например «Переезд»">'+
      '<label class="sub">Когда начался <input id="pd" class="field" type="date" max="'+tk+'" value="'+tk+'"></label>'+
      '<textarea id="px" placeholder="Какой он, этот этап? Что в нём главное, какое у него настроение?"></textarea>'+
      '<button class="primary" id="ps">Сохранить этап</button>');
    $('#pt').focus();
    $('#ps').onclick=function(){var t=$('#pt').value.trim(),d=$('#pd').value||tk;if(!t){$('#pt').focus();return}if(d>tk)d=tk;
      if(Store.add({kind:'period',date:d,title:t,text:$('#px').value.trim()})){close();render()}}}

  function nowEditor(){var id=ringId(TS);
    open('<div><h1>Сейчас</h1><p class="sub">Открытый момент · начало круга '+GZ.ROM[TS.k]+'</p></div>'+
      '<textarea id="nt" placeholder="Где я сейчас? Что во мне и вокруг меня в эти дни? Без оценок, как есть."></textarea>'+
      '<button class="primary" id="ns">Сохранить</button>');
    var ta=$('#nt');ta.focus();
    $('#ns').onclick=function(){var t=ta.value.trim();if(!t){ta.focus();return}
      if(Store.add({kind:'now',date:GZ.key(TODAY),ring:id,text:t})){close();render()}}}

  function open(h){sheet.innerHTML='<div class="grab"></div>'+h;sheet.hidden=false;veil.hidden=false;document.body.classList.add('sheeton');draftBind()}
  function close(){sheet.hidden=true;veil.hidden=true;sheet.innerHTML='';DK=null;document.body.classList.remove('sheeton')}
  veil.onclick=close;
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});

  function day(k){
    var d=GZ.parse(k),all=Store.byDate(k),es=all.filter(function(e){return e.kind!=='todo'}),tds=all.filter(function(e){return e.kind==='todo'}),future=d>TODAY,s=GZ.slot(d);
    var h='<div><h1>'+GZ.short(d)+'</h1><p class="sub">'+(s.out?'':'Круг '+GZ.ROM[s.k]+' · день '+s.n+' · ')+GZ.ELN[GZ.elem(s.n||1)]+'</p></div>';
    h+='<div>'+(es.length?es.map(function(e){if(e.kind==='dream'||e.kind==='dreamx')return dreamRow(e);return '<div class="entry"><span class="kind">'+KIND[e.kind]+(e.audio?' · голос':'')+(e.src==='ganzhi'?' · из Ганьчжи':'')+'</span>'+(e.kind==='period'?'<p class="ptitle">'+esc(e.title||'')+'</p>':'')+audioHTML(e,true)+(e.text?'<p>'+esc(e.text)+'</p>':'')+(e.src?'':'<button class="link" data-del="'+e.id+'">Удалить</button>')+'</div>'}).join(''):'<p class="empty">'+(future?'Этот день ещё впереди.':'В этот день записей нет.')+'</p>')+'</div>';
    if(tds.length)h+='<div><span class="label">Дела</span>'+tds.map(function(e){return '<p><button class="btn" data-dtg="'+e.id+'" style="padding:0 8px;margin-right:6px">'+(e.done?'✓':'○')+'</button>'+esc(e.text)+'</p>'}).join('')+'</div>';
    var ti=MOON.tithi(k);
    if(ti){h+='<p class="sub">Лунный день (титхи) '+ti+(MOON.nm(k)?' · новолуние':'')+(MOON.fm(k)?' · полнолуние':'')+(MOON.ek(k)?' · экадаши':'')+'</p>';
      if(MOON.ek(k)&&!future){var fd=es.filter(function(e){return e.kind==='fast'})[0];h+=fd?'<p>Пост отмечен. '+delBtn(fd.id)+'</p>':'<button class="ghost" id="fast">Отметить пост</button>'}}
    if(!future)h+='<button class="primary" id="add">Записать в этот день</button>';
    open(h);
    var a=$('#add');if(a)a.onclick=function(){editor(k)};
    sheet.querySelectorAll('[data-dream]').forEach(function(b){b.onclick=function(){dreamView(b.getAttribute('data-dream'))}});
    hydrate(sheet,function(){render();day(k)});
    sheet.querySelectorAll('[data-dtg]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-dtg'),e=tds.filter(function(x){return x.id===id})[0];Store.update(id,{done:!e.done});render();day(k)}});
    var fb=$('#fast');if(fb)fb.onclick=function(){if(Store.add({kind:'fast',date:k,text:''})){render();day(k)}};
    sheet.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){var f=function(){render();day(k)};undoDel([b.getAttribute('data-del')],f)}});
  }

  function editor(k){
    var d=GZ.parse(k),kind='day';
    open('<div><h1>Запись</h1><p class="sub">'+GZ.short(d)+'</p></div>'+
      '<div class="seg" id="kinds"><button data-k="day" class="on">День</button><button data-k="dream">Сон / образ</button><button disabled title="Фаза 4">Диалог</button></div>'+
      '<textarea id="txt" placeholder="Что сегодня происходит внутри и вокруг?"></textarea>'+
      '<p class="sub">Видишь только ты. Записи хранятся на этом устройстве; «Скачать копию» сохраняет их в файл.</p>'+
      '<button class="primary" id="save">Сохранить</button>'+(VOICE.supported()?'<button class="ghost" id="vrec">Голосом</button>':''));
    var ta=$('#txt');ta.focus();var vr=$('#vrec');if(vr)vr.onclick=function(){voiceSheet(k,kind)};
    sheet.querySelectorAll('#kinds [data-k]').forEach(function(b){b.onclick=function(){kind=b.getAttribute('data-k');if(kind==='dream')return dreamEditor(k,null,ta.value);
      sheet.querySelectorAll('#kinds [data-k]').forEach(function(x){x.classList.toggle('on',x===b)});
      ta.placeholder=kind==='dream'?'Сон или образ, как он пришёл. Без толкования.':'Что сегодня происходит внутри и вокруг?'}});
    $('#save').onclick=function(){var t=ta.value.trim();if(!t){ta.focus();return}
      if(Store.add({kind:kind,date:k,text:t})){close();render()}};
  }

  /* Life tab: year rings, stepping stones (<=12), year notes, forks. */
  var LY=null;
  function ents(kind){return Store.entries().filter(function(e){return e.kind===kind}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0})}
  function yearSVG(y){var C=150,s='<svg viewBox="0 0 300 300" class="yring" style="width:100%;max-width:520px;display:block;margin:0 auto" role="img" aria-label="Год: шесть колец">',tk=GZ.key(TODAY);
    var ents0=Store.entries();
    for(var k=0;k<6;k++){var R=140-k*20,cur=(!TS.out&&TS.year===y&&TS.k===k);
      s+='<circle cx="'+C+'" cy="'+C+'" r="'+R+'" fill="none" stroke="'+(cur?T('ring-ink-2'):T('ring-line'))+'" stroke-width="'+(cur?1.2:.6)+'"/>';
      for(var n=1;n<=60;n++){var d=GZ.dateOf(y,k,n),dk=GZ.key(d),a=(n-1)/60*2*Math.PI-Math.PI/2,x=(C+R*Math.cos(a)).toFixed(1),yy=(C+R*Math.sin(a)).toFixed(1),el=GZ.EL[GZ.elem(n)];
        var has=ents0.some(function(e){return e.date===dk&&e.kind!=='now'}),isT=dk===tk;
        var moon=LAYER!=='g'&&window.MOON&&MOON.fm&&MOON.fm(dk),ek=LAYER==='e'&&window.MOON&&MOON.ek&&MOON.ek(dk);
        s+='<circle data-day="'+dk+'" cx="'+x+'" cy="'+yy+'" r="'+(isT?4.2:2.5)+'" fill="'+(has?el[1]:el[0])+'" stroke="'+(isT?T('ring-ink'):el[1])+'" stroke-width="'+(isT?1.5:.6)+'" style="cursor:pointer"/>';
        if(moon)s+='<circle cx="'+x+'" cy="'+yy+'" r="4.5" fill="none" stroke="'+T('moon-full')+'" stroke-width="1.2" pointer-events="none"/>';
        if(ek)s+='<rect x="'+(x-2.5)+'" y="'+(yy-2.5)+'" width="5" height="5" fill="'+T('ekadashi')+'" transform="rotate(45 '+x+' '+yy+')" pointer-events="none"/>'}}
    return s+'</svg>'}
  function life(){
    if(LY===null)LY=TS.year;var y=LY,h='<div><h1>Жизнь</h1><p class="sub">Год '+y+' · шесть колец по 60 дней</p></div>';
    h+='<div class="seg"><button id="yp">‹ '+(y-1)+'</button><button id="yn">'+(y+1)+' ›</button></div><div class="stack">';
    h+='<div class="row" id="lay">'+[['g','Ганьчжи'],['m','+ Луна'],['e','+ Экадаши']].map(function(x){return '<button class="'+(LAYER===x[0]?'primary':'ghost')+'" data-lay="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+yearSVG(y)+'<p class="legend">I снаружи … VI внутри · '+[0,1,2,3,4,5].map(function(q){return GZ.ROM[q]+' '+GZ.short(GZ.dateOf(y,q,1))+'–'+GZ.short(GZ.dateOf(y,q,60))}).join(' · ')+'<br>● есть запись · крупный узел — сегодня · тап — открыть день</p>';
    for(var k=0;k<6;k++){var a=GZ.dateOf(y,k,1),b=GZ.dateOf(y,k,60),ka=GZ.key(a),kb=GZ.key(b),id=y+'-'+k;
      var n=Store.entries().filter(function(e){return e.date>=ka&&e.date<=kb&&e.kind!=='now'}).length;
      var nw=Store.entries().filter(function(e){return e.kind==='now'&&e.ring===id})[0];
      var cur=(!TS.out&&TS.year===y&&TS.k===k);
      h+='<div class="card'+(cur?'':' soft')+'"><div class="row"><b>Круг '+GZ.ROM[k]+(cur?' · сейчас':'')+'</b><span class="sub">'+GZ.short(a)+' – '+GZ.short(b)+'</span></div><p class="sub">Записей: '+n+'</p>'+(nw?'<p>«'+esc(nw.text.slice(0,140))+(nw.text.length>140?'…':'')+'»</p>':'')+'</div>'}
    h+='</div>';
    var ss=ents('stone'),ys=ents('yearnote').filter(function(e){return e.year===y}),fs=ents('fork');
    var all=ss.concat(fs).sort(function(p,q){return p.date<q.date?-1:p.date>q.date?1:0});
    if(all.length){var t0=GZ.parse(all[0].date).getTime(),t1=GZ.parse(all[all.length-1].date).getTime(),sp=Math.max(t1-t0,1),sn=0,sv='<svg viewBox="0 0 200 200" class="lifemap" role="img" aria-label="Схема жизни"><circle cx="100" cy="100" r="78" fill="none" stroke="'+T('ring-line')+'"/>';
      all.forEach(function(e,i){var an=all.length>1?(GZ.parse(e.date).getTime()-t0)/sp*Math.PI*1.8-Math.PI/2:-Math.PI/2,x=(100+78*Math.cos(an)).toFixed(1),yy=(100+78*Math.sin(an)).toFixed(1);
        if(e.kind==='stone'){sn++;sv+='<g data-go="'+e.id+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+yy+'" r="9" fill="'+T('el2-f')+'" stroke="'+T('el2-s')+'"/><text x="'+x+'" y="'+(+yy+3.5)+'" font-size="10" text-anchor="middle" fill="'+T('el2-s')+'">'+sn+'</text></g>'}
        else sv+='<g data-go="'+e.id+'" style="cursor:pointer"><path d="M'+x+' '+(yy-9)+' l9 9 l-9 9 l-9 -9z" fill="'+T('el4-f')+'" stroke="'+T('ring-ink')+'"/></g>'});
      h+='<div class="card"><span class="label">Схема жизни</span>'+sv+'</svg><p class="sub">Точки — вехи по порядку, ромбы — развилки. Нажми, чтобы открыть запись.</p></div>'}
    h+='<div class="row"><button class="ghost" id="as2"'+(ss.length>=12?' disabled':'')+'>+ Веха</button><button class="ghost" id="af2">+ Развилка</button></div>';
    h+='<div class="row"><h2>Вехи</h2><span class="sub">'+ss.length+' из 12</span></div>';
    h+=ss.length?ss.map(function(e){return '<div class="entry" id="e'+e.id+'"><span class="kind">'+GZ.short(GZ.parse(e.date))+' '+GZ.parse(e.date).getFullYear()+'</span><p class="ptitle">'+esc(e.title)+'</p>'+(e.text?'<p>'+esc(e.text)+'</p>':'')+delBtn(e.id)+'</div>'}).join(''):'<p class="empty">Вехи — события, на которые жизнь опиралась, как камни на переправе.</p>';
    h+='<button class="ghost" id="as"'+(ss.length>=12?' disabled':'')+'>Добавить веху</button>';
    h+='<div class="row"><h2>Заметки к '+y+' году</h2></div>';
    h+=ys.length?ys.map(function(e){return '<div class="entry"><p>'+esc(e.text)+'</p>'+delBtn(e.id)+'</div>'}).join(''):'<p class="empty">О чём был этот год?</p>';
    h+='<button class="ghost" id="ay">Записать о годе</button>';
    h+='<div class="row"><h2>Развилки</h2></div>';
    h+=fs.length?fs.map(function(e){return '<div class="entry" id="e'+e.id+'"><span class="kind">'+GZ.short(GZ.parse(e.date))+' '+GZ.parse(e.date).getFullYear()+'</span><p class="ptitle">'+esc(e.title)+'</p><p>Выбрано: '+esc(e.chosen)+'</p><p>Не выбрано: '+esc(e.other)+'</p>'+delBtn(e.id)+'</div>'}).join(''):'<p class="empty">Места, где путь мог пойти иначе.</p>';
    h+='<button class="ghost" id="af">Добавить развилку</button>';
    screen.innerHTML=h;
    screen.querySelectorAll('[data-day]').forEach(function(c){c.onclick=function(){day(c.getAttribute('data-day'))}});screen.querySelectorAll('[data-lay]').forEach(function(c){c.onclick=function(){setLayer(c.getAttribute('data-lay'));life()}});
    $('#yp').onclick=function(){LY=y-1;life()};$('#yn').onclick=function(){LY=y+1;life()};
    screen.querySelectorAll('[data-go]').forEach(function(g){g.onclick=function(){var el=document.getElementById('e'+g.getAttribute('data-go'));if(el){el.scrollIntoView();el.style.outline='2px solid '+T('el2-s')}}});$('#as2').onclick=stoneEditor;$('#af2').onclick=forkEditor;    $('#as').onclick=stoneEditor;$('#ay').onclick=function(){yearEditor(y)};$('#af').onclick=forkEditor;
    screen.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){undoDel([b.getAttribute('data-del')],life)}});
  }
  function delBtn(id){return '<button class="link" data-del="'+id+'">Удалить</button>'}
  function stoneEditor(){var tk=GZ.key(TODAY);
    open('<div><h1>Веха</h1><p class="sub">Событие, которое держит жизнь. Всего до 12.</p></div><input id="st" class="field" maxlength="80" placeholder="Название"><label class="sub">Когда <input id="sd" class="field" type="date" max="'+tk+'" value="'+tk+'"></label><textarea id="sx" placeholder="Что это было и что оно дало?"></textarea><button class="primary" id="ss">Сохранить</button>');
    $('#st').focus();$('#ss').onclick=function(){var t=$('#st').value.trim();if(!t){$('#st').focus();return}
      if(ents('stone').length>=12)return;if(Store.add({kind:'stone',date:$('#sd').value||tk,title:t,text:$('#sx').value.trim()})){close();life()}}}
  function yearEditor(y){open('<div><h1>Год '+y+'</h1></div><textarea id="yx" placeholder="Каким был этот год?"></textarea><button class="primary" id="ys">Сохранить</button>');
    $('#yx').focus();$('#ys').onclick=function(){var t=$('#yx').value.trim();if(!t){$('#yx').focus();return}
      if(Store.add({kind:'yearnote',date:y+'-12-31',year:y,text:t})){close();life()}}}
  function forkEditor(){var tk=GZ.key(TODAY);
    open('<div><h1>Развилка</h1></div><input id="ft" class="field" maxlength="80" placeholder="О чём был выбор"><label class="sub">Когда <input id="fd" class="field" type="date" max="'+tk+'" value="'+tk+'"></label><textarea id="fc" placeholder="Что выбрано"></textarea><textarea id="fo" placeholder="Что не выбрано"></textarea><button class="primary" id="fs">Сохранить</button>');
    $('#ft').focus();$('#fs').onclick=function(){var t=$('#ft').value.trim(),c=$('#fc').value.trim(),o=$('#fo').value.trim();if(!t||!c||!o){(!t?$('#ft'):!c?$('#fc'):$('#fo')).focus();return}
      if(Store.add({kind:'fork',date:$('#fd').value||tk,title:t,chosen:c,other:o})){close();life()}}}

  /* Dialogs: partners of 6 types, alternating lines. */
  var PT={person:'человек',work:'дело',body:'тело',event:'событие',society:'общество',wisdom:'внутренняя мудрость'};
  var DP=null;
  function partners(){return ents('partner')}
  function pname(id){var p=partners().filter(function(e){return e.id===id})[0];return p?p.title:'—'}
  function dialogs(){
    if(DP)return partnerPage(DP);
    var ps=partners(),h='<div><h1>Диалоги</h1><p class="sub">Разговор со своей жизнью: человек, дело, тело, событие, общество, внутренняя мудрость</p></div>';
    h+=ps.length?'<div class="stack">'+ps.map(function(p){var n=ents('dialog').filter(function(d){return d.partner===p.id}).length;
      return '<div class="card soft" style="cursor:pointer" data-p="'+p.id+'"><div class="row"><b>'+esc(p.title)+'</b><span class="sub">'+PT[p.ptype]+'</span></div><div class="row"><span class="sub">Диалогов: '+n+'</span><span class="sub">Открыть ›</span></div></div>'}).join('')+'</div>':'<p class="empty">Пока нет собеседников. Начни с того, с кем или с чем важно поговорить.</p>';
    h+='<button class="ghost" id="ap">Добавить собеседника</button>';
    screen.innerHTML=h;$('#ap').onclick=partnerEditor;
    screen.querySelectorAll('[data-p]').forEach(function(c){c.onclick=function(){DP=c.getAttribute('data-p');dialogs()}});
  }
  function partnerPage(id){
    var p=partners().filter(function(e){return e.id===id})[0];if(!p){DP=null;return dialogs()}
    var ds=ents('dialog').filter(function(d){return d.partner===id}).reverse();
    var h='<div><h1>'+esc(p.title)+'</h1><p class="sub">'+PT[p.ptype]+' · диалогов: '+ds.length+'</p></div><button class="link" id="pb">‹ Все собеседники</button>';
    h+=ds.length?ds.map(function(d){return '<div class="entry"><span class="kind">'+GZ.short(GZ.parse(d.date))+' '+GZ.parse(d.date).getFullYear()+'</span>'+'<div class="chat">'+d.lines.map(function(l){return '<div class="bub '+(l.who==='me'?'me':'they')+'">'+esc(l.text)+'</div>'}).join('')+'</div>'+delBtn(d.id)+'</div>'}).join(''):'<p class="empty">Диалогов пока нет.</p>';
    h+='<button class="primary" id="nd">Новый диалог</button><button class="link" data-del="'+p.id+'">Удалить собеседника и его диалоги</button>';
    screen.innerHTML=h;$('#pb').onclick=function(){DP=null;dialogs()};$('#nd').onclick=function(){dialogEditor(p)};
    screen.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){var i=b.getAttribute('data-del'),ids=[i];
      if(i===p.id){ids=ents('dialog').filter(function(d){return d.partner===i}).map(function(d){return d.id}).concat([i]);DP=null}
      undoDel(ids,function(){render()})}});
  }
  function partnerEditor(){
    open('<div><h1>Собеседник</h1></div><input id="pn" class="field" maxlength="60" placeholder="Имя или название"><div class="seg" id="pt">'+Object.keys(PT).map(function(k,i){return '<button data-t="'+k+'"'+(i?'':' class="on"')+'>'+PT[k]+'</button>'}).join('')+'</div><button class="primary" id="ps">Сохранить</button>');
    var t='person';$('#pn').focus();
    sheet.querySelectorAll('#pt button').forEach(function(b){b.onclick=function(){t=b.getAttribute('data-t');sheet.querySelectorAll('#pt button').forEach(function(x){x.classList.toggle('on',x===b)})}});
    $('#ps').onclick=function(){var n=$('#pn').value.trim();if(!n){$('#pn').focus();return}
      var e=Store.add({kind:'partner',date:GZ.key(TODAY),title:n,ptype:t});if(e){close();DP=e.id;dialogs()}}}
  function dialogEditor(p){var L=[],who='me',tk=GZ.key(TODAY);
    function draw(){open('<div><h1>Диалог с «'+esc(p.title)+'»</h1></div><div class="chat">'+L.map(function(l){return '<div class="bub '+(l.who==='me'?'me':'they')+'">'+esc(l.text)+'</div>'}).join('')+'</div><div class="seg"><button class="ghost'+(who==='me'?' on':'')+'" id="wm">Я</button><button class="ghost'+(who==='me'?'':' on')+'" id="wt">'+esc(p.title)+'</button></div><textarea id="dl"></textarea><button class="ghost" id="da">Добавить реплику</button><button class="primary" id="dsv">Сохранить диалог</button>');
      $('#dl').focus();
      $('#da').onclick=function(){var t=$('#dl').value.trim();if(!t){$('#dl').focus();return}L.push({who:who,text:t});draw()};
      $('#wm').onclick=function(){who='me';draw()};$('#wt').onclick=function(){who='they';draw()};
      $('#dsv').onclick=function(){var t=$('#dl').value.trim();if(t){L.push({who:who,text:t})}if(!L.length){$('#dl').focus();return}
        if(Store.add({kind:'dialog',date:tk,partner:p.id,lines:L,text:L.map(function(l){return (l.who==='me'?'Я: ':p.title+': ')+l.text}).join(' · ')})){close();dialogs()}}}
    draw()}

  /* Quiet tab: text timer (no animation), meditation counter, 60-day grid. */
  var QT=null,QD=5,QI=null;
  function meds(){return Store.entries().filter(function(e){return e.kind==='med'})}
  function fmt(s){s=Math.max(0,Math.round(s));var m=Math.floor(s/60),r=s%60;return (m<10?'0':'')+m+':'+(r<10?'0':'')+r}
  function medStreak(ms){var set={};ms.forEach(function(m){set[m.date]=1});var d=TODAY,n=0;if(!set[GZ.key(d)])d=GZ.add(d,-1);while(set[GZ.key(d)]){n++;d=GZ.add(d,-1)}return n}
  function qStop(save){if(QI){clearInterval(QI);QI=null}var t=QT;QT=null;
    if(save&&t){var sec=Math.min(t.dur*60,(Date.now()-t.t0)/1000),mn=Math.round(sec/60);if(sec>=30&&mn<1)mn=1;if(mn>=1)Store.add({kind:'med',date:GZ.key(TODAY),minutes:mn,text:'Тишина, '+mn+' мин'})}
    if(tab==='quiet')quiet()}
  function qTick(){if(!QT)return;var left=QT.dur*60-(Date.now()-QT.t0)/1000;if(left<=0)return qStop(true);var el=$('#qt');if(el)el.textContent=fmt(left)}
  function quiet(){
    var ms=meds(),tot=0,days={};ms.forEach(function(m){tot+=m.minutes||0;days[m.date]=(days[m.date]||0)+(m.minutes||0)});
    var h='<div><h1>Тишина</h1><p class="sub">Минута тишины и счётчик</p></div>';
    var tm=days[GZ.key(TODAY)],en=-1,i0;for(i0=0;i0<40;i0++){if(MOON.ek(GZ.key(GZ.add(TODAY,i0)))){en=i0;break}}
    h+='<p class="sub">Сегодня: '+(tm?'сидел '+tm+' мин':'ещё не сидел')+(en>=0?' · экадаши '+(en===0?'сегодня':'через '+en+' '+(en%10===1&&en!==11?'день':(en%10>=2&&en%10<=4&&(en<10||en>20)?'дня':'дней'))):'')+'</p>';
    if(QT){h+='<div class="card"><p class="sub">Идёт тишина · '+QT.dur+' мин</p><p class="big clock" id="qt">'+fmt(QT.dur*60-(Date.now()-QT.t0)/1000)+'</p><button class="primary" id="qe">Закончить</button></div>'}
    else{h+='<div class="card"><p class="sub">Сколько сидим</p><div class="seg" id="qd">'+[1,5,10,20].map(function(m){return '<button data-m="'+m+'"'+(QD===m?' class="on"':'')+'>'+m+'</button>'}).join('')+'<button data-m="0"'+([1,5,10,20].indexOf(QD)<0?' class="on"':'')+'>своя</button></div>'+([1,5,10,20].indexOf(QD)<0?'<input id="qc" class="field" type="number" min="1" max="180" value="'+QD+'" placeholder="минут">':'')+'<button class="primary" id="qs">Начать</button></div>'}
    h+='<div class="card soft"><p>Всего: <b>'+ms.length+'</b> · серия дней: <b>'+medStreak(ms)+'</b> · время: <b>'+tot+'</b> мин</p></div>';
    h+='<p class="sub">Этот круг</p><div class="qgrid">'+WIN.map(function(d){var k=GZ.key(d);return '<span class="qc'+(days[k]?' on':'')+(k===GZ.key(TODAY)?' td':'')+'" title="'+k+(days[k]?' · '+days[k]+' мин':'')+'"></span>'}).join('')+'</div>';
    screen.innerHTML=h;
    if(QT){$('#qe').onclick=function(){qStop(true)};if(!QI)QI=setInterval(qTick,1000);return}
    screen.querySelectorAll('#qd button').forEach(function(b){b.onclick=function(){var m=+b.getAttribute('data-m');QD=m||7;if(!m)QD=7;quiet();if(!m){var c=$('#qc');if(c)c.focus()}}});
    $('#qs').onclick=function(){var c=$('#qc'),m=c?parseInt(c.value,10):QD;if(!(m>=1&&m<=180)){if(c)c.focus();return}QD=m;QT={dur:m,t0:Date.now()};quiet()}}
  /* Todo tab: simple organizer. */
  function todoRow(e){var ov=!e.done&&e.due&&e.due<GZ.key(TODAY);
    return '<div class="entry"><p>'+(e.done?'<s>'+esc(e.text)+'</s>':esc(e.text))+'</p><p class="sub">'+(e.due?(ov?'просрочено · ':'срок ')+GZ.short(GZ.parse(e.due)):'без срока')+(e.partner?' · '+esc(pname(e.partner)):'')+'</p><button class="link" data-tg="'+e.id+'">'+(e.done?'Вернуть':'Сделано')+'</button> <button class="link" data-del="'+e.id+'">Удалить</button></div>'}
  function todos(){var tk=GZ.key(TODAY),all=ents('todo'),open_=all.filter(function(e){return !e.done}),dn=all.filter(function(e){return e.done});
    var g1=open_.filter(function(e){return e.due&&e.due<=tk}),g2=open_.filter(function(e){return e.due&&e.due>tk}),g3=open_.filter(function(e){return !e.due});
    var h='<div><h1>Дела</h1><p class="sub">Простой список. Срок видно на круге засечкой снаружи</p></div>';
    h+=open_.length?'<div class="stack">'+g1.concat(g2,g3).map(todoRow).join('')+'</div>':'<p class="empty">Открытых дел нет.</p>';
    h+='<button class="primary" id="tn">Новое дело</button>';
    if(dn.length)h+='<details><summary class="sub">Сделано ('+dn.length+')</summary><div class="stack">'+dn.map(todoRow).join('')+'</div></details>';
    screen.innerHTML=h;$('#tn').onclick=todoEditor;
    screen.querySelectorAll('[data-tg]').forEach(function(b){b.onclick=function(){var id=b.getAttribute('data-tg'),e=all.filter(function(x){return x.id===id})[0];Store.update(id,{done:!e.done});todos()}});
    screen.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){undoDel([b.getAttribute('data-del')],todos)}})}
  function todoEditor(){var cases=partners().filter(function(p){return p.ptype==='work'});
    open('<div><h1>Новое дело</h1></div><input id="tx" class="field" maxlength="200" placeholder="Что сделать"><label class="sub">Срок (необязательно)</label><input id="td" class="field" type="date">'+(cases.length?'<label class="sub">Собеседник-дело</label><select id="tp" class="field"><option value="">—</option>'+cases.map(function(p){return '<option value="'+p.id+'">'+esc(p.title)+'</option>'}).join('')+'</select>':'')+'<button class="primary" id="ts">Сохранить</button>');
    $('#tx').focus();$('#ts').onclick=function(){var t=$('#tx').value.trim();if(!t){$('#tx').focus();return}
      var due=$('#td').value,p=$('#tp')?$('#tp').value:'',e={kind:'todo',date:due||GZ.key(TODAY),text:t,done:false};if(due)e.due=due;if(p)e.partner=p;
      if(Store.add(e)){close();todos();}}}
  var tab='krug';
  /* Лента: all notes, newest first, readable in full. */

  /* Dreams (Progoff): Dream Log = capture as it came, no interpretation; Dream Enlargement = return to the dream
     later and let the image continue; the series of dreams over time shows recurring images. Twilight imagery = images in half-sleep.
     dream: {kind:'dream',date,mode:'sleep'|'twilight',title,feel,text}; enlargement: {kind:'dreamx',date,parent,text}. */
  var FEELS=['покой','тревога','радость','печаль','страх','удивление','тоска','нежность','злость','лёгкость'];
  var STOP={'и':1,'в':1,'на':1,'с':1,'со':1,'по':1,'под':1,'над':1,'у':1,'из':1,'за':1,'к':1,'о':1,'об':1,'от':1,'до':1,'не':1,'что':1,'как':1,'это':1,'мой':1,'моя':1,'моё':1,'мое':1,'мне':1,'меня':1,'был':1,'была':1,'было':1};
  function dreams(){return Store.entries().filter(function(e){return e.kind==='dream'}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:((a.created||'')<(b.created||'')?-1:1)})}
  function dreamById(id){return Store.entries().filter(function(e){return e.id===id})[0]||null}
  function enl(id){return Store.entries().filter(function(e){return e.kind==='dreamx'&&e.parent===id}).sort(function(a,b){return (a.created||'')<(b.created||'')?-1:1})}
  var END=['ами','ями','ого','его','ому','ему','ыми','ими','ой','ей','ий','ый','ая','яя','ое','ее','ую','юю','ов','ев','ах','ях','ам','ям','ом','ем','ы','и','а','я','о','е','у','ю','ь'];
  function stem(w){for(var i=0;i<END.length;i++){var x=END[i];if(w.length-x.length>=3&&w.slice(-x.length)===x)return w.slice(0,-x.length)}return w}
  function words(t){return (t||'').toLowerCase().replace(/ё/g,'е').split(/[^a-zа-я0-9-]+/).filter(function(w){return w.length>=3&&!STOP[w]})}
  function dreamImages(){var c={},f={};dreams().forEach(function(d){var seen={};words(d.title).forEach(function(w){var s=stem(w);if(seen[s])return;seen[s]=1;c[s]=(c[s]||0)+1;f[s]=f[s]||{};f[s][w]=(f[s][w]||0)+1})});
    return Object.keys(c).map(function(s){var best=Object.keys(f[s]).sort(function(a,b){return f[s][b]-f[s][a]||a.length-b.length})[0];return {w:best,s:s,n:c[s]}}).sort(function(a,b){return b.n-a.n||(a.w<b.w?-1:1)})}
  function dreamNo(id){var ds=dreams();for(var i=0;i<ds.length;i++)if(ds[i].id===id)return i+1;return 0}
  function dreamRow(e,cls,no){
    if(e.kind==='dreamx'){var p=dreamById(e.parent);
      return '<div class="entry dream'+(cls?' '+cls:'')+'" data-dream="'+(p?p.id:'')+'" role="button" tabindex="0">'+(no?'<span class="no">'+no+'</span>':'')+'<span class="kind">развёртка сна'+(p?' № '+dreamNo(p.id)+(p.title?' · «'+esc(p.title)+'»':''):'')+'</span><p>'+esc(e.text||'')+'</p></div>'}
    var n=enl(e.id).length;
    return '<div class="entry dream'+(cls?' '+cls:'')+(e.mode==='twilight'?' tw':'')+'" data-dream="'+e.id+'" role="button" tabindex="0">'+(no?'<span class="no">'+no+'</span>':'')+
      '<span class="kind">'+(e.mode==='twilight'?'образ в полусне':'сон')+' № '+dreamNo(e.id)+(e.feel?' · '+esc(e.feel):'')+'</span>'+
      (e.title?'<p class="ptitle">'+esc(e.title)+'</p>':'')+audioHTML(e)+(e.text?'<p>'+esc(e.text.length>320?e.text.slice(0,320)+'…':e.text)+'</p>':'')+
      '<span class="sub">'+(n?'развёрток: '+n+' · ':'')+'открыть ›</span></div>'}
  function dreamSeriesHead(){var ds=dreams(),im=dreamImages().filter(function(x){return x.n>=2}).slice(0,8);
    var inRing=TS.out?0:ds.filter(function(d){var s=GZ.slot(GZ.parse(d.date));return !s.out&&s.year===TS.year&&s.k===TS.k}).length;
    return '<div class="card soft"><span class="label">Серия снов</span><p class="sub">'+(ds.length?'Всего '+ds.length+(TS.out?'':' · в этом круге '+inRing)+'. Сны читаются подряд, как одна длинная история.':'Прогофф советует не толковать сны, а записывать их подряд и возвращаться к ним.')+'</p>'+
      (im.length?'<p class="sub">Повторяющиеся образы:</p><div class="chips">'+im.map(function(x){return '<button class="btn" data-img="'+esc(x.s)+'"'+(LQ===x.s?' style="outline:2px solid var(--focus)"':'')+'>'+esc(x.w)+' ×'+x.n+'</button>'}).join('')+'</div>':'')+
      '<button class="primary" id="newdream">Записать сон</button></div>'}
  function dreamEditor(k,id,pre){var e=id?dreamById(id):null,mode=e?e.mode||'sleep':'sleep',feel=e?e.feel||'':'';
    open('<div><h1>'+(e?'Сон № '+dreamNo(e.id):'Сон')+'</h1><p class="sub">'+GZ.short(GZ.parse(k))+' · записывай сразу, как пришло, без толкования</p></div>'+
      '<div class="seg" id="dmode"><button data-m="sleep"'+(mode==='sleep'?' class="on"':'')+'>Сон ночью</button><button data-m="twilight"'+(mode==='twilight'?' class="on"':'')+'>Образ в полусне</button></div>'+
      '<label class="sub">Главный образ — одно-два слова<input id="dt" class="field" maxlength="60" placeholder="например: дом у воды" value="'+esc(e?e.title||'':'')+'"></label>'+
      '<textarea id="dtx" placeholder="Что было, по порядку. Обрывок тоже годится.">'+esc(e?e.text||'':(pre||''))+'</textarea>'+
      '<div><span class="sub">Чувство при пробуждении</span><div class="chips" id="dfeel">'+FEELS.map(function(f){return '<button class="btn'+(f===feel?' on':'')+'" data-f="'+f+'">'+f+'</button>'}).join('')+'</div></div>'+
      '<button class="primary" id="dsave">Сохранить сон</button>'+(!e&&VOICE.supported()?'<button class="ghost" id="dvoice">Надиктовать сон</button>':''));
    var dv=$('#dvoice');if(dv)dv.onclick=function(){voiceSheet(k,'dream',{mode:mode,title:$('#dt').value.trim(),feel:feel})};
    var tx=$('#dtx');if(!e)tx.focus();
    sheet.querySelectorAll('#dmode [data-m]').forEach(function(b){b.onclick=function(){mode=b.getAttribute('data-m');sheet.querySelectorAll('#dmode [data-m]').forEach(function(x){x.classList.toggle('on',x===b)})}});
    sheet.querySelectorAll('#dfeel [data-f]').forEach(function(b){b.onclick=function(){feel=feel===b.getAttribute('data-f')?'':b.getAttribute('data-f');sheet.querySelectorAll('#dfeel [data-f]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-f')===feel)})}});
    $('#dsave').onclick=function(){var t=tx.value.trim(),ti=$('#dt').value.trim();if(!t&&!ti){tx.focus();return}
      var p={mode:mode,title:ti,feel:feel,text:t};
      if(e){Store.update(e.id,p);render();dreamView(e.id)}else{var n=Store.add({kind:'dream',date:k,mode:mode,title:ti,feel:feel,text:t});if(n){render();dreamView(n.id)}}}}
  function dreamView(id){var e=dreamById(id);if(!e)return;var xs=enl(id),d=GZ.parse(e.date),s=GZ.slot(d);
    var same=e.title?(function(){var my=words(e.title).map(stem);return dreamImages().filter(function(x){return x.n>=2&&my.indexOf(x.s)>=0})})():[];
    open('<div><h1>'+(e.mode==='twilight'?'Образ':'Сон')+' № '+dreamNo(id)+'</h1><p class="sub">'+GZ.short(d)+(s.out?'':' · круг '+GZ.ROM[s.k]+', день '+s.n)+(e.feel?' · '+esc(e.feel):'')+'</p></div>'+
      (e.title?'<p class="ptitle">'+esc(e.title)+'</p>':'')+audioHTML(e,true)+(e.text?'<p style="white-space:pre-wrap">'+esc(e.text)+'</p>':'')+
      (same.length?'<p class="sub">Этот образ уже приходил: '+same.map(function(x){return '«'+esc(x.w)+'» ×'+x.n}).join(', ')+'.</p>':'')+
      (xs.length?'<div><span class="label">Развёртки</span>'+xs.map(function(x){return '<div class="entry"><span class="kind">'+GZ.short(GZ.parse(x.date))+'</span><p>'+esc(x.text)+'</p><button class="link" data-xdel="'+x.id+'">Удалить</button></div>'}).join('')+'</div>':'')+
      '<div class="card soft"><span class="label">Развернуть сон</span><p class="sub">Вернись в сон. Побудь в нём с закрытыми глазами и дай образу двигаться дальше. Запиши, что произошло, не объясняя.</p><textarea id="xtx" style="min-height:120px" placeholder="Образ продолжается…"></textarea><button class="primary" id="xsave">Добавить развёртку</button></div>'+
      '<div class="row"><button class="ghost" id="dedit">Изменить</button><button class="ghost" id="dday">Открыть день</button><button class="link" id="ddel">Удалить сон</button></div>');
    hydrate(sheet,function(){render();dreamView(id)});
    $('#xsave').onclick=function(){var t=$('#xtx').value.trim();if(!t){$('#xtx').focus();return}if(Store.add({kind:'dreamx',date:GZ.key(TODAY),parent:id,text:t})){render();dreamView(id)}};
    $('#dedit').onclick=function(){dreamEditor(e.date,id)};
    $('#dday').onclick=function(){day(e.date)};
    sheet.querySelectorAll('[data-xdel]').forEach(function(b){b.onclick=function(){undoDel([b.getAttribute('data-xdel')],function(){render();dreamView(id)})}});
    var dd=$('#ddel');dd.onclick=function(){undoDel(xs.map(function(x){return x.id}).concat([id]),function(){close();render()},xs.length?'Сон и развёртки удалены':'Сон удалён')}}

  /* Voice notes: audio lives in IndexedDB (VOICE), the entry keeps audio id, dur, mime; text = transcript (editable). */
  function audioHTML(e,tools){if(!e.audio)return '';
    return '<div class="voice"><audio controls preload="metadata" data-aud="'+e.audio+'"></audio><span class="sub">'+VOICE.fmt(e.dur)+'</span>'+
      (tools?'<button class="link" data-stt="'+e.id+'">'+(e.text?'Расшифровать заново':'Расшифровать в текст')+'</button>':'')+'<span class="sub" data-stts="'+e.id+'"></span></div>'}
  function hydrate(root,after){root.querySelectorAll('audio[data-aud]').forEach(function(au){au.onclick=function(ev){ev.stopPropagation()};
      VOICE.get(au.getAttribute('data-aud')).then(function(b){if(b)au.src=URL.createObjectURL(b);else au.replaceWith(Object.assign(document.createElement('span'),{className:'sub',textContent:'аудио нет на этом устройстве'}))})});
    root.querySelectorAll('.voice').forEach(function(v){v.onclick=function(ev){ev.stopPropagation()}});
    root.querySelectorAll('[data-stt]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();sttFlow(b.getAttribute('data-stt'),root.querySelector('[data-stts="'+b.getAttribute('data-stt')+'"]'),b,after)}})}
  var STT_BUSY=false;
  function sttFlow(eid,st,btn,after){if(STT_BUSY){st.textContent='Уже идёт расшифровка другой записи.';return}
    var e=Store.entries().filter(function(x){return x.id===eid})[0];if(!e)return;
    VOICE.modelCached().then(function(have){
      if(!have&&!btn.dataset.ok){btn.dataset.ok='1';btn.textContent='Скачать модель и расшифровать';st.textContent='Один раз скачается модель распознавания, около '+VOICE.MB+' МБ, лучше по Wi-Fi. Дальше работает без интернета, звук никуда не уходит.';return}
      STT_BUSY=true;btn.disabled=true;st.textContent=have?'Загружаю модель…':'Скачиваю модель… 0%';
      VOICE.loadModel(function(L,T){if(T)st.textContent='Скачиваю модель… '+Math.min(99,Math.round(L/T*100))+'%'}).then(function(){
        st.textContent='Расшифровываю… обычно не дольше самой записи, на телефоне дольше.';return VOICE.transcribe(e.audio)})
      .then(function(txt){STT_BUSY=false;var cur=Store.entries().filter(function(x){return x.id===eid})[0];if(!cur)return;
        Store.update(eid,{text:txt||cur.text||'',stt:'whisper-small'});if(after)after()},
        function(err){STT_BUSY=false;btn.disabled=false;st.textContent='Не получилось: '+err.message+'. Запись сохранена, можно попробовать ещё раз.'})})}
  function voiceSheet(k,kind,extra,auto){var rec=null,tm=null;
    open('<div><h1>Голосом</h1><p class="sub">'+GZ.short(GZ.parse(k))+' · '+(kind==='dream'?'сон, как он пришёл':'запись дня')+'</p></div>'+
      '<div class="vrec"><button class="primary" id="vgo">Начать запись</button><p class="clock-sm" id="vt">0:00</p></div>'+
      '<p class="sub" id="vmsg">Запись хранится только на этом устройстве и попадает в «Скачать копию». Расшифровать в текст можно потом, без интернета.</p>'+
      '<button class="link" id="vno">Отмена</button>');
    function stopT(){if(tm){clearInterval(tm);tm=null}}
    $('#vno').onclick=function(){stopT();if(rec)rec.cancel();close()};
    $('#vgo').onclick=function(){var b=$('#vgo');
      if(!rec){b.disabled=true;VOICE.record().then(function(r){rec=r;b.disabled=false;b.textContent='Остановить и сохранить';b.classList.add('rec');
          tm=setInterval(function(){var t=$('#vt');if(t)t.textContent=VOICE.fmt(Math.round((Date.now()-r.t0)/1000))},500)},
        function(err){b.disabled=false;$('#vmsg').textContent='Нет доступа к микрофону. Разреши его в настройках браузера. ('+(err&&err.name||'')+')'});return}
      stopT();b.disabled=true;rec.stop().then(function(res){var aid=VOICE.nid();return VOICE.put(aid,res.blob).then(function(){VOICE.persist();
          var en={kind:kind,date:k,text:'',audio:aid,dur:res.dur,mime:res.mime};if(kind==='dream'){var x=extra||{};en.mode=x.mode||'sleep';en.title=x.title||'';en.feel=x.feel||''}
          var n=Store.add(en);render();if(n){if(kind==='dream')dreamView(n.id);else day(k)}})})
        .catch(function(err){b.disabled=false;$('#vmsg').textContent='Не удалось сохранить запись: '+err.message})}
    if(auto)$('#vgo').click()}
  var LF='all',LQ='';
  function lenta(){
    var F={all:'Все',day:'Дни',dream:'Сны',voice:'Голос',dialog:'Диалоги',life:'Жизнь'},grp={day:'day',now:'day',dream:'dream',dreamx:'dream',dialog:'dialog',period:'life',stone:'life',yearnote:'life',fork:'life'};
    var pn={};Store.entries().forEach(function(e){if(e.kind==='partner')pn[e.id]=e.title});
    var es=Store.entries().filter(function(e){return grp[e.kind]&&(LF==='all'||(LF==='voice'?!!e.audio:grp[e.kind]===LF))});
    if(LQ){var q=LQ.toLowerCase();es=es.filter(function(e){return ((e.text||'')+' '+(e.title||'')).toLowerCase().indexOf(q)>=0})}
    es.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:((a.created||'')<(b.created||'')?1:-1)});
    var h='<div><h1>Лента</h1><p class="sub">Все записи, от новых к старым</p></div>';
    h+='<input id="lq" class="field crt" type="search" placeholder="&gt; поиск по записям" value="'+esc(LQ)+'">';
    h+='<div class="seg" id="lf">'+Object.keys(F).map(function(k){return '<button data-f="'+k+'"'+(LF===k?' class="on"':'')+'>'+F[k]+'</button>'}).join('')+'</div>';
    if(LF==='dream')h+=dreamSeriesHead();
    if(!es.length)h+='<p class="empty">'+(LF==='voice'&&!LQ?'Голосовых пока нет. Кнопка «Голосом» есть на Круге и в записи.':LF==='dream'&&!LQ?'Снов пока нет. Записывай сразу после пробуждения, даже обрывок.':LQ||LF!=='all'?'Ничего не нашлось.':'Пока нет записей. Начни с круга: «Написать сегодня».')+'</p>';
    var last='',NN=es.length;
    es.forEach(function(e,ix){
      if(e.date!==last){last=e.date;var d=GZ.parse(e.date),s=GZ.slot(d);h+='<button class="link lday" data-day="'+e.date+'">'+GZ.short(d)+(s.out?'':' · круг '+GZ.ROM[s.k]+', день '+s.n)+'</button>'}
      var k=KIND[e.kind]+(e.kind==='dialog'&&pn[e.partner]?' · '+esc(pn[e.partner]):'')+(e.src==='ganzhi'?' · из Ганьчжи':'');
      if(e.kind==='dream'||e.kind==='dreamx'){h+=dreamRow(e,'form','№ '+String(NN-ix).padStart(4,'0'));return}
      h+='<div class="entry form"><span class="no">№ '+String(NN-ix).padStart(4,'0')+'</span><span class="kind">'+k+'</span>'+(e.title&&e.kind!=='dialog'?'<p class="ptitle">'+esc(e.title)+'</p>':'')+audioHTML(e)+(e.text?'<p>'+esc(e.text)+'</p>':'')+'</div>'});
    screen.innerHTML=h;
    var qi=$('#lq');qi.oninput=function(){LQ=qi.value;var p=qi.selectionStart;lenta();var n=$('#lq');n.focus();try{n.setSelectionRange(p,p)}catch(x){}};
    screen.querySelectorAll('#lf button').forEach(function(b){b.onclick=function(){LF=b.getAttribute('data-f');lenta()}});
    screen.querySelectorAll('[data-dream]').forEach(function(b){b.onclick=function(){dreamView(b.getAttribute('data-dream'))}});
    screen.querySelectorAll('[data-img]').forEach(function(b){b.onclick=function(){LQ=LQ===b.getAttribute('data-img')?'':b.getAttribute('data-img');lenta()}});
    hydrate(screen,function(){lenta()});
    var nd=$('#newdream');if(nd)nd.onclick=function(){dreamEditor(GZ.key(TODAY))};
    screen.querySelectorAll('[data-day]').forEach(function(b){b.onclick=function(){day(b.getAttribute('data-day'))}});
  }
  function render(){screen.dataset.tab=tab;screen.classList.remove('wide');if(tab==='lenta')return lenta();if(tab==='krug')return krug();if(tab==='life')return life();if(tab==='dialogs')return dialogs();if(tab==='todo')return todos();return quiet()}
  document.querySelectorAll('#tabs button').forEach(function(b){b.onclick=function(){tab=b.getAttribute('data-tab');DP=null;
    document.querySelectorAll('#tabs button').forEach(function(x){x.classList.toggle('on',x===b)});close();render()}});
  document.addEventListener('visibilitychange',function(){if(!document.hidden){var k=GZ.key(TODAY);refresh();if(GZ.key(TODAY)!==k)render()}});
  /* Keyboard: keep the sheet above it (Android webviews/Telegram overlay the keyboard). */
  (function(){var vv=window.visualViewport,R=document.documentElement;if(!vv)return;
    function fit(){var kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);R.style.setProperty('--kb',kb+'px');R.style.setProperty('--vvh',vv.height+'px');R.classList.toggle('kb',kb>80);
      var f=document.activeElement;if(kb>80&&f&&sheet.contains(f))setTimeout(function(){f.scrollIntoView({block:'nearest'})},30)}
    vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);fit()})();
  sheet.addEventListener('focusin',function(e){setTimeout(function(){e.target.scrollIntoView({block:'nearest'})},300)});
  THEME.on(function(){render()});
  render();
})();
(function(){var L=document.getElementById('leds');if(!L||!window.GZ)return;var t=GZ.slot(new Date());L.innerHTML=t.out?'<span><i class="a"></i>МЕЖДУ КРУГАМИ</span>':'<span><i></i>КРУГ '+GZ.ROM[t.k]+'</span><span><i class="a"></i>ДЕНЬ '+t.n+'</span>'})();
