# 05.7 WebGL 描画復元版

- `timers/oil/oil-webgl.js`：元の Update 05.7 WebGL シェーダーを正確に復元。モジュール化されたフォールバックのパスのみ維持。
- `service-worker.js`：キャッシュ名を変更。
- それ以外のソースは前回配布版から変更なし。
- WebGL非対応やシェーダーコンパイル失敗時には既存のCanvas描画へ切替。実機でのWebGL動作は未検証。
