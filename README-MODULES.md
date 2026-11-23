# My Alarm — Update 05.7 モジュール化版

## 方針
Update 05.7 の描画・タイマー・画面機能のコードを、実行順序を維持したまま機能別ファイルに分割しました。
**ビジュアルタイマーの描画アルゴリズムや保存キーは変更していません。**
既存の classic script のグローバル依存を保つ互換分割であり、完全な ES Modules 化ではありません。

## ファイル
- `js/alarm.js`：アラーム、通知音、グループの基礎処理
- `js/settings.js`：設定、テーマ、翻訳
- `js/clock-controls.js`：時計表示の設定操作
- `js/world-clock.js`：バックアップ処理、世界時計、都市選択（旧コードの結合を維持）
- `timers/timer-core.js`：タイマー計時・操作
- `js/stopwatch-and-ui.js`：ストップウォッチ、ナビ・表示更新
- `js/ui-enhancements.js`：追加UI、ダイアログ、背景制御
- `timers/timer-presets.js`：プリセット、追加設定
- `timers/timer-scenes.js`：標準・砂時計・液体・オイルの基本シーン
- `timers/fluid-timers.js`：液体砂時計などの流体演出
- `timers/oil/oil-webgl.js`：**05.7 WebGL描画**（そのまま）
- `timers/oil/oil-canvas.js`：WebGL不可時の代替描画
- `css/base.css`：既存の基本スタイル
- `css/timer-gallery.css`：ビジュアルタイマー選択画面
- `css/timer-detail.css`：タイマー詳細画面
- `css/fluid-timers.css`：流体タイマー固有スタイル

## 今後のオイルタイマー改修
主に `timers/oil/oil-webgl.js` を編集してください。
ただし共有の `timer-scenes.js` や `timer-core.js` にも依存しているため、**影響ゼロを保証するものではありません**。
05.7の挙動を維持するため、現在はグローバル関数の上書き・旧コードの相互依存も残しています。

## 導入
1. 現在の `my-alarm` フォルダを丸ごとバックアップ。
2. ZIP内の `my-alarm` を**フォルダごと置き換える**。古い `script.js` / `style.css` が残っていても新HTMLは読み込みません。
3. VS Code の Live Server など HTTP 経由で動作確認。
4. アラーム、世界時計、タイマー4種、ストップウォッチ、設定、保存データを確認後にGitHubへ反映。
5. Service Worker のキャッシュ名は `my-alarm-mod57-v1` に更新済み。

## 検証
- 分割したJavaScript/CSSを連結すると元の05.7と完全一致することを確認。
- JavaScript構文チェック、Service Worker参照ファイルの存在、ZIP整合性を確認。
- ブラウザ自動操作は実行環境のアクセス制限により未確認。Android実機も未確認。
