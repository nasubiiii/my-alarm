
/* =========================
   My Alarm v2.0 - STEP 1
========================= */

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DISPLAY_DAYS = [0, 1, 2, 3, 4, 5, 6];


let alarms = JSON.parse(
  localStorage.getItem("myAlarms") || "[]"
).map(alarm => ({
  ...alarm,
  name: alarm.name || "",
  sound: alarm.sound || "bell",
  days: Array.isArray(alarm.days)
    ? alarm.days
    : [0, 1, 2, 3, 4, 5, 6],
  snooze: alarm.snooze ?? true,
  snoozeMinutes: alarm.snoozeMinutes ?? 5,
  fadeIn: alarm.fadeIn ?? false,
  skipNext: alarm.skipNext ?? false
}));


let editingId = null;
let selectedDays = [];
let audioContext = null;
let soundTimer = null;
let activeAlarm = null;
let lastCheckedMinute = "";

// STEP 4-2
let snoozeTimer = null;
let snoozedAlarm = null;
let ringingStartedAt = 0;
let soundGeneration = 0;
let alarmVolumeNode = null;

// 追加アラーム音の再生予約を管理
let extraSoundNodes = [];

const $ = id => document.getElementById(id);

function saveAlarms() {
  localStorage.setItem("myAlarms", JSON.stringify(alarms));
}

// Settings navigation: explicit entry point determines whether a return arrow is shown.
let activeScreen = 'home';
let subpageReturnScreen = 'home';
function showScreen(screen, entry = 'tab') {
  if (['forecast','groups'].includes(screen) && !['forecast','groups'].includes(activeScreen)) subpageReturnScreen = activeScreen;
  activeScreen = screen;
  const fromAlarm = screen === 'settings' && entry === 'alarm';
  const settingsPanel = $('settings-screen');
  const back = $('settings-return');
  settingsPanel.dataset.entry = fromAlarm ? 'alarm' : 'tab';
  back.hidden = !fromAlarm;
  back.setAttribute('aria-hidden', String(!fromAlarm));
  if (["home", "world", "timer", "stopwatch", "settings"].includes(screen)) {
    try { sessionStorage.setItem("myAlarmActiveTab", screen); } catch {}
  }
  ["home", "edit", "settings", "world", "timer", "stopwatch", "forecast", "groups"].forEach(name => {
    $(name + "-screen").hidden = name !== screen;
  });
  $("tab-nav").hidden = ["edit", "forecast", "groups"].includes(screen);
  document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-current", b.dataset.tab === screen ? "page" : "false"));
  if (screen === "home") requestAnimationFrame(scrollToNextAlarm);
}

function formatDays(days) {
  if (days.length === 7) return t("everyday");
  if (days.length === 0) return t("once");

  return DISPLAY_DAYS
    .filter(day => days.includes(day))
    .map(day => t("weekdays")[day])
    .join(appSettings.language === "ja" ? "・" : ", ");
}


function getNextAlarmDate(alarm, now = new Date()) {
  if (!alarm.enabled) return null;

  const [hours, minutes] = alarm.time.split(":").map(Number);

  // 次回だけスキップする場合は、その次の予定を返す
  let occurrencesToSkip = alarm.skipNext ? 1 : 0;

  // 曜日未選択は1回限りのアラーム
  if (alarm.days.length === 0) {
    if (occurrencesToSkip > 0) return null;

    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date <= now) date.setDate(date.getDate() + 1);
    return date;
  }

  for (let i = 0; i <= 14; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    date.setHours(hours, minutes, 0, 0);

    if (alarm.days.includes(date.getDay()) && date > now) {
      if (occurrencesToSkip > 0) {
        occurrencesToSkip--;
        continue;
      }

      return date;
    }
  }

  return null;
}


function findNextAlarm() {
  const now = new Date();
  let result = null;

  alarms.forEach(alarm => {
    const date = getNextAlarmDate(alarm, now);
    if (date && (!result || date < result.date)) {
      result = { alarm, date };
    }
  });

  return result;
}




function setupAnalogClock() {
  // 時計専用モードとホーム画面の両方に目盛りを作成
  ["analog-markers", "home-analog-markers"].forEach(id => {
    const markers = $(id);
    markers.innerHTML = "";

    for (let i = 0; i < 60; i++) {
      const marker = document.createElement("div");
      marker.className = i % 5 === 0
        ? "clock-marker hour-marker"
        : "clock-marker";

      marker.style.transform =
        `translate(-50%, -50%) rotate(${i * 6}deg)`;

      markers.appendChild(marker);
    }
  });
}

function updateAnalogClock(now = new Date()) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  // 時計専用モードとホーム画面の針を更新
  ["", "home-"].forEach(prefix => {
    $(prefix + "analog-hour-hand").style.transform =
      `translateX(-50%) rotate(${hourAngle}deg)`;

    $(prefix + "analog-minute-hand").style.transform =
      `translateX(-50%) rotate(${minuteAngle}deg)`;

    $(prefix + "analog-second-hand").style.transform =
      `translateX(-50%) rotate(${secondAngle}deg)`;
  });
}

function applyClockDisplay() {
  // 時計専用モード
  const mode = appSettings.clockDisplay;

  $("analog-clock").hidden = mode === "digital";
  $("clock-mode-time").hidden = mode === "analog";

  // ホーム画面
  const homeMode = appSettings.homeClockDisplay;

  $("home-analog-clock").hidden = homeMode === "digital";
  $("current-time").hidden = homeMode === "analog";

  // 秒針の表示
  $("analog-second-hand").hidden = !appSettings.showSeconds;
  $("home-analog-second-hand").hidden = !appSettings.showSeconds;
}

function updateClock() {
  const now = new Date();

  updateAnalogClock(now);

  const locale = appSettings.language === "en"
    ? "en-US"
    : "ja-JP";

  const is12Hour = appSettings.timeFormat === "12";

  // 時刻表示の設定
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: is12Hour
  };

  if (appSettings.showSeconds) {
    timeOptions.second = "2-digit";
  }

  const timeText = now.toLocaleTimeString(
    locale,
    timeOptions
  );

  const dateText = formatAppDate(now);

  // ホーム画面
  $("current-time").textContent = timeText;
  $("current-date").textContent = dateText;

  // 時計専用モード
  $("clock-mode-time").textContent = timeText;
  $("clock-mode-date").textContent = dateText;

  const next = findNextAlarm();

  if (!next) {
    $("next-alarm-text").textContent = t("none");
    $("next-alarm-countdown").textContent = "";

    $("clock-mode-next-alarm").textContent = t("none");
    $("clock-mode-countdown").textContent = "";
    return;
  }

  // 次のアラーム日時
  const nextDateText = next.date.toLocaleString(
    locale,
    {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: is12Hour
    }
  );

  // 残り時間
  const diff = Math.max(0, next.date - now);
  const totalMinutes = Math.ceil(diff / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const countdownText =
    appSettings.language === "en"
      ? `In ${hours}h ${minutes}m`
      : `あと${hours}時間${minutes}分`;

  $("next-alarm-text").textContent = nextDateText;
  $("next-alarm-countdown").textContent = countdownText;

  $("clock-mode-next-alarm").textContent = nextDateText;
  $("clock-mode-countdown").textContent = countdownText;
}



function renderAlarms() {
  const list = $("alarm-list");
  list.innerHTML = "";

  const total = alarms.length;
  const enabled = alarms.filter(alarm => alarm.enabled).length;

  const allOn = total > 0 && enabled === total;
  const allOff = enabled === 0;

  const status = $("bulk-alarm-status");

  status.textContent =
    total === 0
      ? t("none")
      : allOn
        ? t("allEnabled")
        : allOff
          ? t("allDisabled")
          : t("partiallyEnabled");

  $("all-on-btn").classList.toggle("is-active", allOn);
  $("all-off-btn").classList.toggle("is-active", total > 0 && allOff);

  $("all-on-btn").disabled = total === 0 || allOn;
  $("all-off-btn").disabled = total === 0 || allOff;

  alarms.sort((a, b) => a.time.localeCompare(b.time));

  const next = findNextAlarm();

  if (alarms.length === 0) {
     list.textContent = t("empty");
    return;
  }

  alarms.forEach(alarm => {
    const item = document.createElement("div");
    item.className = "alarm-item";
    item.dataset.id = alarm.id;

    if (!alarm.enabled) item.classList.add("disabled");

    if (next && next.alarm.id === alarm.id) {
      item.classList.add("next-alarm");
    }

    const summary = document.createElement("div");
    summary.className = "alarm-summary";
    summary.tabIndex = 0;
    summary.setAttribute("role", "button");

    const time = document.createElement("span");
    time.className = "alarm-time";
    time.textContent = alarm.time;

    const name = document.createElement("span");
    name.className = "alarm-name";
    name.textContent = alarm.name || t("defaultAlarm");

    const days = document.createElement("span");
    days.className = "alarm-days";
    if (!alarm.days.length) days.textContent = t("once");
    else DISPLAY_DAYS.filter(d=>alarm.days.includes(d)).forEach((d,i)=>{if(i) days.append(" · ");const span=document.createElement("span");span.className="day-"+d;span.textContent=t("weekdays")[d];days.append(span)});

    summary.append(time, name, days);
    if (alarm.groupId) { const label = document.createElement("small"); label.textContent = readGroups().find(g=>g.id===alarm.groupId)?.name || ""; summary.append(label); }

    summary.addEventListener("click", () => {
      openEditor(alarm.id);
    });

    summary.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEditor(alarm.id);
      }
    });

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "alarm-toggle";
    toggle.checked = alarm.enabled;
    toggle.setAttribute(
      "aria-label",
      `${alarm.time} のON/OFF`
    );

    toggle.addEventListener("change", () => {
      alarm.enabled = toggle.checked;
      saveAlarms();
      renderAlarms();
      updateClock();
    });

    item.append(summary, toggle);
    list.appendChild(item);
  });
}

function renderWeekdays() {
  const container = $("edit-weekdays");
  container.innerHTML = "";

  DISPLAY_DAYS.forEach(day => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "weekday-btn day-" + day;
    button.textContent = t("weekdays")[day];

    if (selectedDays.includes(day)) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      if (selectedDays.includes(day)) {
        selectedDays = selectedDays.filter(d => d !== day);
      } else {
        selectedDays.push(day);
      }
      renderWeekdays();
    });

    container.appendChild(button);
  });
}


function updateSnoozeVisibility() {
  $("edit-snooze-minutes").disabled =
    !$("edit-snooze").checked;
  $("edit-snooze-count").disabled = !$("edit-snooze").checked;
}

$("edit-snooze").addEventListener(
  "change",
  updateSnoozeVisibility
);


function setupTimePicker() {
  const hourSelect = $("edit-hour");
  const minuteSelect = $("edit-minute");
  const ampmSelect = $("edit-ampm");

  const is12Hour = appSettings.timeFormat === "12";

  hourSelect.innerHTML = "";
  minuteSelect.innerHTML = "";

  // 時間の選択肢
  const hourStart = is12Hour ? 1 : 0;
  const hourEnd = is12Hour ? 12 : 23;

  for (let hour = hourStart; hour <= hourEnd; hour++) {
    const option = document.createElement("option");
    option.value = String(hour).padStart(2, "0");
    option.textContent = option.value;
    hourSelect.appendChild(option);
  }

  // 分の選択肢
  for (let minute = 0; minute <= 59; minute++) {
    const option = document.createElement("option");
    option.value = String(minute).padStart(2, "0");
    option.textContent = option.value;
    minuteSelect.appendChild(option);
  }

  ampmSelect.hidden = !is12Hour;
}

function setTimePickerValue(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const is12Hour = appSettings.timeFormat === "12";

  if (is12Hour) {
    const hour12 = hours % 12 || 12;
    $("edit-hour").value = String(hour12).padStart(2, "0");
    $("edit-ampm").value = hours >= 12 ? "PM" : "AM";
  } else {
    $("edit-hour").value = String(hours).padStart(2, "0");
  }

  $("edit-minute").value = String(minutes).padStart(2, "0");
}

function getTimePickerValue() {
  let hours = Number($("edit-hour").value);
  const minutes = $("edit-minute").value;

  if (appSettings.timeFormat === "12") {
    const isPM = $("edit-ampm").value === "PM";
    hours = hours % 12 + (isPM ? 12 : 0);
  }

  return String(hours).padStart(2, "0") + ":" + minutes;
}

function openEditor(id = null) {


  editingId = id;
  const alarm = alarms.find(a => a.id === id);

  $("edit-title").textContent =
  alarm ? t("editAlarm") : t("addAlarm");


  $("edit-name").value = alarm?.name || "";

  setupTimePicker();
  setTimePickerValue(alarm?.time || "07:00");

  $("edit-sound").value = alarm?.sound || "bell";

  // STEP 4：追加設定を読み込む
  $("edit-snooze").checked = alarm?.snooze ?? true;
  $("edit-snooze-minutes").value =
    String(alarm?.snoozeMinutes ?? 5);
  $("edit-fade-in").checked = alarm?.fadeIn ?? false;
  $("edit-skip-next").checked = alarm?.skipNext ?? false;

  $("edit-snooze-count").value = String(alarm?.snoozeCount ?? 0);
  fillGroups(alarm?.groupId);
  updateSnoozeVisibility();

  selectedDays = alarm
    ? [...alarm.days]
    : [0, 1, 2, 3, 4, 5, 6];


  $("edit-actions").hidden = !alarm;

  renderWeekdays();
  showScreen("edit");
}

function saveEditedAlarm() {
  const time = getTimePickerValue();

  if (!time) {
    alert(t("enterTime"));
    return;
  }


  const data = {
    name: $("edit-name").value.trim(),
    time,
    sound: $("edit-sound").value,
    days: [...selectedDays],

    // STEP 4：追加設定
    snooze: $("edit-snooze").checked,
    snoozeMinutes: Number(
      $("edit-snooze-minutes").value
    ),
    snoozeCount: Number($("edit-snooze-count").value),
    groupId: $("edit-group").value,
    fadeIn: $("edit-fade-in").checked,
    skipNext: $("edit-skip-next").checked
  };


  const alarm = alarms.find(a => a.id === editingId);

  if (alarm) {
    Object.assign(alarm, data);
  } else {
    alarms.push({
      id: crypto.randomUUID(),
      enabled: true,
      ...data
    });
  }

  saveAlarms();
  renderAlarms();
  updateClock();
  showScreen("home");
}

function duplicateAlarm() {
  const alarm = alarms.find(a => a.id === editingId);
  if (!alarm) return;

  const copy = {
    ...alarm,
    id: crypto.randomUUID(),
    name: alarm.name
    ? alarm.name + t("copied")
    : t("defaultAlarm") + t("copied")
  };

  alarms.push(copy);
  saveAlarms();
  renderAlarms();
  updateClock();
  showScreen("home");
}

function deleteAlarm() {
  if (!editingId) return;
  if (!confirm(t("confirmDelete"))) return;

  alarms = alarms.filter(a => a.id !== editingId);
  saveAlarms();
  renderAlarms();
  updateClock();
  showScreen("home");
}

/* =========================
   アラーム音
========================= */

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }
  return audioContext;
}

function playTone(frequency, duration, volume = 0.2) {
  const context = getAudioContext();

  if (context.state !== "running") {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + duration
  );

  oscillator.connect(gain);

  // アラーム鳴動中だけ全体音量の制御を通す
  gain.connect(
    alarmVolumeNode || context.destination
  );

  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}


function playSound(type, volume = 0.2, generation = soundGeneration) {
  // 停止後に遅れて音が鳴ることを防ぐ
  const playIfCurrent = (frequency, duration, toneVolume) => {
    if (generation !== soundGeneration) return;
    playTone(frequency, duration, toneVolume);
  };

  // STEP 4-6：追加した7種類のアラーム音
  const extraSounds = [
    "classicBell",
    "chime",
    "piano",
    "marimba",
    "synth",
    "pulse",
    "alert"
  ];

  if (extraSounds.includes(type)) {
    if (generation !== soundGeneration) return;

    playExtraSound(type, volume);
    return;
  }

  if (type === "digital") {
    playIfCurrent(880, 0.15, volume);
    setTimeout(() => {
      playIfCurrent(880, 0.15, volume);
    }, 200);

  } else if (type === "gentle") {
    playIfCurrent(523, 0.5, volume * 0.5);
    setTimeout(() => {
      playIfCurrent(659, 0.5, volume * 0.5);
    }, 550);

  } else {
    playIfCurrent(880, 0.4, volume);
    setTimeout(() => {
      playIfCurrent(660, 0.4, volume);
    }, 450);
  }
}

function playAlarmCycle() {
  if (!activeAlarm) return;

  // 各音の音量は一定にし、
  // アラーム全体の音量を別途制御する
  playSound(activeAlarm.sound, 0.2);
}

function setupAlarmVolume(fadeIn) {
  const context = getAudioContext();

  // 以前の音量制御を終了
  if (alarmVolumeNode) {
    alarmVolumeNode.gain.cancelScheduledValues(
      context.currentTime
    );
    alarmVolumeNode.gain.setValueAtTime(
      0,
      context.currentTime
    );
    alarmVolumeNode = null;
  }

  alarmVolumeNode = context.createGain();
  alarmVolumeNode.connect(context.destination);

  if (fadeIn) {
    // 通常音量の5%から開始
    alarmVolumeNode.gain.setValueAtTime(
      0.05,
      context.currentTime
    );

    // 30秒後に通常音量へ
    alarmVolumeNode.gain.linearRampToValueAtTime(
      1,
      context.currentTime + 30
    );
  } else {
    alarmVolumeNode.gain.setValueAtTime(
      1,
      context.currentTime
    );
  }
}

function stopAlarmVolume() {
  if (!alarmVolumeNode) return;

  const context = getAudioContext();

  alarmVolumeNode.gain.cancelScheduledValues(
    context.currentTime
  );
  alarmVolumeNode.gain.setValueAtTime(
    0,
    context.currentTime
  );

  alarmVolumeNode = null;
}


function playExtraTone(
  frequency,
  duration,
  volume = 0.2,
  type = "sine",
  delay = 0
) {
  const context = getAudioContext();

  if (context.state !== "running") {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.001, volume),
    start + 0.015
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    start + duration
  );

  oscillator.connect(gain);
  gain.connect(alarmVolumeNode || context.destination);

  // 停止時にまとめて止められるよう管理
  extraSoundNodes.push(oscillator);

  oscillator.onended = () => {
    extraSoundNodes = extraSoundNodes.filter(
      node => node !== oscillator
    );
    oscillator.disconnect();
    gain.disconnect();
  };

  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

// 追加した7種類のアラーム音
function stopExtraSounds() {
  extraSoundNodes.forEach(oscillator => {
    try {
      oscillator.stop();
    } catch {
      // すでに停止済みの場合は何もしない
    }
  });

  extraSoundNodes = [];
}
function playExtraSound(type, volume = 0.2) {
  switch (type) {
    case "classicBell":
      playExtraTone(1100, 0.35, volume, "square");
      playExtraTone(880, 0.35, volume * 0.5, "sine", 0.4);
      break;

    case "chime":
      playExtraTone(523.25, 0.8, volume, "sine");
      playExtraTone(659.25, 0.8, volume, "sine", 0.25);
      playExtraTone(783.99, 1.0, volume, "sine", 0.5);
      break;

    case "piano":
      playExtraTone(261.63, 0.6, volume, "triangle");
      playExtraTone(329.63, 0.6, volume, "triangle", 0.35);
      playExtraTone(392.0, 0.8, volume, "triangle", 0.7);
      break;

    case "marimba":
      playExtraTone(523.25, 0.22, volume, "sine");
      playExtraTone(659.25, 0.22, volume, "sine", 0.25);
      playExtraTone(783.99, 0.22, volume, "sine", 0.5);
      playExtraTone(1046.5, 0.35, volume, "sine", 0.75);
      break;

    case "synth":
      playExtraTone(440, 0.6, volume * 0.6, "sawtooth");
      playExtraTone(660, 0.6, volume * 0.6, "sawtooth", 0.3);
      playExtraTone(880, 0.8, volume * 0.6, "sawtooth", 0.6);
      break;

    case "pulse":
      playExtraTone(880, 0.12, volume, "square");
      playExtraTone(880, 0.12, volume, "square", 0.2);
      playExtraTone(880, 0.12, volume, "square", 0.4);
      break;

    case "alert":
      playExtraTone(900, 0.25, volume, "square");
      playExtraTone(650, 0.25, volume, "square", 0.3);
      playExtraTone(900, 0.25, volume, "square", 0.6);
      break;
  }
}

let snoozeUsed = 0;
function startRinging(alarm, isSnooze = false) {
  if (activeAlarm) return;

  // 予約済みのスヌーズがあれば解除
  clearTimeout(snoozeTimer);
  snoozeTimer = null;
  snoozedAlarm = null;

  if (!isSnooze) snoozeUsed = 0;
  activeAlarm = alarm;
  ringingStartedAt = Date.now();
  soundGeneration++;

  // フェードイン設定を適用
  setupAlarmVolume(alarm.fadeIn);

  $("ringing-time").textContent = alarm.time;
  $("ringing-name").textContent =
    alarm.name || t("defaultAlarm");

  $("ringing-panel").hidden = false;
  $("snooze-alarm-btn").hidden = !alarm.snooze || (alarm.snoozeCount > 0 && snoozeUsed >= alarm.snoozeCount);

  playAlarmCycle();

  soundTimer = setInterval(() => {
    playAlarmCycle();
  }, 2000);

  // 1回限りのアラームは、通常の予定をOFFにする
  if (!isSnooze && alarm.days.length === 0) {
    alarm.enabled = false;
    saveAlarms();
    renderAlarms();
    updateClock();
  }
}

function stopRinging() {
  clearInterval(soundTimer);
  soundTimer = null;

  clearTimeout(snoozeTimer);
  snoozeTimer = null;
  snoozedAlarm = null;

  soundGeneration++;

  // 追加アラーム音の予約も停止
  stopExtraSounds();
  stopAlarmVolume();

  activeAlarm = null;
  $("ringing-panel").hidden = true;
}
function snoozeAlarm() {
  if (!activeAlarm || !activeAlarm.snooze) return;

  const alarm = activeAlarm;
  if (alarm.snoozeCount > 0 && snoozeUsed >= alarm.snoozeCount) return;
  snoozeUsed++;
  const minutes = Number(alarm.snoozeMinutes) || 5;

  // 現在鳴っている音を止める
  clearInterval(soundTimer);
  soundTimer = null;
  soundGeneration++;

  // スヌーズ時も追加アラーム音を停止
  stopExtraSounds();
  stopAlarmVolume();

  activeAlarm = null;
  $("ringing-panel").hidden = true;

  // 指定した分数後に再鳴動
  snoozedAlarm = alarm;

  snoozeTimer = setTimeout(() => {
    snoozeTimer = null;

    const target = snoozedAlarm;
    snoozedAlarm = null;

    if (target) {
      startRinging(target, true);
    }
  }, minutes * 60 * 1000);
}



function checkAlarms() {
  const now = new Date();

  const time =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  const minuteKey = now.toDateString() + " " + time;

  if (minuteKey === lastCheckedMinute) return;
  lastCheckedMinute = minuteKey;

  let changed = false;
  const dueAlarms = [];

  alarms.forEach(alarm => {
    if (!alarm.enabled) return;
    if (alarm.time !== time) return;

    const matchesToday =
      alarm.days.length === 0 ||
      alarm.days.includes(now.getDay());

    if (!matchesToday) return;

    if (alarm.skipNext) {
      // 次回だけスキップを消費
      alarm.skipNext = false;

      // 1回限りなら次の予定はないのでOFF
      if (alarm.days.length === 0) {
        alarm.enabled = false;
      }

      changed = true;
      return;
    }

    dueAlarms.push(alarm);
  });

  if (changed) {
    saveAlarms();
    renderAlarms();
    updateClock();
  }

  if (!activeAlarm && dueAlarms.length > 0) {
    startRinging(dueAlarms[0]);
  }
}

/* =========================
   設定
========================= */

const autoScrollInput = $("auto-scroll");

autoScrollInput.checked =
  localStorage.getItem("autoScroll") !== "false";

autoScrollInput.addEventListener("change", () => {
  localStorage.setItem(
    "autoScroll",
    String(autoScrollInput.checked)
  );
});

function scrollToNextAlarm() {
  if (!autoScrollInput.checked) return;

  const next = findNextAlarm();
  if (!next) return;

  const target = [...document.querySelectorAll(".alarm-item")]
    .find(item => item.dataset.id === String(next.alarm.id));

  if (target) {
    target.scrollIntoView({
      behavior: "instant",
      block: "center"
    });
  }
}

/* =========================
   ボタン操作
========================= */


$("add-btn").addEventListener("click", () => openEditor());

// すべてON
$("all-on-btn").addEventListener("click", () => {
  alarms.forEach(alarm => {
    alarm.enabled = true;
  });

  saveAlarms();
  renderAlarms();
  updateClock();
});

// すべてOFF
$("all-off-btn").addEventListener("click", () => {
  alarms.forEach(alarm => {
    alarm.enabled = false;
  });

  // スヌーズ待機中のアラームも解除
  clearTimeout(snoozeTimer);
  snoozeTimer = null;
  snoozedAlarm = null;

  saveAlarms();
  renderAlarms();
  updateClock();
});

$("back-btn").addEventListener("click", () => showScreen("home"));
$("save-alarm-btn").addEventListener("click", saveEditedAlarm);
$("duplicate-btn").addEventListener("click", duplicateAlarm);
$("delete-btn").addEventListener("click", deleteAlarm);

$("settings-btn").addEventListener("click", () => {
  showScreen("settings", "alarm");
});

$("preview-btn").addEventListener("click", () => {
  getAudioContext().resume();
  playSound($("edit-sound").value);
});

$("stop-alarm-btn").addEventListener("click", stopRinging);
$("snooze-alarm-btn").addEventListener("click", snoozeAlarm);

/* =========================
   初期化
========================= */

setInterval(updateClock, 1000);
setInterval(checkAlarms, 1000);

requestAnimationFrame(() => {
  requestAnimationFrame(scrollToNextAlarm);
});

// PWA登録
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(console.error);
  });
}

