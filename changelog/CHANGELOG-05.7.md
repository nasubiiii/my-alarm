# Update 05.7 — Oil motion WebGL renderer

- Added `oil-webgl.js`, a dependency-free GPU shader rendering glossy volumetric droplets, curved glass, reflections, cyan reservoir and progress-linked fluid distribution.
- Preserved `oil-canvas.js` as fallback when WebGL is unavailable or shader compilation fails.
- Oil mode only. S-shaped liquid hourglass, other timer modes, alarm, world clock, stopwatch and settings unchanged.
- Pauses rendering when hidden or paused, caps pixel ratio, honors reduced-motion, uses existing timer as sole clock.
- Bumped service-worker cache to v57.
- Verified JavaScript syntax and ZIP structure. Real-device visual appearance, GPU performance, and WebGL compatibility require browser testing.
