# My Alarm Update 03.0

## Added
- Updated 192/512px app icon and manifest assets.
- Bundled four time-of-day scenic illustrations for the app background; toggle in appearance settings.
- City-specific vector landmark silhouettes for 11 selected cities, changing color by local hour; toggle in appearance settings. Other cities use a generic time-dependent gradient.
- Oil-motion visual timer with reduced-motion support.
- Four-step first-run onboarding, skippable and replayable in Other.
- Includes 02.7 Android-friendly custom city picker.

## Notes and limitations
- Backgrounds are original illustrations, **not photographic images**; sunrise/sunset is approximated by fixed local-hour ranges rather than solar calculations.
- Browser timers/alarms cannot guarantee sound while the app is closed, screen is off, or output routing to headphones. These require Android native work.
- Additional visual timer modes, custom analog clock presets and granular feature walkthroughs remain future work.
- Preserve existing localStorage data; take a backup before updating.
- Replace the project files and add `scenes/` and `icons/`.
