const timerNames=[['通常','Standard'],['砂時計','Hourglass'],['液体砂時計','Liquid'],['オイルタイマー','Oil motion']];let timer=readExtra('myAlarmTimer',{kind:0,total:300000,left:300000,end:0});let timerOpen=false;
function duration(ms,tenths=false){const sec=Math.floor(Math.max(0,ms)/1000);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':')+(tenths?'.'+Math.floor(Math.max(0,ms)%1000/100):'')}
function drawTimerTypes(){
 const root=$('timer-types');root.replaceChildren();
 timerNames.forEach((n,i)=>{
  const btn=action('',()=>{if(timer.end&&i!==timer.kind){appDialog(L('実行中のタイマーを停止してください','Stop the running timer first'),undefined,true);return}timer.kind=i;saveTimer();timerOpen=true;root.hidden=true;$('timer-detail').hidden=false;tickTimer()});
  btn.classList.add('timer-type-card');btn.setAttribute('aria-label',L(...n));
  const preview=el('span',undefined,'timer-type-preview preview-'+i);preview.setAttribute('aria-hidden','true');
  if(i===0){preview.append(el('span',undefined,'preview-dial'));}
  if(i===1){preview.append(el('span',undefined,'preview-sand-top'),el('span',undefined,'preview-sand-bottom'));}
  if(i===2){preview.append(el('span',undefined,'preview-liquid-wave'));}
  if(i===3){for(let k=0;k<4;k++){const drop=el('span',undefined,'preview-oil-drop');drop.style.setProperty('--drop-index',k);preview.append(drop)}}
  const info=el('span',undefined,'timer-type-info');
  info.append(el('span',L(...n),'timer-type-label'),el('span',L(...[['円形の進捗リング','A clean progress ring'],['砂が静かに流れる','Sand flows gently'],['水面がゆっくり下がる','A slowly falling waterline'],['色の粒がふわりと動く','Softly drifting droplets']][i]),'timer-type-description'));
  btn.append(preview,info);root.append(btn);
 });
}
$('timer-back').onclick=()=>{timerOpen=false;$('timer-types').hidden=false;$('timer-detail').hidden=true};
function timerInputs(){return ['hours','minutes','seconds'].reduce((sum,k,i)=>sum+Math.max(0,Math.min(i?59:99,Math.floor(Number($('timer-'+k).value)||0)))*[3600000,60000,1000][i],0)}
function saveTimer(){storeExtra('myAlarmTimer',timer)}
// Restore the duration controls from saved timer state, not their HTML defaults.
if(!Number.isFinite(timer.total)||timer.total<0)timer.total=300000;
if(!Number.isFinite(timer.left)||timer.left<0)timer.left=timer.total;
if(!Number.isFinite(timer.end)||timer.end<0)timer.end=0;
if(!Number.isInteger(timer.kind)||timer.kind<0||timer.kind>=timerNames.length)timer.kind=0;
{const sec=Math.floor(timer.total/1000);$('timer-hours').value=Math.floor(sec/3600);$('timer-minutes').value=Math.floor(sec/60)%60;$('timer-seconds').value=sec%60;}

$('timer-start').onclick=()=>{try{getAudioContext().resume().catch(()=>{})}catch{}if(timer.end){timer.left=Math.max(0,timer.end-Date.now());timer.end=0}else{if(timer.left===timer.total){timer.total=timerInputs();timer.left=timer.total}else if(!timer.left){timer.total=timerInputs();timer.left=timer.total}if(timer.left)timer.end=Date.now()+timer.left}saveTimer();tickTimer()};
$('timer-reset').onclick=()=>{timer.end=0;timer.total=timer.left=timerInputs();saveTimer();tickTimer()};
['hours','minutes','seconds'].forEach(k=>$('timer-'+k).onchange=()=>{if(!timer.end){timer.total=timer.left=timerInputs();saveTimer();tickTimer()}});
function tickTimer(){let left=timer.end?Math.max(0,timer.end-Date.now()):timer.left;if(timer.end&&!left){timer.end=0;timer.left=0;saveTimer();playTimerChime();appDialog(L('タイマー終了','Timer finished'),undefined,true)}const ratio=timer.total?left/timer.total:0;$('timer-value').textContent=duration(Math.ceil(left/1000)*1000);$('timer-progress').value=Math.max(0,Math.min(1,ratio));$('timer-progress').setAttribute('aria-label',L('残り時間の割合','Time remaining')); $('timer-title').textContent=L(...timerNames[timer.kind]);$('timer-start').textContent=timer.end?L('一時停止','Pause'):(left>0&&left<timer.total?L('再開','Resume'):L('開始','Start'));$('timer-reset').textContent=L('リセット','Reset');const artClass=timer.kind?'timer-art art-'+timer.kind:'';if(!$('timer-art').className.startsWith(artClass)||$('timer-art').dataset.kind!==String(timer.kind)){$('timer-art').className=artClass;$('timer-art').dataset.kind=String(timer.kind)}$('timer-art').style.setProperty('--remaining',ratio*100+'%');['hours','minutes','seconds'].forEach(k=>$('timer-'+k).disabled=!!timer.end)}
