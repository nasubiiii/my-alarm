
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

  const dateText = now.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

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

/* =========================
   STEP 2：表示設定
========================= */



const DEFAULT_SETTINGS = {
  theme: "dark",
  language: "ja",
  font: "sans",
  accent: "blue",
  background: "default",
  timeFormat: "24",
  showSeconds: true,
  clockDisplay: "digital",
  homeClockDisplay: "digital"
};



let appSettings;

try {
  appSettings = {
    ...DEFAULT_SETTINGS,
    ...JSON.parse(localStorage.getItem("myAlarmSettings") || "{}")
  };
} catch {
  appSettings = { ...DEFAULT_SETTINGS };
}


const ACCENT_COLORS = {
  blue: "#2563eb",
  teal: "#0d9488",
  purple: "#9333ea",
  pink: "#e11d48",
  orange: "#d97706"
};

// 背景テーマ12種類
const BACKGROUND_THEMES = {
  mauve: {
    mode: "dark",
    bg: "#29252F",
    surface: "#393440",
    text: "#F4EDF3",
    muted: "#BDB1C2",
    border: "#514858"
  },
  smokyBlue: {
    mode: "dark",
    bg: "#222E3A",
    surface: "#344454",
    text: "#EFF4F7",
    muted: "#B4C4D0",
    border: "#506273"
  },
  espresso: {
    mode: "dark",
    bg: "#29231F",
    surface: "#3B322C",
    text: "#F8F0E6",
    muted: "#C8B6A5",
    border: "#594B41"
  },
  olive: {
    mode: "dark",
    bg: "#272D27",
    surface: "#384238",
    text: "#F0F2E9",
    muted: "#B6C2B1",
    border: "#536153"
  },
  wine: {
    mode: "dark",
    bg: "#302329",
    surface: "#46323B",
    text: "#FAEDF1",
    muted: "#D1B6C0",
    border: "#654852"
  },
  charcoal: {
    mode: "dark",
    bg: "#2D2C2A",
    surface: "#403E3A",
    text: "#F7F4EF",
    muted: "#C5BFB6",
    border: "#5C5852"
  },
  oatmeal: {
    mode: "light",
    bg: "#F3EFE7",
    surface: "#FFFCF7",
    text: "#443C36",
    muted: "#857A70",
    border: "#DED4C8"
  },
  lilac: {
    mode: "light",
    bg: "#EFEBF2",
    surface: "#FCF9FD",
    text: "#44394C",
    muted: "#8C7F94",
    border: "#D9CEDF"
  },
  mistBlue: {
    mode: "light",
    bg: "#E8EEF1",
    surface: "#F9FBFC",
    text: "#344651",
    muted: "#788D99",
    border: "#CDDCE4"
  },
  pistachio: {
    mode: "light",
    bg: "#EBEEE4",
    surface: "#FAFBF6",
    text: "#3D493D",
    muted: "#7D8C7B",
    border: "#D0DBCA"
  },
  rose: {
    mode: "light",
    bg: "#F4EAEB",
    surface: "#FFFAFA",
    text: "#513F46",
    muted: "#99828B",
    border: "#E6D1D8"
  },
  greige: {
    mode: "light",
    bg: "#EBE7E1",
    surface: "#F9F7F3",
    text: "#47433F",
    muted: "#89837D",
    border: "#D8D0C7"
  }
};


const FONTS = {
  sans: '"Noto Sans JP", sans-serif',
  rounded: '"M PLUS Rounded 1c", sans-serif',
  serif: '"Noto Serif JP", serif',
  mono: '"Roboto Mono", "Noto Sans JP", monospace'
};

const TRANSLATIONS = {


ja: {
    backgroundTheme: "背景テーマ",
    backgroundDefault: "標準（表示モードに合わせる）",
    backgroundDark: "ダーク系",
    backgroundLight: "ライト系",
    mauve: "モーヴグレー",
    smokyBlue: "スモーキーブルー",
    espresso: "エスプレッソ",
    olive: "ダークオリーブ",
    wine: "ワインベルベット",
    charcoal: "チャコールラテ",
    oatmeal: "オートミール",
    lilac: "ダスティライラック",
    mistBlue: "ミストブルー",
    pistachio: "ピスタチオミルク",
    rose: "ローズミルク",
    greige: "フレンチグレージュ",
    clockSettings: "時計設定",
    timeFormat: "時刻表示形式",
    showSeconds: "秒を表示する",
    clockMode: "時計専用モード",
    clockDisplay: "時計専用モードの表示",
    homeClockDisplay: "ホーム画面の時計表示",
    clockDigital: "デジタル",
    clockAnalog: "アナログ",
    clockBoth: "両方",
    back: "戻る",
    settings: "設定",
    backupHeading: "バックアップ・復元",
    exportBackup: "バックアップを保存",
    importBackup: "バックアップから復元",
    appearance: "外観",
    theme: "テーマ",
    accent: "アクセントカラー",
    font: "フォント",
    languageHeading: "言語",
    language: "表示言語",
    alarmSettings: "アラーム設定",
    autoScroll: "次のアラームへ自動スクロール",
    allOn: "すべてON",
    allOff: "すべてOFF",
    allEnabled: "すべてON",
    allDisabled: "すべてOFF",
    partiallyEnabled: "一部ON",
    snoozeNow: "スヌーズ",
    snooze: "スヌーズ",
    snoozeInterval: "スヌーズ間隔",
    fadeIn: "フェードイン",
    skipNext: "次回だけスキップ",
    alarms: "アラーム",
    nextAlarm: "次のアラーム",
    add: "＋ 追加",
    alarmName: "アラーム名",
    time: "時刻",
    repeat: "繰り返し",
    sound: "アラーム音",
    preview: "▶ 試聴",
    save: "保存",
    duplicate: "複製",
    delete: "削除",
    stop: "■ 停止",
    editAlarm: "アラーム編集",
    addAlarm: "アラーム追加",
    defaultAlarm: "アラーム",
    everyday: "毎日",
    once: "1回のみ",
    none: "設定なし",
    empty: "まだアラームがありません",
    hours: "時間",
    minutes: "分",
    remaining: "あと",
    confirmDelete: "このアラームを削除しますか？",
    enterTime: "時刻を入力してください",
    copied: "（コピー）",
    bell: "ベル",
    digital: "デジタル",
    gentle: "やさしい音",
    classicBell: "クラシックベル",
    chime: "チャイム",
    piano: "ピアノ",
    marimba: "マリンバ",
    synth: "シンセ",
    pulse: "パルス",
    alert: "アラート",
    system: "端末設定に合わせる",
    light: "ライト",
    dark: "ダーク",
    blue: "ブルー",
    teal: "ティール",
    purple: "パープル",
    pink: "ピンク",
    orange: "オレンジ",
    weekdays: ["日", "月", "火", "水", "木", "金", "土"]
  },


    en: {
    backgroundTheme: "Background theme",
    backgroundDefault: "Default (follow appearance)",
    backgroundDark: "Dark themes",
    backgroundLight: "Light themes",
    mauve: "Mauve Gray",
    smokyBlue: "Smoky Blue",
    espresso: "Espresso",
    olive: "Dark Olive",
    wine: "Wine Velvet",
    charcoal: "Charcoal Latte",
    oatmeal: "Oatmeal",
    lilac: "Dusty Lilac",
    mistBlue: "Mist Blue",
    pistachio: "Pistachio Milk",
    rose: "Rose Milk",
    greige: "French Greige",
    clockSettings: "Clock settings",
    timeFormat: "Time format",
    showSeconds: "Show seconds",
    clockMode: "Clock mode",
    clockDisplay: "Clock mode display",
    homeClockDisplay: "Home clock display",
    clockDigital: "Digital",
    clockAnalog: "Analog",
    clockBoth: "Both",
    back: "Back",
    settings: "Settings",
    backupHeading: "Backup & Restore",
    exportBackup: "Export backup",
    importBackup: "Restore from backup",
    appearance: "Appearance",
    theme: "Theme",
    accent: "Accent color",
    font: "Font",
    languageHeading: "Language",
    language: "Display language",
    alarmSettings: "Alarm settings",
    autoScroll: "Auto-scroll to next alarm",
    allOn: "All ON",
    allOff: "All OFF",
    allEnabled: "All enabled",
    allDisabled: "All disabled",
    partiallyEnabled: "Partially enabled",
    snoozeNow: "Snooze",
    snooze: "Snooze",
    snoozeInterval: "Snooze interval",
    fadeIn: "Fade in",
    skipNext: "Skip next alarm",
    alarms: "Alarms",
    nextAlarm: "Next alarm",
    add: "+ Add",
    alarmName: "Alarm name",
    time: "Time",
    repeat: "Repeat",
    sound: "Alarm sound",
    preview: "▶ Preview",
    save: "Save",
    duplicate: "Duplicate",
    delete: "Delete",
    stop: "■ Stop",
    editAlarm: "Edit alarm",
    addAlarm: "Add alarm",
    defaultAlarm: "Alarm",
    everyday: "Every day",
    once: "Once",
    none: "Not set",
    empty: "No alarms yet",
    hours: "h",
    minutes: "m",
    remaining: "In ",
    confirmDelete: "Delete this alarm?",
    enterTime: "Please select a time.",
    copied: " (copy)",
    bell: "Bell",
    digital: "Digital",
    gentle: "Gentle",
    classicBell: "Classic Bell",
    chime: "Chime",
    piano: "Piano",
    marimba: "Marimba",
    synth: "Synth",
    pulse: "Pulse",
    alert: "Alert",
    system: "Use device settings",
    light: "Light",
    dark: "Dark",
    blue: "Blue",
    teal: "Teal",
    purple: "Purple",
    pink: "Pink",
    orange: "Orange",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  }
};

function t(key) {
  return TRANSLATIONS[appSettings.language][key] || ({ja:{world:"世界時計",timer:"タイマー",stopwatch:"ストップウォッチ",other:"その他",forecast:"7日間の予定",groups:"グループ管理",group:"グループ",snoozeCount:"スヌーズ回数",later:"詳細機能は次回実装予定",full:"全画面"},en:{world:"World clock",timer:"Timer",stopwatch:"Stopwatch",other:"More",forecast:"7-day schedule",groups:"Groups",group:"Group",snoozeCount:"Snooze repeats",later:"Coming in the next update",full:"Fullscreen"}}[appSettings.language] || {})[key] || key;
}

function saveAppSettings() {
  localStorage.setItem(
    "myAlarmSettings",
    JSON.stringify(appSettings)
  );
}


function applyTheme() {
  const root = document.documentElement;
  const style = root.style;

  // ライト・ダーク・端末設定
  const systemDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const baseMode = appSettings.theme === "system"
    ? (systemDark ? "dark" : "light")
    : appSettings.theme;

  // 選択された背景テーマ
  const background =
    BACKGROUND_THEMES[appSettings.background];

  // 背景テーマを選んだ場合はその明暗を優先
  const mode = background?.mode || baseMode;
  root.dataset.theme = mode;

  // 背景テーマの配色を適用
  const colors = (background?.mode === mode ? background : null) || (
    mode === "dark"
      ? {
          bg: "#111827",
          surface: "#1f2937",
          text: "#f9fafb",
          muted: "#9ca3af",
          border: "#374151"
        }
      : {
          bg: "#f5f6fa",
          surface: "#ffffff",
          text: "#111827",
          muted: "#64748b",
          border: "#dce1e9"
        }
  );

  style.setProperty("--bg", colors.bg);
  style.setProperty("--glow", mode === "light" ? `color-mix(in srgb, ${colors.border} 75%, ${colors.bg})` : `color-mix(in srgb, ${colors.surface} 75%, ${colors.bg})`);
  style.setProperty("--surface", colors.surface);
  style.setProperty("--text", colors.text);
  style.setProperty("--muted", colors.muted);
  style.setProperty("--border", colors.border);

  // アクセントカラーは従来どおり独立
  const accent =
    ACCENT_COLORS[appSettings.accent] ||
    ACCENT_COLORS.blue;

  style.setProperty("--accent", accent);

  // 選択中アラームの背景色
  // アクセント色を薄く重ねる
  style.setProperty(
    "--accent-soft",
    mode === "dark"
      ? "color-mix(in srgb, var(--accent) 18%, var(--surface))"
      : "color-mix(in srgb, var(--accent) 10%, var(--surface))"
  );

  // 通常ボタンの配色
  style.setProperty(
    "--button-bg",
    mode === "dark" ? colors.surface : colors.border
  );

  style.setProperty(
    "--button-text",
    colors.text
  );

  // フォント設定は維持
  style.setProperty(
    "--font",
    FONTS[appSettings.font] || FONTS.sans
  );

  // ブラウザのテーマカラー
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", colors.bg);
}


function applyLanguage() {
  document.documentElement.lang = appSettings.language;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });


  const selects = {
    "theme-select": ["system", "light", "dark"],
    "accent-select": ["blue", "teal", "purple", "pink", "orange"]
  };

  Object.entries(selects).forEach(([id, keys]) => {
    const select = document.getElementById(id);

    keys.forEach((key, index) => {
      select.options[index].textContent = t(key);
    });
  });


  // 背景テーマの選択肢を翻訳
  const backgroundSelect = $("background-select");

  backgroundSelect.options[0].textContent =
    t("backgroundDefault");

  const backgroundNames = [
    "mauve",
    "smokyBlue",
    "espresso",
    "olive",
    "wine",
    "charcoal",
    "oatmeal",
    "lilac",
    "mistBlue",
    "pistachio",
    "rose",
    "greige"
  ];

  backgroundNames.forEach((key, index) => {
    backgroundSelect.options[index + 1].textContent = t(key);
  });

  backgroundSelect.querySelector(
    '[data-group="dark"]'
  ).label = t("backgroundDark");

  backgroundSelect.querySelector(
    '[data-group="light"]'
  ).label = t("backgroundLight");


  [
    "bell",
    "digital",
    "gentle",
    "classicBell",
    "chime",
    "piano",
    "marimba",
    "synth",
    "pulse",
    "alert"
  ].forEach((key, index) => {
    $("edit-sound").options[index].textContent = t(key);
  });

  ["clock-display-select", "home-clock-display-select"]
    .forEach(id => {
      ["clockDigital", "clockAnalog", "clockBoth"]
        .forEach((key, index) => {
          $(id).options[index].textContent = t(key);
        });
    });

  $("edit-snooze-count").options[10].textContent = appSettings.language === "ja" ? "無制限" : "Unlimited";
  // スヌーズ間隔の表示
  Array.from({length:30}, (_,i)=>i+1).forEach((minutes, index) => {
    $("edit-snooze-minutes").options[index].textContent =
      appSettings.language === "ja"
        ? `${minutes}分`
        : `${minutes} min`;
  });


  $("edit-name").placeholder =
    appSettings.language === "ja"
      ? "例：仕事"
      : "e.g. Work";

  $("edit-title").textContent =
    t(editingId === null ? "addAlarm" : "editAlarm");

  $("ringing-panel").querySelector("p").textContent =
    t("defaultAlarm");
}


function applySettings() {
  applyTheme();
  applyLanguage();


  $("theme-select").value = appSettings.theme;
  $("language-select").value = appSettings.language;
  $("font-select").value = appSettings.font;
  $("accent-select").value = appSettings.accent;
  $("background-select").value = appSettings.background;

  // 時計の設定
  $("time-format-select").value = appSettings.timeFormat;
  $("show-seconds").checked = appSettings.showSeconds;
  $("clock-display-select").value = appSettings.clockDisplay;
  $("home-clock-display-select").value = appSettings.homeClockDisplay;

  applyClockDisplay();

  $("clock-mode-btn").title = t("clockMode");
  $("clock-mode-btn").setAttribute(
    "aria-label", t("clockMode")
  );

  $("clock-mode-back-btn").setAttribute(
    "aria-label", t("back")
  );

  renderAlarms();
  updateClock();

  if (!$("edit-screen").hidden) {
    renderWeekdays();
  }
}



    ["theme", "language", "font", "accent"].forEach(key => {
    const select = $(key + "-select");

    select.addEventListener("change", () => {
        appSettings[key] = select.value;
        if (key === "theme") appSettings.background = "default";
        saveAppSettings();
        applySettings();
    });
    });

    // 背景テーマを変更したとき
    $("background-select").addEventListener("change", () => {
    appSettings.background = $("background-select").value;
        if (BACKGROUND_THEMES[appSettings.background]) appSettings.theme = BACKGROUND_THEMES[appSettings.background].mode;
    saveAppSettings();
    applySettings();
    });


// OSのテーマが変わった場合
window.matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (appSettings.theme === "system") {
      applyTheme();
    }
  });


// ページ起動時に文字盤を生成
setupAnalogClock();

// ページ起動時に保存済み設定を反映
applySettings();

/* =========================
   STEP 3：時計設定
========================= */

// 12時間／24時間表示
$("time-format-select").addEventListener("change", () => {
  appSettings.timeFormat = $("time-format-select").value;
  saveAppSettings();
  updateClock();
});

// 秒表示のON/OFF
$("show-seconds").addEventListener("change", () => {
  appSettings.showSeconds = $("show-seconds").checked;
  saveAppSettings();
  applyClockDisplay();
  updateClock();
});

// 時計専用モードの表示切り替え
$("clock-display-select").addEventListener("change", () => {
  appSettings.clockDisplay = $("clock-display-select").value;
  saveAppSettings();
  applyClockDisplay();
  updateClock();
});

// ホーム画面の時計表示切り替え
$("home-clock-display-select").addEventListener("change", () => {
  appSettings.homeClockDisplay = $("home-clock-display-select").value;
  saveAppSettings();
  applyClockDisplay();
  updateClock();
});

// 時計専用モードを開く
$("clock-mode-btn").addEventListener("click", () => {
  $("clock-mode-screen").hidden = false;
  updateClock();
});

// 時計専用モードを閉じる
$("clock-mode-back-btn").addEventListener("click", () => {
  $("clock-mode-screen").hidden = true;
});

$("clock-mode-back-btn").addEventListener("click", () => {
  $("clock-mode-screen").hidden = true;
});

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
$("group-add").onclick=()=>{const name=$("group-name").value.trim();if(!name)return;localStorage.setItem("myAlarmGroups",JSON.stringify([...readGroups(),{id:crypto.randomUUID(),name}]));$("group-name").value="";renderGroups()};
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
function dateAt(z,date,node){node.textContent=new Intl.DateTimeFormat(locale(),{timeZone:z,year:'numeric',month:'short',day:'numeric',weekday:'short'}).format(date);const w=new Intl.DateTimeFormat('en-US',{timeZone:z,weekday:'short'}).format(date);node.classList.toggle('day-0',w==='Sun');node.classList.toggle('day-6',w==='Sat')}
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
$('travel').oninput=tickCities;$('travel-reset').onclick=()=>{$('travel').value=0;tickCities()};refreshCityOptions();drawCities();
const timerNames=[['通常','Standard'],['砂時計','Hourglass'],['液体砂時計','Liquid'],['オイルタイマー','Oil motion']];let timer=readExtra('myAlarmTimer',{kind:0,total:300000,left:300000,end:0});let timerOpen=false;
function duration(ms,tenths=false){const sec=Math.floor(Math.max(0,ms)/1000);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':')+(tenths?'.'+Math.floor(Math.max(0,ms)%1000/100):'')}
function drawTimerTypes(){const root=$('timer-types');root.replaceChildren();timerNames.forEach((n,i)=>root.append(action(L(...n),()=>{if(timer.end&&i!==timer.kind){appDialog(L('実行中のタイマーを停止してください','Stop the running timer first'),undefined,true);return}timer.kind=i;timerOpen=true;root.hidden=true;$('timer-detail').hidden=false;tickTimer()})));}
$('timer-back').onclick=()=>{timerOpen=false;$('timer-types').hidden=false;$('timer-detail').hidden=true};
function timerInputs(){return ['hours','minutes','seconds'].reduce((sum,k,i)=>sum+Math.max(0,Math.min(i?59:99,Math.floor(Number($('timer-'+k).value)||0)))*[3600000,60000,1000][i],0)}
function saveTimer(){storeExtra('myAlarmTimer',timer)}
$('timer-start').onclick=()=>{try{getAudioContext().resume().catch(()=>{})}catch{}if(timer.end){timer.left=Math.max(0,timer.end-Date.now());timer.end=0}else{if(!timer.left||timer.left===timer.total){timer.total=timerInputs();timer.left=timer.total}if(timer.left)timer.end=Date.now()+timer.left}saveTimer();tickTimer()};
$('timer-reset').onclick=()=>{timer.end=0;timer.total=timer.left=timerInputs();saveTimer();tickTimer()};
['hours','minutes','seconds'].forEach(k=>$('timer-'+k).onchange=()=>{if(!timer.end){timer.total=timer.left=timerInputs();saveTimer();tickTimer()}});
function tickTimer(){let left=timer.end?Math.max(0,timer.end-Date.now()):timer.left;if(timer.end&&!left){timer.end=0;timer.left=0;saveTimer();playTimerChime();appDialog(L('タイマー終了','Timer finished'),undefined,true)}const ratio=timer.total?left/timer.total:0;$('timer-value').textContent=duration(Math.ceil(left/1000)*1000);$('timer-progress').value=ratio;$('timer-title').textContent=L(...timerNames[timer.kind]);$('timer-start').textContent=timer.end?L('一時停止','Pause'):L('開始・再開','Start / resume');$('timer-reset').textContent=L('リセット','Reset');const artClass=timer.kind?'timer-art art-'+timer.kind:'';if(!$('timer-art').className.startsWith(artClass)||$('timer-art').dataset.kind!==String(timer.kind)){$('timer-art').className=artClass;$('timer-art').dataset.kind=String(timer.kind)}$('timer-art').style.setProperty('--remaining',ratio*100+'%');['hours','minutes','seconds'].forEach(k=>$('timer-'+k).disabled=!!timer.end)}
let sw=readExtra('myAlarmStopwatch',{elapsed:0,start:0,laps:[],history:[]});function swTime(){return sw.elapsed+(sw.start?Date.now()-sw.start:0)}function saveSW(){storeExtra('myAlarmStopwatch',sw)}
$('sw-start').onclick=()=>{if(sw.start){sw.elapsed=swTime();sw.start=0}else sw.start=Date.now();saveSW();tickSW()};$('sw-lap').onclick=()=>{if(!sw.start)return;sw.laps.push(swTime());saveSW();drawLaps()};$('sw-reset').onclick=()=>{const total=swTime();if(total>0)sw.history.unshift({date:Date.now(),total,laps:sw.laps.slice()});sw.history=sw.history.slice(0,100);sw.elapsed=0;sw.start=0;sw.laps=[];saveSW();drawLaps();tickSW()};
function drawLaps(){$('sw-laps').replaceChildren(...sw.laps.map((v,i)=>el('p',`${i+1}  ${duration(v-(sw.laps[i-1]||0),true)}  /  ${duration(v,true)}`)));$('sw-history').replaceChildren(...sw.history.map((h,i)=>{const row=el('div',undefined,'history-row');row.append(el('span',new Date(h.date).toLocaleString(locale(),{hour12:appSettings.timeFormat==='12'})+' · '+duration(h.total,true)),action(L('削除','Delete'),async()=>{if(await appDialog(L('この履歴を削除しますか？','Delete this record?'))){const idx=sw.history.indexOf(h);if(idx>=0)sw.history.splice(idx,1);saveSW();drawLaps()}}));return row}));if(sw.history.length)$('sw-history').append(action(L('履歴をすべて削除','Clear history'),async()=>{if(await appDialog(L('すべての履歴を削除しますか？','Clear all history?'))){sw.history=[];saveSW();drawLaps()}}))}
function tickSW(){$('sw-value').textContent=duration(swTime(),true);$('sw-start').textContent=sw.start?L('一時停止','Pause'):L('開始・再開','Start / resume');$('sw-lap').textContent=L('ラップ','Lap');$('sw-reset').textContent=L('リセット','Reset');$('sw-history-title').textContent=L('履歴','History');$('sw-lap').disabled=!sw.start}
renderGroups=function(){const list=$('group-list');list.replaceChildren();readGroups().forEach(g=>{const row=el('div',undefined,'alarm-item group-row');const members=alarms.filter(a=>a.groupId===g.id);const count=members.filter(a=>a.enabled).length;const info=el('div',undefined,'group-info');info.append(el('strong',g.name),el('small',L(`${count}/${members.length}件 ON`,`${count}/${members.length} on`)));const toggle=el('input',undefined,'alarm-toggle');toggle.type='checkbox';toggle.checked=members.length>0&&count===members.length;toggle.indeterminate=count>0&&count<members.length;toggle.disabled=!members.length;toggle.setAttribute('aria-label',g.name+' '+L('一括切替','Toggle group'));toggle.onchange=()=>{setGroup(g.id,toggle.checked);renderGroups()};const rename=action('✎',()=>editGroupMembers(g));const remove=action('×',async()=>{if(!await appDialog(g.name+' — '+L('グループを削除しますか？','Delete group?')))return;storeExtra('myAlarmGroups',readGroups().filter(x=>x.id!==g.id));alarms.forEach(a=>{if(a.groupId===g.id)a.groupId=''});saveAlarms();renderGroups();renderAlarms()});for(const [btn,label] of [[rename,L('編集','Edit')],[remove,L('削除','Delete')]]){btn.className='quiet-action';btn.title=label;btn.setAttribute('aria-label',label)}row.append(info,toggle,rename,remove);list.append(row)})};
const originalLanguage=applyLanguage;applyLanguage=function(){originalLanguage();$('time-format-select').options[0].textContent=L('24時間表示','24-hour');$('time-format-select').options[1].textContent=L('12時間表示','12-hour');document.querySelector('[data-i18n="homeClockDisplay"]').textContent=L('アラーム画面の時計','Alarm screen clock');$('home-clock-display-select').value=appSettings.homeClockDisplay;$('city-search').placeholder=L('都市・タイムゾーン','City / time zone');$('travel-reset-text').textContent=L('現在時刻に戻す','Reset to now');$('travel-reset').setAttribute('aria-label',L('現在時刻に戻す','Reset to now'));$('preset-name').placeholder=L('3分','3 minutes');$('group-name').placeholder=L('グループ名','Group name');refreshCityOptions();document.querySelector('[data-i18n="worldClockDisplay"]').textContent=L('世界時計の現在地の表示','World clock local display');$('world-clock-display').options[0].textContent=L('デジタル','Digital');$('world-clock-display').options[1].textContent=L('アナログ','Analog');$('world-clock-display').options[2].textContent=L('両方','Both');$('world-clock-display').ariaLabel=L('現在地の時計表示','Local clock display');applyWorldClockDisplay();drawTimerTypes();decorateNav();drawLaps();drawCities()};
function decorateNav(){const paths=['<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M5 3L2 6m17-3 3 3"/>','<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>','<path d="M6 3h12M6 21h12M7 3v4l5 5-5 5v4m10-18v4l-5 5 5 5v4"/>','<circle cx="12" cy="14" r="8"/><path d="M9 2h6m-3 0v4m6 1 2-2m-8 5v4"/>','<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'];document.querySelectorAll('#tab-nav button').forEach((b,i)=>{b.querySelector('.nav-icon')?.remove();const span=el('span',undefined,'nav-icon');span.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[i]+'</svg>';b.prepend(span)});for(const [id,key] of [['forecast-btn','forecast'],['groups-btn','groups']]){$(id).title=t(key);$(id).setAttribute('aria-label',t(key))}}
function colorDates(){const d=new Date().getDay();['current-date','clock-mode-date'].forEach(id=>{$(id).classList.toggle('day-0',d===0);$(id).classList.toggle('day-6',d===6)})}
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
let lastScene='';function updateScenery(){const scene=v3Settings.scenery===false?'none':periodAt(localZone,new Date());if(scene===lastScene)return;lastScene=scene;document.documentElement.dataset.scenery=scene;document.documentElement.style.setProperty('--scenic-image',scene==='none'?'none':`url("./scenes/${scene}.svg")`)}
const priorTheme=applyTheme;applyTheme=function(){priorTheme();updateScenery()};
const priorCities=tickCities;tickCities=function(){priorCities();const offset=Number($('travel').value);const d=new Date(Date.now()+offset*60000);document.querySelectorAll('.city-row').forEach(r=>{const z=r.dataset.zone;const key=cityKey(z);const landmark=['Tokyo','London','Paris','New_York','Los_Angeles','Seoul','Sydney','Dubai','Singapore','Shanghai','Kolkata'].includes(key)?key:null;const period=periodAt(z,d);const enabled=v3Settings.cityScenery!==false;r.classList.toggle('has-city-scene',enabled);r.dataset.period=period;r.style.setProperty('--city-landmark',enabled&&landmark?`url("./scenes/city-${landmark}.svg")`:'none')})};
const priorTimer=tickTimer;tickTimer=function(){priorTimer();const art=$('timer-art');if(timer.kind===3){if(!art.querySelector('.oil-drop')){art.replaceChildren();for(let i=0;i<8;i++){const b=el('i',undefined,'oil-drop');b.style.left=(7+i*11)+'%';b.style.width=(12+i)+'px';b.style.height=(16+i)+'px';b.style.animationDuration=(3.8+i*.55)+'s';b.style.animationDelay=(-i*.63)+'s';art.append(b)}}art.classList.toggle('oil-paused',!timer.end); }else if(art.children.length){art.replaceChildren()}};
// Update 03.1: reusable timer presets, persisted separately from active timer.
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
