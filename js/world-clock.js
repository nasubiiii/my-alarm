/* =========================
   STEP 5：バックアップ・復元
========================= */

// バックアップを保存
$("export-backup-btn").addEventListener("click", () => {
  const backup = {
    app: "My Alarm",
    version: 1,
    exportedAt: new Date().toISOString(),
    alarms: alarms,
    groups: readGroups(),
    settings: appSettings,
    autoScroll: $("auto-scroll").checked
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    "my-alarm-backup-" +
    new Date().toISOString().slice(0, 10) +
    ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

// バックアップファイルを選択
$("import-backup-btn").addEventListener("click", () => {
  $("backup-file-input").click();
});

// バックアップから復元
$("backup-file-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    // バックアップファイルの基本チェック
    if (
      backup.app !== "My Alarm" ||
      backup.version !== 1 ||
      !Array.isArray(backup.alarms) ||
      !backup.settings ||
      typeof backup.settings !== "object" ||
      Array.isArray(backup.settings)
    ) {
      throw new Error("Invalid backup");
    }

    // 各アラームのデータを確認
    const validAlarms = backup.alarms.every(alarm =>
      alarm &&
      typeof alarm.id === "string" &&
      typeof alarm.time === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(alarm.time) &&
      typeof alarm.enabled === "boolean" &&
      Array.isArray(alarm.days) &&
      alarm.days.every(day =>
        Number.isInteger(day) && day >= 0 && day <= 6
      )
    );

    if (!validAlarms) {
      throw new Error("Invalid alarm data");
    }

    const confirmed = confirm(
      "現在のアラームと表示設定を、バックアップの内容で上書きします。\n" +
      "現在のデータは置き換えられます。続行しますか？"
    );

    if (!confirmed) return;

    // 復元
    localStorage.setItem("myAlarmGroups", JSON.stringify(Array.isArray(backup.groups) ? backup.groups.filter(g => g && typeof g.id === "string" && typeof g.name === "string") : []));
    alarms = backup.alarms.map(alarm => ({
      ...alarm,
      name: alarm.name || "",
      sound: alarm.sound || "bell"
    }));

    appSettings = {
      ...DEFAULT_SETTINGS,
      ...backup.settings
    };

    saveAlarms();
    saveAppSettings();

    if (typeof backup.autoScroll === "boolean") {
      $("auto-scroll").checked = backup.autoScroll;
      localStorage.setItem(
        "autoScroll",
        String(backup.autoScroll)
      );
    }

    applySettings();
    showScreen("home");

    alert("バックアップを復元しました。");
  } catch (error) {
    console.error(error);
    alert("バックアップファイルを読み込めませんでした。");
  } finally {
    // 同じファイルを再選択できるようにする
    event.target.value = "";
  }
});
function readGroups(){try{return JSON.parse(localStorage.getItem("myAlarmGroups")||"[]")}catch{return []}}
function fillGroups(value=""){const s=$("edit-group");s.replaceChildren(new Option(appSettings.language==="ja"?"なし":"None",""));readGroups().forEach(g=>s.add(new Option(g.name,g.id)));s.value=value||"";}
function renderGroups(){const list=$("group-list");list.replaceChildren();readGroups().forEach(g=>{const row=document.createElement("div");row.className="alarm-item";const name=document.createElement("span");name.textContent=g.name;row.append(name);for(const [label,action] of [["ON",()=>setGroup(g.id,true)],["OFF",()=>setGroup(g.id,false)],[t("delete"),async()=>{if(!await appDialog(g.name+" — "+t("delete")))return;localStorage.setItem("myAlarmGroups",JSON.stringify(readGroups().filter(x=>x.id!==g.id)));alarms.forEach(a=>{if(a.groupId===g.id)a.groupId=""});saveAlarms();renderGroups();renderAlarms()}]]){const b=document.createElement("button");b.textContent=label;b.onclick=action;row.append(b)}list.append(row)})}
function setGroup(id,enabled){alarms.forEach(a=>{if(a.groupId===id)a.enabled=enabled});if(!enabled&&snoozedAlarm?.groupId===id){clearTimeout(snoozeTimer);snoozedAlarm=null;snoozeTimer=null}saveAlarms();renderAlarms();updateClock()}
function addAlarmGroup(){
 const field=$("group-name"),name=field.value.trim();
 if(!name){field.focus();return}
 // crypto.randomUUID may be unavailable when index.html is opened via file://.
 const id=(globalThis.crypto&&typeof crypto.randomUUID==='function')?crypto.randomUUID():`group-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
 const groups=readGroups();groups.push({id,name});
 try{localStorage.setItem('myAlarmGroups',JSON.stringify(groups))}catch(error){console.error('Group save failed',error);return}
 field.value='';$('group-picker').close();renderGroups();fillGroups();
}
$('group-add').onclick=()=>{$('group-name').value='';$('group-picker').showModal();$('group-name').focus()};
$('group-picker-close').onclick=()=>$('group-picker').close();
$('group-picker-cancel').onclick=()=>$('group-picker').close();
$('group-create-form').addEventListener('submit',event=>{event.preventDefault();addAlarmGroup()});
function renderForecast(){const list=$("forecast-list");list.replaceChildren();const now=new Date();for(let i=0;i<7;i++){const day=new Date(now);day.setDate(day.getDate()+i);day.setHours(0,0,0,0);const card=document.createElement("article");card.className="glass-panel";const heading=document.createElement("h3");heading.className="day-"+day.getDay();heading.textContent=day.toLocaleDateString(appSettings.language,{weekday:"short",month:"numeric",day:"numeric"})+(i===0?" · "+L("今日","Today"):"");card.append(heading);const rows=alarms.filter(a=>{const next=getNextAlarmDate(a,now);if(!next)return false;const candidate=new Date(day);candidate.setHours(...a.time.split(":").map(Number),0,0);return candidate>=next&&(a.days.length?a.days.includes(day.getDay()):candidate.getTime()===next.getTime())}).sort((a,b)=>a.time.localeCompare(b.time));for(const a of rows){const r=document.createElement("button");r.className="forecast-row";r.textContent=a.time+"  "+(a.name||t("defaultAlarm"))+"  ›";r.onclick=()=>openEditor(a.id);card.append(r)}if(!rows.length){const r=document.createElement("p");r.textContent=L("アラームなし","No alarms");card.append(r)}list.append(card)}}
$("forecast-btn").onclick=()=>{renderForecast();showScreen("forecast")};$("groups-btn").onclick=()=>{renderGroups();showScreen("groups")};document.querySelectorAll(".return-home").forEach(b=>b.onclick=()=>showScreen(subpageReturnScreen));document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>showScreen(b.dataset.tab,"tab"));$("world-full").onclick=()=>$("clock-mode-btn").click();
let restoredTab = "home";
try { const saved = sessionStorage.getItem("myAlarmActiveTab"); if (["home","world","timer","stopwatch","settings"].includes(saved)) restoredTab = saved; } catch {}
showScreen(restoredTab);
$("settings-return").addEventListener("click",()=>showScreen("home"));
function localizeSubpageReturns(){document.querySelectorAll(".return-home").forEach(b=>{b.setAttribute("aria-label",t("back"));b.title=t("back")})}
const originalSubpageLanguage=applyLanguage;applyLanguage=function(){originalSubpageLanguage();localizeSubpageReturns()};
localizeSubpageReturns();

/* Phase 2 additions */
function L(ja,en){return appSettings.language==='ja'?ja:en}
function readExtra(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function storeExtra(key,value){localStorage.setItem(key,JSON.stringify(value))}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function action(text,fn){const b=el('button',text);b.type='button';b.onclick=fn;return b}
const localZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const zones=[...new Set([...(Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):[]),'Asia/Tokyo','America/New_York','Europe/London','Europe/Paris','Asia/Seoul','Asia/Kolkata','Australia/Sydney','America/Los_Angeles',localZone])];
const locale=()=>appSettings.language==='ja'?'ja-JP':'en-US';
const regionNames={Tokyo:['東京','Japan','日本'],London:['ロンドン','United Kingdom','イギリス'],New_York:['ニューヨーク','United States','アメリカ'],Los_Angeles:['ロサンゼルス','United States','アメリカ'],Seoul:['ソウル','South Korea','韓国'],Sydney:['シドニー','Australia','オーストラリア'],Paris:['パリ','France','フランス'],Kolkata:['コルカタ','India','インド'],Calcutta:['コルカタ','India','インド'],Singapore:['シンガポール','Singapore','シンガポール'],Shanghai:['上海','China','中国'],Dubai:['ドバイ','United Arab Emirates','アラブ首長国連邦'],Abidjan:['アビジャン','Ivory Coast','コートジボワール'],Gaborone:['ハボローネ','Botswana','ボツワナ'],Accra:['アクラ','Ghana','ガーナ'],Addis_Ababa:['アディスアベバ','Ethiopia','エチオピア']};
const cityKey=z=>z.split('/').pop();
function cityName(z){const k=cityKey(z);return (appSettings.language==='ja'&&regionNames[k]?.[0])||k.replaceAll('_',' ')}
function countryName(z){const r=regionNames[cityKey(z)];return r?L(r[2],r[1]):''}
function zonePart(z,date,kind,lang='en-US'){return new Intl.DateTimeFormat(lang,{timeZone:z,timeZoneName:kind}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||''}
function zoneOffset(z,date){const v=zonePart(z,date,'longOffset');const m=v.match(/([+-])(\d{2}):(\d{2})/);return m?(m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3])):0}
function offsetText(n){return (n<0?'−':'+')+String(Math.floor(Math.abs(n)/60)).padStart(2,'0')+':'+String(Math.abs(n)%60).padStart(2,'0')}
function abbreviation(z,date){const k=cityKey(z),o=zoneOffset(z,date);const known={Tokyo:'JST',Seoul:'KST',London:o===0?'GMT':'BST',Kolkata:'IST',Calcutta:'IST',Sydney:o===660?'AEDT':'AEST',Paris:o===120?'CEST':'CET',Singapore:'SGT',Shanghai:'CST',Dubai:'GST'};return known[k]||zonePart(z,date,'short').replace(/^GMT(?=[+-])/,'UTC')}
let cities=readExtra('myAlarmCities',[]);
const preferredZones=['Asia/Tokyo','Europe/London','America/New_York','Europe/Paris','Asia/Seoul','Asia/Singapore','Australia/Sydney'];
function refreshCityOptions(){
 const date=new Date(),q=$('city-search').value.trim().toLowerCase(),list=$('city-options');
 $('city-add').textContent=L('＋ 追加','＋ Add');$('city-add').title=$('city-add').ariaLabel=L('都市を追加','Add city');$('city-picker-title').textContent=L('都市を追加','Add city');$('city-picker-close').setAttribute('aria-label',L('閉じる','Close'));$('city-search').setAttribute('aria-label',L('都市を検索','Search cities'));
 if(!$('city-picker').open)return;
 list.replaceChildren();const sorted=[...zones].sort((a,b)=>(preferredZones.includes(a)?preferredZones.indexOf(a):999)-(preferredZones.includes(b)?preferredZones.indexOf(b):999)||cityName(a).localeCompare(cityName(b),locale()));
 for(const z of sorted){try{const ab=abbreviation(z,date),off='UTC'+offsetText(zoneOffset(z,date)),r=regionNames[cityKey(z)]||[];if(![z,cityName(z),countryName(z),ab,off,...r].join(' ').toLowerCase().includes(q))continue;const btn=action('',()=>{if(cities.includes(z))return;cities.push(z);storeExtra('myAlarmCities',cities);$('city-picker').close();drawCities()});btn.className='city-picker-option';btn.disabled=cities.includes(z);const info=el('span',undefined,'city-picker-info');info.append(el('strong',cityName(z)+(countryName(z)?' · '+countryName(z):'')),el('small',ab+' · '+off));btn.append(info,el('span',btn.disabled?'✓':'+'));list.append(btn)}catch{}}
 if(!list.children.length)list.append(el('p',L('該当する都市がありません','No matching cities')));
}
$('city-search').addEventListener('input',refreshCityOptions);
$('city-add').onclick=()=>{$('city-search').value='';$('city-picker').showModal();refreshCityOptions();$('city-options').scrollTop=0;};
$('city-picker-close').onclick=()=>$('city-picker').close();
function drawCities(){lastCityTick='';const list=$('city-list');list.replaceChildren();cities.forEach((z,i)=>{const row=el('div',undefined,'city-row');row.dataset.zone=z;const info=el('div',undefined,'city-info');info.append(el('strong','','city-name'),el('small','','city-zone'),el('small','','city-date'),el('small','','city-diff'));const clock=el('div',undefined,'city-clock');clock.append(el('span','','city-time'),el('span','','city-daylight'));const controls=el('div',undefined,'city-controls');const handle=action('☰',()=>{});handle.className='city-handle';handle.title=handle.ariaLabel=L('並べ替え（上下キーでも移動）','Reorder (or use arrow keys)');handle.onkeydown=e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();moveCity(i,e.key==='ArrowUp'?-1:1);Array.from(list.children).find(r=>r.dataset.zone===z)?.querySelector('.city-handle').focus()}};bindCityDrag(handle,row);const remove=action('×',()=>{cities.splice(i,1);storeExtra('myAlarmCities',cities);drawCities()});remove.ariaLabel=L('都市を削除','Remove city');controls.append(handle,remove);row.append(info,clock,controls);list.append(row)});tickCities()}
function moveCity(i,d){if(i+d<0||i+d>=cities.length)return;[cities[i],cities[i+d]]=[cities[i+d],cities[i]];storeExtra('myAlarmCities',cities);drawCities()}
function timeAt(z,date,seconds=false){return new Intl.DateTimeFormat(locale(),{timeZone:z,hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{}),hour12:appSettings.timeFormat==='12'}).format(date)}
// Unified date style across Alarm, World clock, and fullscreen clock.
function formatAppDate(date,timeZone){
 const ja=appSettings.language==='ja';
 const options={year:'numeric',month:ja?'numeric':'long',day:'numeric',weekday:'long'};
 if(timeZone)options.timeZone=timeZone;
 const parts=new Intl.DateTimeFormat(ja?'ja-JP':'en-US',options).formatToParts(date);
 const get=type=>parts.find(p=>p.type===type)?.value||'';
 return ja
  ? `${get('year')}年${get('month')}月${get('day')}日(${get('weekday')})`
  : `${get('weekday')}, ${get('month')} ${get('day')}, ${get('year')}`;
}
function dateAt(z,date,node){node.textContent=formatAppDate(date,z);const w=new Intl.DateTimeFormat('en-US',{timeZone:z,weekday:'short'}).format(date);node.classList.toggle('day-0',w==='Sun');node.classList.toggle('day-6',w==='Sat')}
let worldClockDisplay=readExtra('myAlarmWorldClockDisplay','digital');
if(!['digital','analog','both'].includes(worldClockDisplay))worldClockDisplay='digital';
function applyWorldClockDisplay(){
 $('world-clock-display').value=worldClockDisplay;
 $('world-analog-clock').hidden=worldClockDisplay==='digital';
 $('world-time').hidden=worldClockDisplay==='analog';
 $('world-analog-second-hand').hidden=!appSettings.showSeconds;
}
function updateWorldAnalog(date){
 const h=date.getHours()%12,m=date.getMinutes(),sec=date.getSeconds();
 for(const [part,deg] of [['hour',h*30+m*.5],['minute',m*6+sec*.1],['second',sec*6]])
  $('world-analog-'+part+'-hand').style.transform=`translateX(-50%) rotate(${deg}deg)`;
}
// Reuse the same marker style as the home analog clock.
const worldMarkers=$('home-analog-markers').cloneNode(true);
worldMarkers.id='world-analog-markers';
$('world-analog-markers').replaceWith(worldMarkers);
$('world-clock-display').addEventListener('change',e=>{
 worldClockDisplay=e.target.value;storeExtra('myAlarmWorldClockDisplay',worldClockDisplay);applyWorldClockDisplay();
});
applyWorldClockDisplay();
let lastCityTick='';
function tickCities(){const offset=Number($('travel').value);const date=new Date(Date.now()+offset*60000);const key=[Math.floor(date/1000),offset,appSettings.language,appSettings.timeFormat,appSettings.showSeconds,cities.join()].join('|');if(key===lastCityTick)return;lastCityTick=key;const base=zoneOffset(localZone,date);$('travel-label').textContent=L('時差比較','Time travel')+' '+offsetText(offset);$('travel-reset').disabled=offset===0;$('world-time').textContent=timeAt(localZone,date,appSettings.showSeconds);updateWorldAnalog(date);applyWorldClockDisplay();dateAt(localZone,date,$('world-date'));$('world-zone').textContent=abbreviation(localZone,date)+' · UTC'+offsetText(base)+' · '+zonePart(localZone,date,'long',locale());document.querySelectorAll('.city-row').forEach(r=>{try{const z=r.dataset.zone;const o=zoneOffset(z,date);r.querySelector('.city-name').textContent=cityName(z)+(countryName(z)?' · '+countryName(z):'');r.querySelector('.city-zone').textContent=abbreviation(z,date)+' · UTC'+offsetText(o)+' · '+zonePart(z,date,'long',locale());r.querySelector('.city-time').textContent=timeAt(z,date);dateAt(z,date,r.querySelector('.city-date'));r.querySelector('.city-diff').textContent=L('現在地との時差 ','Local difference ')+offsetText(o-base);const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',hourCycle:'h23'}).format(date));r.querySelector('.city-daylight').textContent=h>=6&&h<18?'☀':'☾';}catch{r.querySelector('.city-time').textContent='—'}})}
$('travel').oninput=tickCities;$('travel-reset').onclick=()=>{$('travel').value=0;tickCities()};
// drawCities uses bindCityDrag() from the next deferred module, ui-enhancements.js.
// Run the first render only after every deferred script is available.
document.addEventListener('DOMContentLoaded', () => {
  refreshCityOptions();
  drawCities();
}, { once: true });
