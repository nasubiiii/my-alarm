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

// All deferred modules must finish loading before the first cross-module render.
// In particular, updateClock() needs formatAppDate() from world-clock.js.
document.addEventListener('DOMContentLoaded', () => {
  applySettings();
}, { once: true });

