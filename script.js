
/* =========================
   1. 時計の表示
========================= */

function updateClock() {
  const now = new Date();

  document.getElementById("current-time").textContent =
    now.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

  document.getElementById("current-date").textContent =
    now.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    });
}

updateClock();
setInterval(updateClock, 1000);


/* =========================
   2. アラームの読み込み
========================= */

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

// STEP 2のデータを引き継ぐ
let alarms = JSON.parse(
  localStorage.getItem("myAlarms") || "[]"
);

// 既存アラームは毎日繰り返しにする

alarms = alarms.map(alarm => ({
  ...alarm,
  days: Array.isArray(alarm.days)
    ? alarm.days
    : [0, 1, 2, 3, 4, 5, 6],
  sound: alarm.sound || "bell"
}));


function saveAlarms() {
  localStorage.setItem("myAlarms", JSON.stringify(alarms));
}


/* =========================
   3. 自動スクロール設定
========================= */

const autoScrollInput = document.getElementById("auto-scroll");
const settingsPanel = document.getElementById("settings-panel");

const savedAutoScroll = localStorage.getItem("autoScroll");

autoScrollInput.checked = savedAutoScroll === null
  ? true
  : savedAutoScroll === "true";

autoScrollInput.addEventListener("change", () => {
  localStorage.setItem(
    "autoScroll",
    String(autoScrollInput.checked)
  );
});

document.getElementById("settings-btn")
  .addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
  });


/* =========================
   4. 次に鳴る日時を計算
========================= */

function getNextAlarmDate(alarm, now = new Date()) {
  if (!alarm.enabled || alarm.days.length === 0) {
    return null;
  }

  const [hours, minutes] = alarm.time.split(":").map(Number);

  // 今日から7日先まで調べる
  for (let i = 0; i <= 7; i++) {
    const date = new Date(now);

    date.setDate(now.getDate() + i);
    date.setHours(hours, minutes, 0, 0);

    if (
      alarm.days.includes(date.getDay()) &&
      date > now
    ) {
      return date;
    }
  }

  return null;
}

function findNextAlarm() {
  const now = new Date();
  let nextAlarm = null;
  let nextDate = null;

  alarms.forEach(alarm => {
    const date = getNextAlarmDate(alarm, now);

    if (date && (!nextDate || date < nextDate)) {
      nextDate = date;
      nextAlarm = alarm;
    }
  });

  return nextAlarm;
}


/* =========================
   5. アラーム一覧を表示
========================= */

function renderAlarms() {
  const list = document.getElementById("alarm-list");
  list.innerHTML = "";

  alarms.sort((a, b) => a.time.localeCompare(b.time));

  const nextAlarm = findNextAlarm();

  if (alarms.length === 0) {
    list.textContent = "まだアラームがありません";
    return;
  }

  alarms.forEach(alarm => {
    const item = document.createElement("div");
    item.className = "alarm-item";
    item.dataset.id = alarm.id;

    if (!alarm.enabled) {
      item.classList.add("disabled");
    }

    if (nextAlarm && nextAlarm.id === alarm.id) {
      item.classList.add("next-alarm");
    }

    // 時刻・曜日表示
    const info = document.createElement("div");
    info.className = "alarm-info";

    const time = document.createElement("span");
    time.className = "alarm-time";
    time.textContent = alarm.time;

    const daysText = document.createElement("span");
    daysText.className = "alarm-days";

    const orderedDays = DISPLAY_DAYS.filter(day =>
      alarm.days.includes(day)
    );

    daysText.textContent = orderedDays.length === 7
      ? "毎日"
      : orderedDays.length === 0
        ? "曜日未設定"
        : orderedDays.map(day => DAY_NAMES[day]).join("・");

    info.appendChild(time);
    info.appendChild(daysText);

    // ON/OFF
    const actions = document.createElement("div");
    actions.className = "alarm-actions";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "alarm-toggle";
    toggle.checked = alarm.enabled;
    toggle.setAttribute(
      "aria-label",
      alarm.time + " のON/OFF"
    );

    toggle.addEventListener("change", () => {
      alarm.enabled = toggle.checked;
      saveAlarms();
      renderAlarms();
    });

    // 削除
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "削除";

    deleteBtn.addEventListener("click", () => {
      alarms = alarms.filter(a => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    actions.appendChild(toggle);
    actions.appendChild(deleteBtn);

    // 曜日選択ボタン
    const weekdays = document.createElement("div");
    weekdays.className = "weekday-selector alarm-weekdays";

    DISPLAY_DAYS.forEach(day => {
      const btn = document.createElement("button");
      btn.className = "weekday-btn";
      btn.textContent = DAY_NAMES[day];
      btn.type = "button";

      if (alarm.days.includes(day)) {
        btn.classList.add("selected");
      }

      btn.addEventListener("click", () => {
        if (alarm.days.includes(day)) {
          alarm.days = alarm.days.filter(d => d !== day);
        } else {
          alarm.days.push(day);
        }

        saveAlarms();
        renderAlarms();
      });

      weekdays.appendChild(btn);
    });


// アラーム音の選択欄
const soundControls = document.createElement("div");
soundControls.className = "sound-controls";

const soundSelect = document.createElement("select");
soundSelect.className = "sound-select";

const soundOptions = [
  { value: "bell", label: "ベル" },
  { value: "digital", label: "デジタル" },
  { value: "gentle", label: "やさしい音" }
];

soundOptions.forEach(option => {
  const element = document.createElement("option");
  element.value = option.value;
  element.textContent = option.label;
  soundSelect.appendChild(element);
});

soundSelect.value = alarm.sound;

soundSelect.addEventListener("change", () => {
  alarm.sound = soundSelect.value;
  saveAlarms();
});

// 試聴ボタン
const previewBtn = document.createElement("button");
previewBtn.className = "preview-btn";
previewBtn.textContent = "▶ 試聴";

previewBtn.addEventListener("click", () => {
  previewSound(alarm.sound);
});

soundControls.appendChild(soundSelect);
soundControls.appendChild(previewBtn);

item.appendChild(info);
item.appendChild(actions);
item.appendChild(weekdays);
item.appendChild(soundControls);

list.appendChild(item);

  });
}


/* =========================
   6. アラームを追加
========================= */

document.getElementById("add-alarm-btn")
  .addEventListener("click", () => {

    const input = document.getElementById("alarm-time");
    const time = input.value;

    if (!time) {
      alert("時刻を入力してください");
      return;
    }

    alarms.push({
      id: crypto.randomUUID(),
      time: time,
      enabled: true,
      days: [0, 1, 2, 3, 4, 5, 6],
     sound: "bell"
    });

    saveAlarms();
    renderAlarms();
  });


/* =========================
   7. 起動時の自動スクロール
========================= */

function scrollToNextAlarm() {
  if (!autoScrollInput.checked) {
    return;
  }

  const nextAlarm = findNextAlarm();

  if (!nextAlarm) {
    return;
  }

  const items = document.querySelectorAll(".alarm-item");

  const target = Array.from(items).find(
    item => item.dataset.id === String(nextAlarm.id)
  );

  if (target) {
    target.scrollIntoView({
      behavior: "instant",
      block: "center"
    });
  }
}

// 初回表示
renderAlarms();

// 描画が完了してからスクロール
requestAnimationFrame(() => {
  requestAnimationFrame(scrollToNextAlarm);
});

/* =========================
   8. アラーム音の再生
========================= */

let audioContext = null;
let soundTimer = null;
let activeAlarm = null;
let lastCheckedMinute = "";

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
  }

  return audioContext;
}

// 電子音を1回鳴らす
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

// 音の種類によって再生方法を変更
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

// 試聴
function previewSound(type) {
  getAudioContext().resume();
  playSound(type);
}

// アラーム開始
function startRinging(alarm) {
  if (activeAlarm) return;

  activeAlarm = alarm;

  document.getElementById("ringing-time").textContent =
    alarm.time;

  document.getElementById("ringing-panel").hidden = false;

  playSound(alarm.sound || "bell");

  soundTimer = setInterval(() => {
    playSound(alarm.sound || "bell");
  }, 2000);
}

// アラーム停止
function stopRinging() {
  clearInterval(soundTimer);
  soundTimer = null;
  activeAlarm = null;

  document.getElementById("ringing-panel").hidden = true;
}

document.getElementById("stop-alarm-btn")
  .addEventListener("click", stopRinging);


/* =========================
   9. アラーム時刻の監視
========================= */

function checkAlarms() {
  const now = new Date();

  const currentTime =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  const currentMinute =
    now.toDateString() + " " + currentTime;

  // 同じ分に何度も鳴らさない
  if (lastCheckedMinute === currentMinute) return;
  lastCheckedMinute = currentMinute;

  const today = now.getDay();

  const matchingAlarm = alarms.find(alarm =>
    alarm.enabled &&
    alarm.time === currentTime &&
    alarm.days.includes(today)
  );

  if (matchingAlarm) {
    startRinging(matchingAlarm);
  }
}

// 1秒ごとにアラーム時刻を確認
setInterval(checkAlarms, 1000);
