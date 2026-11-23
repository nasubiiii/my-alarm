# Update 05.7.4 — Oil WebGL viscous droplets

Based on the working Update 05.7.3. Oil WebGL shader only.

- Keeps the original countdown-derived trajectory and renderer activation lifecycle.
- Uses varying droplet radii and shape deformation during movement.
- Renders oil in the upper reservoir progressively instead of crowding the top with unreleased spheres.
- Adds smooth distance-field blending where droplets approach, plus surface glow and refined specular shading.
- Keeps container silhouette, shared timer functions, all other visual timers and app features unchanged.
- Service worker cache version bumped for deployment.
- Validate on Android and desktop; this is an artistic 2.5D fluid model, not volumetric ray tracing.
