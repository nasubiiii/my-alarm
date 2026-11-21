
/* =========================
   My Alarm v2.0 - STEP 1
========================= */

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];


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

const $ = id => document.getElementById(id);

function saveAlarms() {
  localStorage.setItem("myAlarms", JSON.stringify(alarms));
}

function showScreen(screen) {
  ["home", "edit", "settings"].forEach(name => {
    $(name + "-screen").hidden = name !== screen;
  });
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



function updateClock() {
  const now = new Date();

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
    days.textContent = formatDays(alarm.days);

    summary.append(time, name, days);

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
    button.className = "weekday-btn";
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


function startRinging(alarm, isSnooze = false) {
  if (activeAlarm) return;

  // 予約済みのスヌーズがあれば解除
  clearTimeout(snoozeTimer);
  snoozeTimer = null;
  snoozedAlarm = null;

  activeAlarm = alarm;
  ringingStartedAt = Date.now();
  soundGeneration++;

  // フェードイン設定を適用
  setupAlarmVolume(alarm.fadeIn);

  $("ringing-time").textContent = alarm.time;
  $("ringing-name").textContent =
    alarm.name || t("defaultAlarm");

  $("ringing-panel").hidden = false;
  $("snooze-alarm-btn").hidden = !alarm.snooze;

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
  stopAlarmVolume();

  activeAlarm = null;
  $("ringing-panel").hidden = true;
}
function snoozeAlarm() {
  if (!activeAlarm || !activeAlarm.snooze) return;

  const alarm = activeAlarm;
  const minutes = Number(alarm.snoozeMinutes) || 5;

  // 現在鳴っている音を止める
  clearInterval(soundTimer);
  soundTimer = null;
  soundGeneration++;
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
  showScreen("settings");
});

$("settings-back-btn").addEventListener("click", () => {
  showScreen("home");
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
  showSeconds: true
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
  back: "戻る",
  settings: "設定",

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
    back: "Back",
    settings: "Settings",
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
  return TRANSLATIONS[appSettings.language][key] || key;
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
  const mode = background ? background.mode : baseMode;
  root.dataset.theme = mode;

  // 背景テーマの配色を適用
  const colors = background || (
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


  ["bell", "digital", "gentle"].forEach((key, index) => {
    $("edit-sound").options[index].textContent = t(key);
  });

  // スヌーズ間隔の表示
  [5, 10, 15].forEach((minutes, index) => {
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
        saveAppSettings();
        applySettings();
    });
    });

    // 背景テーマを変更したとき
    $("background-select").addEventListener("change", () => {
    appSettings.background = $("background-select").value;
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

