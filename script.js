
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
    : [0, 1, 2, 3, 4, 5, 6]
}));

let editingId = null;
let selectedDays = [];
let audioContext = null;
let soundTimer = null;
let activeAlarm = null;
let lastCheckedMinute = "";

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

  // 曜日未選択は次に到来する時刻に鳴らす
  if (alarm.days.length === 0) {
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date <= now) date.setDate(date.getDate() + 1);
    return date;
  }

  for (let i = 0; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    date.setHours(hours, minutes, 0, 0);

    if (alarm.days.includes(date.getDay()) && date > now) {
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

function openEditor(id = null) {
  editingId = id;
  const alarm = alarms.find(a => a.id === id);

  $("edit-title").textContent =
  alarm ? t("editAlarm") : t("addAlarm");

  $("edit-name").value = alarm?.name || "";
  $("edit-time").value = alarm?.time || "07:00";
  $("edit-sound").value = alarm?.sound || "bell";

  selectedDays = alarm
    ? [...alarm.days]
    : [0, 1, 2, 3, 4, 5, 6];

  $("edit-actions").hidden = !alarm;

  renderWeekdays();
  showScreen("edit");
}

function saveEditedAlarm() {
  const time = $("edit-time").value;

  if (!time) {
    alert(t("enterTime"));
    return;
  }

  const data = {
    name: $("edit-name").value.trim(),
    time,
    sound: $("edit-sound").value,
    days: [...selectedDays]
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
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function playSound(type) {
  if (type === "digital") {
    playTone(880, 0.15);
    setTimeout(() => playTone(880, 0.15), 200);
  } else if (type === "gentle") {
    playTone(523, 0.5, 0.1);
    setTimeout(() => playTone(659, 0.5, 0.1), 550);
  } else {
    playTone(880, 0.4);
    setTimeout(() => playTone(660, 0.4), 450);
  }
}

function startRinging(alarm) {
  if (activeAlarm) return;

  activeAlarm = alarm;
  $("ringing-time").textContent = alarm.time;
  $("ringing-name").textContent = alarm.name || "";
  $("ringing-panel").hidden = false;

  playSound(alarm.sound);
  soundTimer = setInterval(() => {
    playSound(alarm.sound);
  }, 2000);

  // 1回限りのアラームはOFFにする
  if (alarm.days.length === 0) {
    alarm.enabled = false;
    saveAlarms();
    renderAlarms();
  }
}

function stopRinging() {
  clearInterval(soundTimer);
  soundTimer = null;
  activeAlarm = null;
  $("ringing-panel").hidden = true;
}

function checkAlarms() {
  const now = new Date();

  const time =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  const minuteKey = now.toDateString() + " " + time;

  if (minuteKey === lastCheckedMinute) return;
  lastCheckedMinute = minuteKey;

  const alarm = alarms.find(a =>
    a.enabled &&
    a.time === time &&
    (a.days.length === 0 ||
     a.days.includes(now.getDay()))
  );

  if (alarm) startRinging(alarm);
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

const FONTS = {
  sans: '"Noto Sans JP", sans-serif',
  rounded: '"M PLUS Rounded 1c", sans-serif',
  serif: '"Noto Serif JP", serif',
  mono: '"Roboto Mono", "Noto Sans JP", monospace'
};

const TRANSLATIONS = {

ja: {
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
  const theme = appSettings.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light")
    : appSettings.theme;

  document.documentElement.dataset.theme = theme;

  document.documentElement.style.setProperty(
    "--accent",
    ACCENT_COLORS[appSettings.accent] || ACCENT_COLORS.blue
  );

  document.documentElement.style.setProperty(
    "--font",
    FONTS[appSettings.font] || FONTS.sans
  );

  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      theme === "dark" ? "#111827" : "#f5f6fa"
    );
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

  ["bell", "digital", "gentle"].forEach((key, index) => {
    $("edit-sound").options[index].textContent = t(key);
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

