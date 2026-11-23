let timerPresets=readExtra('myAlarmTimerPresets',[]);
if(!Array.isArray(timerPresets))timerPresets=[];
let editingPresetId=null;
function persistPresets(){storeExtra('myAlarmTimerPresets',timerPresets)}
function setTimerInputs(ms){const sec=Math.floor(ms/1000);$('timer-hours').value=Math.floor(sec/3600);$('timer-minutes').value=Math.floor(sec/60)%60;$('timer-seconds').value=sec%60}
function presetDuration(){return ['hours','minutes','seconds'].reduce((sum,k,i)=>sum+Math.max(0,Math.min(i?59:99,Math.floor(Number($('preset-'+k).value)||0)))*[3600000,60000,1000][i],0)}
function showPresetEditor(preset=null){
  editingPresetId=preset?.id??null;
  $('preset-name').value=preset?.name||'';
  const ms=preset?.total??(timerInputs()||180000);
  const seconds=Math.floor(ms/1000);
  $('preset-hours').value=Math.floor(seconds/3600);
  $('preset-minutes').value=Math.floor(seconds/60)%60;
  $('preset-seconds').value=seconds%60;
  $('preset-kind').replaceChildren(...timerNames.map((names,i)=>{const option=document.createElement('option');option.value=i;option.textContent=L(...names);return option}));
  $('preset-kind').value=timer.kind;
  $('preset-dialog-heading').textContent=preset?L('タイマーを編集','Edit timer'):L('タイマーを保存','Save timer');
  $('preset-name').placeholder=L('3分','3 minutes');$('preset-name-label').textContent=L('名前','Name');$('preset-duration-label').textContent=L('時間','Duration');$('preset-kind-label').textContent=L('表示タイプ','Visual type');
  $('preset-cancel').textContent=L('キャンセル','Cancel');$('preset-save').textContent=L('保存','Save');
  $('preset-dialog').showModal();
}
$('preset-add').onclick=()=>showPresetEditor();
$('timer-save-preset').onclick=()=>showPresetEditor();
$('preset-cancel').onclick=()=>$('preset-dialog').close();
$('preset-save').onclick=()=>{
  const name=$('preset-name').value.trim(),total=presetDuration(),kind=timer.kind;
  if(!name||!total){$('preset-name').focus();appDialog(L('名前と1秒以上の時間を入力してください','Enter a name and duration of at least 1 second'),undefined,true);return}
  if(editingPresetId!==null){const old=timerPresets.find(x=>x.id===editingPresetId);if(old)Object.assign(old,{name,total,kind})}
  else timerPresets.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name,total,kind});
  persistPresets();$('preset-dialog').close();renderPresets();
};
function renderPresets(){
  $('preset-heading').textContent=L('よく使うタイマー','Favorite timers');$('preset-add').textContent=L('＋ 新規登録','＋ Add');$('timer-save-preset').textContent=L('☆ プリセット保存','☆ Save preset');$('preset-toggle').title=L('保存済みタイマー','Saved timers');$('preset-toggle').setAttribute('aria-label',$('preset-toggle').title);
  const root=$('preset-list');root.replaceChildren();
  if(!timerPresets.length){root.append(el('p',L('よく使う時間を登録できます。','Save timers you use often.'),'preset-empty'));return}
  timerPresets.forEach((p,i)=>{
    const card=el('div',undefined,'preset-card'),main=action('',()=>{
      if(timer.end){appDialog(L('実行中のタイマーを停止してから選択してください','Stop the running timer first'),undefined,true);return}
      timer.total=timer.left=p.total;timer.end=0;setTimerInputs(p.total);saveTimer();setPresetMenu(false);timerOpen=true;$('timer-types').hidden=true;$('timer-detail').hidden=false;
      tickTimer();
    });
    main.className='preset-launch';main.append(el('strong',p.name),el('span',duration(p.total)));
    const controls=el('div',undefined,'preset-controls');
    const edit=action('✎',()=>showPresetEditor(p));edit.title=L('編集','Edit');edit.setAttribute('aria-label',edit.title);
    const del=action('×',async()=>{if(await appDialog(L('このプリセットを削除しますか？','Delete this preset?'))){timerPresets=timerPresets.filter(x=>x.id!==p.id);persistPresets();renderPresets()}});del.title=L('削除','Delete');del.setAttribute('aria-label',del.title);
    const up=action('↑',()=>{if(i>0){[timerPresets[i-1],timerPresets[i]]=[timerPresets[i],timerPresets[i-1]];persistPresets();renderPresets()}});up.title=L('上へ','Move up');up.setAttribute('aria-label',up.title);up.disabled=i===0;
    const down=action('↓',()=>{if(i<timerPresets.length-1){[timerPresets[i+1],timerPresets[i]]=[timerPresets[i],timerPresets[i+1]];persistPresets();renderPresets()}});down.title=L('下へ','Move down');down.setAttribute('aria-label',down.title);down.disabled=i===timerPresets.length-1;
    controls.append(up,down,edit,del);card.append(main,controls);root.append(card)
  })
}
// Update 03.3: unobtrusive bookmark menu, shared across timer visuals.
function setPresetMenu(open){
  $('timer-presets').hidden=!open;
  $('preset-toggle').setAttribute('aria-expanded',String(open));
}
$('preset-toggle').onclick=()=>{renderPresets();setPresetMenu($('timer-presets').hidden)};
document.addEventListener('pointerdown',event=>{
  if(!$('timer-presets').hidden&&!$('timer-presets').contains(event.target)&&!$('preset-toggle').contains(event.target))setPresetMenu(false);
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('timer-presets').hidden)setPresetMenu(false)});
const originalTimerBack=$('timer-back').onclick;
$('timer-back').onclick=()=>{setPresetMenu(false);originalTimerBack()};
const originalTimerDraw=drawTimerTypes;
drawTimerTypes=function(){originalTimerDraw();renderPresets();setPresetMenu(false)};
renderPresets();setPresetMenu(false);

const welcomeSteps=[
()=>[L('My Alarmへようこそ','Welcome to My Alarm'),L('アラーム・世界時計・タイマーを、ひとつのアプリで。','Alarms, world clocks and timers in one place.')],
()=>[L('アラームをまとめて管理','Organize your alarms'),L('グループや曜日ごとの予定、一括ON/OFFを使えます。','Use groups, weekly schedules and bulk toggles.')],
()=>[L('世界の時間を眺める','Explore world time'),L('都市を追加し、時差や時間帯別の風景を楽しめます。','Add cities and compare time zones with changing scenery.')],
()=>[L('好きなタイマーを選ぶ','Choose your timer'),L('砂時計・液体・オイルなど、見た目を選べます。','Choose hourglass, liquid, oil motion and more.')]
];
let welcomeStep=0;
function paintWelcome(){const [title,desc]=welcomeSteps[welcomeStep]();$('welcome-heading').textContent=title;$('welcome-description').textContent=desc;$('welcome-dots').textContent=welcomeSteps.map((_,i)=>i===welcomeStep?'●':'○').join(' ');$('welcome-skip').textContent=L('スキップ','Skip');$('welcome-next').textContent=welcomeStep===welcomeSteps.length-1?L('使い始める','Get started'):L('次へ','Next')}
function closeWelcome(){try{$('welcome-dialog').close()}catch{}storeExtra('myAlarmWelcomeSeen',true)}
$('welcome-skip').onclick=closeWelcome;$('welcome-next').onclick=()=>{if(++welcomeStep>=welcomeSteps.length)closeWelcome();else paintWelcome()};
function openWelcome(){welcomeStep=0;paintWelcome();if(!$('welcome-dialog').open)$('welcome-dialog').showModal()}
const helpButton=action(L('使い方ガイドを再表示','Replay introduction'),openWelcome);helpButton.id='welcome-replay';helpButton.className='welcome-replay';$('settings-screen').append(helpButton);
const priorLanguageV3=applyLanguage;applyLanguage=function(){priorLanguageV3();document.querySelector('[data-feature="scenic"]').textContent=L('時間帯に合わせて風景背景を切り替える','Change scenic background by time of day');document.querySelector('[data-feature="city"]').textContent=L('世界時計の都市別背景を表示','Show city scenes in world clock');helpButton.textContent=L('使い方ガイドを再表示','Replay introduction');if($('welcome-dialog').open)paintWelcome()};
updateScenery();lastCityTick='';tickCities();drawTimerTypes();
if(!readExtra('myAlarmWelcomeSeen',false))setTimeout(openWelcome,500);
setInterval(()=>{updateScenery();if(v3Settings.cityScenery!==false&&document.querySelector('.city-row'))tickCities()},60000);

// Update 03.8: keep late-added appearance labels synchronized with language.
const applyLanguage038 = applyLanguage;
applyLanguage = function () {
  applyLanguage038();
  const scenicLabel = document.querySelector('[data-feature="scenic"]');
  const cityLabel = document.querySelector('[data-feature="city"]');
  if (scenicLabel) scenicLabel.textContent = L('時間帯に合わせて風景背景を切り替える', 'Change scenery by time of day');
  if (cityLabel) cityLabel.textContent = L('世界時計の都市別背景を表示', 'Show city backgrounds in world clock');
};
applyLanguage();


