# Update 03.2

- Fixed scenic images obscured by nearly opaque light theme gradient; added theme-appropriate overlays.
- Fixed oil drop animation restarting on every 100ms timer tick due to className reassignment.
- Moved shared timer presets inside each timer detail view; launching a preset uses the currently selected timer visual.
- Existing 03.1 presets remain in storage; the old visual type setting is ignored for launching.
- Bumped service worker cache to v32.

Manual PC/Android tests still required.
