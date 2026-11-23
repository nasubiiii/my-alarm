// Settings categories (native disclosure, retain original controls and listeners)
document.querySelectorAll('#settings-screen .settings-group').forEach(g=>{const h=g.querySelector('h3');const d=el('details');d.className='settings-disclosure';const sum=el('summary');h.replaceWith(sum);sum.append(h);while(g.firstChild!==sum)d.append(g.firstChild);while(sum.nextSibling)d.append(sum.nextSibling);d.prepend(sum);g.append(d)});
applyLanguage();drawLaps();tickTimer();tickSW();colorDates();setInterval(()=>{tickCities();colorDates();tickTimer();tickSW()},100);

function appDialog(message,initial,notice=false){
 return new Promise(resolve=>{
 const d=document.createElement('dialog');d.className='app-dialog';
 const title=el('h3',message);d.append(title);let input;
 if(initial!==undefined){input=document.createElement('input');input.value=initial;input.setAttribute('aria-label',L('グループ名','Group name'));d.append(input)}
 const controls=el('div',undefined,'dialog-actions');let result=null;
 if(!notice)controls.append(action(L('キャンセル','Cancel'),()=>d.close()));
 const ok=action(input?L('保存','Save'):notice?'OK':L('削除する','Delete'),()=>{if(input&&!input.value.trim()){input.focus();return}result=input?input.value:true;d.close()});ok.className='dialog-primary';controls.append(ok);d.append(controls);document.body.append(d);
 d.addEventListener('close',()=>{d.remove();resolve(result)},{once:true});if(input)input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ok.click()}};d.showModal();if(input){input.focus();input.select()}
 });
}
function bindCityDrag(handle,row){
 handle.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;e.preventDefault();
 const list=row.parentElement,original=Array.from(list.children),start=e.clientY,id=e.pointerId;let y=start,active=false,raf=0;
 // Capture on the stationary list, not the row that is moved.
 try{list.setPointerCapture(id)}catch{}
 function place(){if(!active)return;const others=Array.from(list.children).filter(r=>r!==row);const target=others.find(r=>y<r.getBoundingClientRect().top+r.getBoundingClientRect().height/2)||null;if(target!==row.nextElementSibling)list.insertBefore(row,target)}
 function frame(){if(!active)return;const bottom=$('tab-nav').getBoundingClientRect().top;const delta=y<70?-8:y>bottom-45?8:0;if(delta){window.scrollBy(0,delta);place()}raf=requestAnimationFrame(frame)}
 function move(ev){if(ev.pointerId!==id)return;if(ev.cancelable)ev.preventDefault();y=ev.clientY;if(!active&&Math.abs(y-start)>4){active=true;row.classList.add('city-dragging');raf=requestAnimationFrame(frame)}place()}
 function finish(ev){if(ev.pointerId!==id)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);list.removeEventListener('lostpointercapture',finish);cancelAnimationFrame(raf);row.classList.remove('city-dragging');if(list.hasPointerCapture(id))list.releasePointerCapture(id);if(!active)return;if(ev.type==='pointerup'){cities=Array.from(list.children,r=>r.dataset.zone);storeExtra('myAlarmCities',cities);drawCities()}else original.forEach(r=>list.append(r))}
 window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',finish,true);window.addEventListener('pointercancel',finish,true);list.addEventListener('lostpointercapture',finish);
 });
}
function playTimerChime(){try{const c=getAudioContext();c.resume().then(()=>{const now=c.currentTime;[523.25,659.25,783.99].forEach((f,i)=>{const t=now+i*.25;const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+1.15)})}).catch(()=>{})}catch{}}

// Update 02.5: edit group name and membership together.
function editGroupMembers(group){
 const d=el('dialog',undefined,'app-dialog group-editor');
 const heading=el('h3',L('グループの編集','Edit group'));d.append(heading);
 const label=el('label',L('グループ名','Group name'));label.htmlFor='group-edit-name';
 const input=el('input');input.id='group-edit-name';input.value=group.name;d.append(label,input);
 const selected=new Set(alarms.filter(a=>a.groupId===group.id).map(a=>a.id));
 const header=el('div',undefined,'group-edit-header');const count=el('small');header.append(el('strong',L('所属アラーム','Group alarms')),count);d.append(header);
 const groups=readGroups();const list=el('div',undefined,'group-member-list');const checks=[];
 const note=el('small',L('他のグループのアラームを選ぶと、このグループに移動します。','Selecting an alarm in another group moves it to this group.'),'group-edit-note');
 function refresh(){count.textContent=L(`${selected.size}件選択中`,`${selected.size} selected`);checks.forEach(([a,c])=>c.checked=selected.has(a.id))}
 const tools=el('div',undefined,'group-edit-tools');tools.append(action(L('すべて選択','Select all'),()=>{alarms.forEach(a=>selected.add(a.id));refresh()}),action(L('選択解除','Clear selection'),()=>{selected.clear();refresh()}));d.append(tools);
 [...alarms].sort((a,b)=>a.time.localeCompare(b.time)).forEach(a=>{
 const row=el('label',undefined,'group-member-row');const c=el('input');c.type='checkbox';checks.push([a,c]);c.onchange=()=>{if(c.checked)selected.add(a.id);else selected.delete(a.id);refresh()};
 const info=el('span',undefined,'group-member-info');info.append(el('strong',a.time),el('span',a.name||t('defaultAlarm')));const other=groups.find(g=>g.id===a.groupId&&g.id!==group.id);if(other)info.append(el('small',L('所属: ','Group: ')+other.name));row.append(c,info);list.append(row);
 });if(!alarms.length)list.append(el('p',L('登録済みのアラームがありません','No alarms registered')));d.append(list,note);refresh();
 const controls=el('div',undefined,'dialog-actions');controls.append(action(L('キャンセル','Cancel'),()=>d.close()));
 const save=action(L('保存','Save'),()=>{const name=input.value.trim();if(!name){input.focus();return}storeExtra('myAlarmGroups',readGroups().map(g=>g.id===group.id?{...g,name}:g));alarms.forEach(a=>{if(selected.has(a.id))a.groupId=group.id;else if(a.groupId===group.id)a.groupId=''});saveAlarms();renderGroups();renderAlarms();updateClock();d.close()});save.className='dialog-primary';controls.append(save);d.append(controls);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();input.focus();
}

// Update 03.0: visual backgrounds, world city scenes, oil timer and first-run guide.
const v3Settings=readExtra('myAlarmV3Settings',{scenery:true,cityScenery:true});
const scenicToggle=$('scenic-background'), citySceneryToggle=$('city-scenery');
scenicToggle.checked=v3Settings.scenery!==false;citySceneryToggle.checked=v3Settings.cityScenery!==false;
function setV3Setting(key,value){v3Settings[key]=value;storeExtra('myAlarmV3Settings',v3Settings);updateScenery();lastCityTick='';tickCities()}
scenicToggle.onchange=()=>setV3Setting('scenery',scenicToggle.checked);
citySceneryToggle.onchange=()=>setV3Setting('cityScenery',citySceneryToggle.checked);
function periodAt(z,date){const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',hourCycle:'h23'}).format(date));return h<5||h>=20?'night':h<10?'morning':h<17?'day':'evening'}
let lastScene='';function updateScenery(){const scene=v3Settings.scenery===false?'none':periodAt(localZone,new Date());if(scene===lastScene)return;lastScene=scene;document.documentElement.dataset.scenery=scene;document.documentElement.style.setProperty('--scenic-image',scene==='none'?'none':`url("${new URL(`scenes/${scene}.svg`, document.baseURI).href}")`)}
const priorTheme=applyTheme;applyTheme=function(){priorTheme();updateScenery()};
const priorCities=tickCities;tickCities=function(){priorCities();const offset=Number($('travel').value);const d=new Date(Date.now()+offset*60000);document.querySelectorAll('.city-row').forEach(r=>{const z=r.dataset.zone;const key=cityKey(z);const landmark=['Tokyo','London','Paris','New_York','Los_Angeles','Seoul','Sydney','Dubai','Singapore','Shanghai','Kolkata'].includes(key)?key:null;const period=periodAt(z,d);const enabled=v3Settings.cityScenery!==false;r.classList.toggle('has-city-scene',enabled);r.dataset.period=period;r.style.setProperty('--city-landmark',enabled&&landmark?`url("${new URL(`scenes/city-${landmark}.svg`, document.baseURI).href}")`:'none')})};
const priorTimer=tickTimer;tickTimer=function(){priorTimer();const art=$('timer-art');if(timer.kind===3){if(!art.querySelector('.oil-drop')){art.replaceChildren();for(let i=0;i<8;i++){const b=el('i',undefined,'oil-drop');b.style.left=(7+i*11)+'%';b.style.width=(12+i)+'px';b.style.height=(16+i)+'px';b.style.animationDuration=(3.8+i*.55)+'s';b.style.animationDelay=(-i*.63)+'s';art.append(b)}}art.classList.toggle('oil-paused',!timer.end); }else if(art.children.length){art.replaceChildren()}};
// Update 03.1: reusable timer presets, persisted separately from active timer.
