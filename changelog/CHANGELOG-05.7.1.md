# Update 05.7.1 — モジュール化の初期化順・背景パス修正

基準：ユーザー提供の my-alarm (5).zip（現在版）。

- `js/settings.js`: 日付フォーマット関数が読み込まれてから初期設定を適用。
- `js/world-clock.js`: 並べ替え処理 `bindCityDrag()` が読み込まれてから都市一覧の初回描画を実行。
- `js/ui-enhancements.js`: 風景SVGをGitHub Pagesやローカルのアプリ基準URLから絶対URL化し、`css/base.css` からの相対解決ミスを回避。
- `service-worker.js`: キャッシュ名更新。
- `timers/oil/oil-webgl.js` / `timers/oil/oil-canvas.js`: **変更なし**。
- 既存データの保存キーやアラーム・タイマーの挙動、画面構成：変更なし。

**要注意**: `scenes/` フォルダもGitHubへ公開してください。今回の修正は描画エンジンやデザインの改修ではありません。
