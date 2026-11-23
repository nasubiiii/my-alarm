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

