/* Ganzhi layout: 6 rings x 60 days per layout year; ring I starts Dec 21 (day -11). Same math as the Ganzhi page. */
var GZ=(function(){
  var EL=[['#d3e6dc','#2F6F6B'],['#f6d3c6','#AD4D26'],['#f3dfae','#8a5a12'],['#fffaf0','#5E5750'],['#d6d0c6','#2B2724']];
  var ELN=['Дерево','Огонь','Земля','Металл','Вода'], ROM=['I','II','III','IV','V','VI'];
  var MS=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  function noon(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12)}
  function add(d,n){var x=noon(d);x.setDate(x.getDate()+n);return x}
  function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function parse(k){var p=k.split('-');return new Date(+p[0],p[1]-1,+p[2],12)}
  function doy(d){return Math.round((noon(d)-new Date(d.getFullYear(),0,1,12))/864e5)}
  function slot(date){var d=noon(date),total=doy(d)+12,year=d.getFullYear();
    if(total>360){var t2=Math.round((d-new Date(year+1,0,1,12))/864e5)+12; if(t2>=1){total=t2;year++} else return {out:true,year:year+1}}
    var k=Math.floor((total-1)/60);return {k:k,n:total-k*60,year:year,out:false}}
  function dateOf(year,k,n){return new Date(year,0,1+k*60+(n-1)-11,12)}
  function elem(n){return Math.floor(((n-1)%10)/2)}
  function short(d){return d.getDate()+' '+MS[d.getMonth()]}
  return {EL:EL,ELN:ELN,ROM:ROM,noon:noon,add:add,key:key,parse:parse,slot:slot,dateOf:dateOf,elem:elem,short:short};
})();
