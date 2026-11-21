
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
  if (days.length === 7) return "毎日";
  if (days.length === 0) return "1回のみ";
  return DISPLAY_DAYS
    .filter(day => days.includes(day))
    .map(day => DAY_NAMES[day])
    .join("・");
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

  $("current-time").textContent =
    now.toLocaleTimeString("ja-JP", {
      hour12: false
    });

  $("current-date").textContent =
    now.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    });

  const next = findNextAlarm();

  if (!next) {
    $("next-alarm-text").textContent = "設定なし";
    $("next-alarm-countdown").textContent = "";
    return;
  }

  const diff = Math.max(0, next.date - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.ceil((diff % 3600000) / 60000);

  $("next-alarm-text").textContent =
    next.date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

  $("next-alarm-countdown").textContent =
    `あと${hours}時間${minutes}分`;
}

function renderAlarms() {
  const list = $("alarm-list");
  list.innerHTML = "";

  alarms.sort((a, b) => a.time.localeCompare(b.time));

  const next = findNextAlarm();

  if (alarms.length === 0) {
    list.textContent = "まだアラームがありません";
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
    name.textContent = alarm.name || "アラーム";

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
    button.textContent = DAY_NAMES[day];

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
    alarm ? "アラーム編集" : "アラーム追加";

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
    alert("時刻を入力してください");
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
      ? alarm.name + "（コピー）"
      : "アラーム（コピー）"
  };

  alarms.push(copy);
  saveAlarms();
  renderAlarms();
  updateClock();
  showScreen("home");
}

function deleteAlarm() {
  if (!editingId) return;
  if (!confirm("このアラームを削除しますか？")) return;

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

$("add-alarm-btn").addEventListener("click", () => openEditor());
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

renderAlarms();
updateClock();

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
