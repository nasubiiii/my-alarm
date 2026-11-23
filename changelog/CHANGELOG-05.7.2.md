# Update 05.7.2 — Oil WebGL scene mount repair

- The scene is now invalidated and rebuilt when `oil-webgl.js` loads after the earlier SVG scene.
- Restored WebGL scene activation without changing the 05.7 fragment shader, droplet trajectories, timer logic, or other timer modes.
- A Canvas fallback also replaces any stale SVG when WebGL initialization fails.
- Console diagnostic: `window.myAlarmOilRendererStatus` (`webgl-active`, `canvas-fallback`, etc.).
- Bumped the service-worker cache name.

## Verification
JavaScript syntax, asset paths, archive integrity, and headless Chromium rendering of the WebGL canvas were checked. Android-device performance was not tested.
