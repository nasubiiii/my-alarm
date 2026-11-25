# My Alarm — 現行ソースの構成と開発手順

[設計書](DESIGN.md) に機能仕様、[ロードマップ](ROADMAP.md) に作業順、[テストチェックリスト](TEST_CHECKLIST.md) に動作確認手順を記載しています。

## フォルダとファイル

| パス | 役割 |
|---|---|
| `index.html` | 5タブとサブ画面、ダイアログ、CSS・JS・Manifestの入口 |
| `manifest.json`、`service-worker.js` | PWAの名前・起動設定・アイコン、事前キャッシュと取得 |
| `css/base.css` | 全体の配色、時計、各画面のレイアウトと共通部品 |
| `css/timer-gallery.css`、`css/timer-detail.css`、`css/fluid-timers.css` | 種類選択、詳細表示、液体SVGとオイルCanvasのスタイル。記載順に `base.css` の後に読み込む |
| `scenes/` | 朝昼夕夜のSVGと11都市のランドマーク素材 |
| `icons/` | PWAの192px・512px PNG |
| `.vscode/extensions.json` | VS Codeの推奨拡張設定 |
| `changelog/`、`CHANGELOG-OIL-05.7.md` | 版ごとの開発記録と05.7のオイル描画復元記録 |
| `DESIGN.md`、`README-MODULES.md`、`AGENTS.md`、`ROADMAP.md`、`TEST_CHECKLIST.md` | 設計、技術構成、AI作業ルール、計画、検証記録 |

標準のHTML・CSS・JavaScriptを使います。外部ライブラリやビルド工程の定義はありません。時刻と地域別表示は `Date` と `Intl.DateTimeFormat`、音の生成はWeb Audio、描画はSVG・CSS・WebGL・Canvas 2Dです。

## JavaScriptの読み込み順と依存関係

以下は `index.html` の `defer` 順です。通常スクリプトが変数を共有する構成です。`defer` はHTMLの解析を待ち、記載順に実行します。

| 順 | ファイル | 役割と主な依存 |
|---|---|---|
| 1 | `js/alarm.js` | `$`（要素IDから画面要素を取得）、`alarms`、`showScreen`、`getNextAlarmDate`、`getAudioContext`、時刻監視・鳴動、Service Worker登録を提供。描画で設定や翻訳を参照。 |
| 2 | `js/settings.js` | `appSettings`、`t`、`applyLanguage`、テーマ・設定保存。初期設定適用は `DOMContentLoaded` まで待ち、後から定義される日付書式を利用。 |
| 3 | `js/clock-controls.js` | 表示形式・時刻形式・時計専用モード。設定保存とアラーム側の描画を呼ぶ。 |
| 4 | `js/world-clock.js` | 世界時計と都市、バックアップ、グループ基礎処理、予定。共通の `L`、`el`、`action`、`readExtra`、`storeExtra`、`formatAppDate` を提供。都市一覧の初回描画は後段で読み込まれるドラッグ処理を待つ。 |
| 5 | `timers/timer-core.js` | `timer`、`timerNames`、`duration`、`tickTimer`。世界時計ファイルの共通関数、後段のダイアログと終了音を使用。 |
| 6 | `js/stopwatch-and-ui.js` | 計時・ラップ・履歴・ナビ装飾。タイマーの `duration` を再利用し、グループ描画と翻訳を拡張。 |
| 7 | `js/ui-enhancements.js` | `appDialog`、`bindCityDrag`、グループメンバー編集、`playTimerChime`、風景と100msの共通更新。世界時計の `tickCities` を拡張。 |
| 8 | `timers/timer-presets.js` | プリセットと初回ガイド、背景の定期更新。タイマー状態・設定・翻訳の共有関数を参照。 |
| 9 | `timers/timer-scenes.js` | `visualTimerScenes` と基本シーンを定義し、`tickTimer` を拡張。 |
| 10 | `timers/fluid-timers.js` | 液体砂時計のSVG粒子を更新。タイマーの計時とシーンを参照。 |
| 11 | `timers/oil/oil-webgl.js` | オイルのWebGLシーンを組み込み、`tickTimer` に描画同期を追加。 |
| 条件付き | `timers/oil/oil-canvas.js` | WebGLの初期化・描画プログラム準備が失敗した場合に動的に読み込むCanvas 2D代替。 |

## タイマーの計時と描画

- `timer` の終了予定時刻・残り時間・合計時間を共通の計時元にします。通常はSVGの進捗リング、砂時計はSVGの砂量と流れ、液体砂時計はSVGの容器・粒子・溜まりで表現します。
- オイルはWebGLの描画プログラムでガラス・液滴・着水・液面を表現します。05.7.9では開始前・一時停止中・終了後に連続描画を止め、必要な状態変化やリサイズ等で静止画を更新する処理があります。
- 開発者ツールで `window.myAlarmOilRendererStatus` を確認できます。WebGLの診断版は05.7.9で、描画後に `state` と `renderCount` を参照できます。Canvas代替の診断版は05.7.2で、描画制御は別経路です。現行の実GPU・代替・モーション低減動作は未検証です。

## 保存データ

| 保存先・キー | 内容 |
|---|---|
| localStorage `myAlarms`、`myAlarmGroups` | アラーム配列とグループ配列。所属はアラームの `groupId` で管理 |
| localStorage `myAlarmSettings`、`autoScroll` | 外観・言語・時計の基本設定、自動スクロール |
| localStorage `myAlarmCities`、`myAlarmWorldClockDisplay` | 登録都市と世界時計の現在地カードの表示形式 |
| localStorage `myAlarmV3Settings`、`myAlarmWelcomeSeen` | 風景の設定、初回ガイドの終了状態 |
| localStorage `myAlarmTimer`、`myAlarmTimerPresets` | 表示タイプ、合計・残り時間・終了予定時刻、名前付きの設定時間 |
| localStorage `myAlarmStopwatch` | 開始時刻、累計、ラップ、履歴 |
| sessionStorage `myAlarmActiveTab` | 同じブラウザーセッションの最終タブ |

JSONバックアップv1はアラーム、グループ、基本設定、自動スクロールを保存します。スヌーズの予約と鳴動中の情報はメモリー上にあります。保存形式を変更する際は旧データの読み込みと復元を確認してください。

## Service Workerとローカル起動

1. VS Codeで既存のHTTPサーバー（利用可能ならLive Serverなど）を使い、プロジェクトの `index.html` を開きます。
2. PWAの検証ではlocalhostまたはHTTPSを使い、開発者ツールでService Workerの状態を確認します。ファイルを直接開く方法はPWAの検証には使いません。
3. オンラインで一度読み込んだ後、[テストチェックリスト](TEST_CHECKLIST.md) に沿って更新とオフラインを確認します。別のポートやURLでは同じ保存データが見えない場合があります。

現行キャッシュ名は `my-alarm-mod57-oil-static-0579` です。`APP_FILES` をインストール時に保存し、GETは通信を試して失敗したときにキャッシュを参照します。成功応答でキャッシュを更新する仕組みはありません。起動に必要な素材を変更する際は一覧のパス、キャッシュ名、旧版・更新後のオフライン動作を合わせて確認します。

## 技術的な課題と変更時の注意

- 鳴動の取りこぼし、破損データ、複数の保存キーを更新する復元は [DESIGN.md](DESIGN.md) の既知の問題を参照します。Web版はページ内の動作を安定化し、画面OFFや終了中の確実な鳴動はAndroidの技術検証で扱います。
- 共通更新は100ms周期です。非表示画面や多数都市の負荷、WebGL／Canvasの差は測定してから判断します。Service Workerの旧キャッシュ削除範囲とHTTPエラー時の挙動も確認対象です。
- 画面ID、読み込み順、共有関数を変えると関連画面に影響します。呼び出し元、日英、ライト／ダーク、PC／スマートフォンを確認します。表示の変更と計時の変更は影響範囲を確認し、オイルは05.7系を基準に検証します。

---

## 付録　Update 05.7 モジュール化時の記録

以下は05.7分割時点の説明です。ファイルの役割・キャッシュ名・導入手順・検証結果は当時の記録です。

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

## UIトラックの変更境界
Aの主対象はcss/base.css。timer-gallery.cssとtimer-detail.cssは外側UIと描画が混在するためセレクタ単位で分離して検討する。fluid-timers.cssとtimers/oil/、fluid-timers.js、timer-scenes.jsは描画保護対象。WebGLとCanvasはgetBoundingClientRectで描画寸法を取得するため、親のサイズ変更も回帰確認する。CSS追加・分割時はindex.htmlとService Workerのキャッシュ一覧・更新を確認する。A1では実行ファイルを変更しない。

### A1基準画像（2026-11-25）

保存先はプロジェクトと並ぶ開発用フォルダ `../my-alarm-dev/a1-baseline-2026-11-25/` です。リポジトリおよびアプリの配信対象外で保管します。下位の `light-ja`、`dark-ja`、`light-en`、`dark-en` に、同じ番号のPNGが各22枚あります。

| ファイル番号 | 内容 |
|---|---|
| 01～04 | データ入りアラーム一覧・編集、7日間予定、データ入りグループ管理 |
| 05～07 | 世界時計（東京・ロンドン・ニューヨーク）、都市検索、時計専用モード |
| 08～13 | タイマー選択、通常、砂時計、液体砂時計、オイル、プリセット一覧 |
| 14～16 | ラップ付きストップウォッチ、履歴、設定 |
| 17～22 | グループ追加・編集、プリセット編集、初回ガイド、グループ削除確認、設定展開状態 |

WindowsのChrome 157.0.8103.79（ヘッドレス）、`file://`、390×800 CSS px、DPR 1、Asia/Tokyoで撮影しました。一時プロファイルの検証用データを使用し、縦に長い画面は先頭からビューポート内を記録しています。前回取得した320～1280pxの計算済み寸法は数値の基準として使用します。比較時は同じ表示条件・データ・スクロール位置を使い、現在時刻・日付・時間帯背景の自然な差を考慮します。

390px幅の描画基準はステージ328×260px、通常・砂時計SVG各290×260px、液体SVG320×255px、オイルCanvas320×260pxです。オイルの撮影状態は開始前です。画像は表示基準であり、停止・再開・終了の確認結果は別に記録します。

### A2の共通CSSと比較資料

A2の変更は `css/base.css` です。`:root` の `--ui-*` が形状・余白・文字サイズ・影を定義し、色は引き続き既存テーマ変数を参照します。共通フォーカスは `:focus-visible` で表示します。ナビの選択状態は既存の `aria-current` を参照します。アラーム一覧と描画領域の個別ルールは基準を維持しています。

保全したCSSは `../my-alarm-dev/a2-before/base.css`、改修後の画像は `../my-alarm-dev/a2-after-2026-11-25/` にあります。A1と同じ4フォルダ・同じファイル名の88枚を比較に使えます。画像と保全ファイルは配信対象外です。UI工程名はA2、オイルの診断バージョンは05.7.9です。Service Workerのキャッシュ定義は今回変更していません。PWAの更新・オフライン検証は製品安定化工程で扱います。

### B1の基準と静的比較（2026-11-25）

- 現行の実行ファイル・素材36点を、配信対象外の `../my-alarm-dev/oil-before-2026-11-25/` に保全し、元ファイルとSHA-256が一致することを確認しました。05.7の比較候補はリポジトリ外の `my-alarm (5).zip`（同梱履歴に05.7描画復元版、キャッシュ名 `my-alarm-mod57-oil-restored-v3`）です。ZIPは読み取りで確認しました。
- 両版は平面上の角丸の輪郭、18個の液滴候補、進捗ベースの落下、青系の液色、DPR上限1.75を共有します。現行版の液滴半径は旧版より大きく、変形・滑らかな輪郭の結合・下部への蓄積・着水反応と、停止時の静止画制御が実装されています。見た目や負荷に与える差は同条件での動画・端末比較が必要です。
- 現行は色のグラデーションと輪郭を一枚の平面に描く方式です。固定視点では、液滴の動き、厚みによる透過色、壁の内外の境界と反射を見直す余地があります。真正面以外の奥行き、背景の正確な屈折、透明物同士の多重反射まで必要な段階で、背景合成や3D材料方式を候補にします。
- 比較時は開始前・同一進捗・着水前後・終了時を同じ幅とテーマで撮影します。液滴の離脱前後の位置、液面までの到達点、壁と液面のハイライト、輪郭の読みやすさを確認します。低価格帯を含むAndroid実機でフレーム間隔・発熱・電池消費・代替描画も比較し、方式変更やライブラリ導入は別途承認を得ます。
