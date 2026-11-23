# My Alarm Update 05.7.5 — Oil pooling / viscous merger

Base: 05.7.4. WebGL renderer, shell geometry and timer hooks are preserved.

- Droplets that reach the lower reservoir become part of one connected oil pool, rather than stacking as independent beads.
- Pool level is determined by completed droplet arrivals, itself based on the timer's authoritative progress. Pausing and resetting therefore keep the liquid in sync with the clock.
- Added subtle meniscus, surface oscillation and flowing pink/purple shading.
- Only `timers/oil/oil-webgl.js`, `service-worker.js` (cache name), and this changelog are changed.

Notes: Surface union is a visual shader approximation, not a physical fluid solver. Browser/Android rendering not guaranteed until tested in-device.
