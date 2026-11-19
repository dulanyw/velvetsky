# Prairie Flight

A quiet, browser-only flight viewpiece, designed for a second screen.

## Agreed first prototype
- Lightweight HTML, vanilla JavaScript, CSS, and procedural graphics; no external dependencies unless justified.
- Fictional Midwestern farmland: grid-based fields with varied crops, lakes, and small cities.
- Golden hour initially; time of day configurable and fixed by default.
- Controls for cloud amount, cloud type, altitude, time of day, and cruising speed.
- Constant, smooth forward flight: no sway, banking, or camera shake.
- Drag to look; retain viewing direction. Double-click or a button returns forward.
- Flying apparatus mostly behind the viewer, becoming visible toward the sides.
- No audio by default.
- Dark, collapsible controls; immersive default view.
- Plan camera and rendering boundaries for future WebXR support; VR is a later milestone.

## Implementation direction
Use a procedural WebGL scene with explicit camera, scene, rendering, and controls modules. Begin with a conservative rendering resolution and quality budget. Prefer convincing light, atmospheric depth, and stable motion over dense geometry. Terrain generation must be deterministic and continuous during travel.

## Development
Follow style.md. Keep tests and supporting files in subfolders. Use Git from the start. Preview uses user-approved port 8467; restart the server on that same port following UI changes.

Run `node server.cjs`, then open http://127.0.0.1:8467. No package installation or build is needed. Node is used only to serve static files locally; the visualization runs entirely in the browser using WebGL 2.

Drag to look, double-click to recenter, and press H to hide the interface. The controls also offer pause, fullscreen, and automatic smoothness mode plus three fixed rendering resolutions. Flight renders on display refresh without the old 30 FPS frame gate, integrates travel from elapsed time, and pauses travel when the tab is hidden. Auto mode decreases resolution after sustained slow windows and increases it only with sustained GPU headroom, using optional asynchronous WebGL GPU timers. The settings panel reports measured animation-frame cadence; actual presentation and achievable FPS depend on the device and scene. Shader compilation is excluded from automatic tuning.

Altitude displays feet and reaches 20,000 ft (6,096 m); rendering keeps metre units internally. Cruising speed reaches 500 km/h. Sunset colours vary with sun elevation and viewing bearing, with warm directional cloud lighting, cooler shadowed interiors, and an elevation-dependent twilight cutoff. These are inexpensive artistic lighting approximations, not a full atmospheric scattering simulation. Time remains fixed until adjusted.

Cloud character includes Storm towers (cumulonimbus): broad overlapping convective masses, dark bases, thick asymmetric anvil canopies, and surrounding smaller cumulus. Storms use an expanded vertical render bound and longer shadow samples while retaining the same capped adaptive traversal. Coverage controls storm occupancy/spread and joins the lower bases at high coverage. This models their appearance, without rain, lightning, turbulence, or weather dynamics. Cloud-specific shader programs are compiled on demand and cached; the first selection of storms may briefly pause while its program compiles. Target-hardware GPU profiling remains outstanding.

Stars emerge progressively through twilight, with varied brightness, warm/cool colours, and reduced visibility toward the horizon. Three independently seeded stellar populations cluster around a tilted Milky Way band with a brighter central bulge, mottled unresolved light, and dark absorbing dust lanes. Moonlight reduces its contrast. The procedural star field is fictional, not a catalogue of real constellations. Moon options are Off (default), Crescent, Half, and Full, with an illustrative nightly arc, textured disc, and subtle cloud/water illumination. Phases are selected artistically rather than calculated from a calendar. Ground and clouds occlude celestial objects. Only functional controls remain on the view; press H to hide them.

Sun and Moon use a shared base angular diameter of approximately 0.53°. The default 6× display scale enlarges them for monitor viewing; 1× and 3× are also available. Solar eclipse mode offers total and annular geometry with a fixed progress slider (50% is central alignment), analytically calculated disc overlap, lighting dimming, and a totality-only corona. Enabling eclipse mode points at the Sun and selects 16:00 if the current time is outside the useful daylight range. This is a local illustrative eclipse, not an ephemeris, moving ground-shadow simulation, or real event prediction.

Run `node tests/performance.test.cjs` for refresh-independent movement and adaptive-resolution policy checks. Run `node tests/server.test.cjs` with the server running. Syntax checks: `node --check src/main.js`, `node --check src/shaders.js`, and `node --check server.cjs`.

## Current limitations
This is a visual rough-in. Ground has no local relief but uses an analytic Earth-radius sphere intersection for the horizon; crops and towns remain procedural surface detail. Distance fog is disabled; subpixel terrain detail averages into terrain material colours. The sun is a crisp screen-projected disc with cloud occlusion. Cloud geometry follows curved planetary shells to their geometric horizon, with stable radial height evaluation and progressively coarser distant samples. There is no fixed 28 km cutoff. The ray budget remains capped at 192 samples; distant detail is an approximation and can show sampling artifacts. The apparatus is represented by peripheral suspension lines. Cumulus uses world-anchored billow volumes, adaptive traversal, and directional self-shadowing; cirrus and stratus retain the simpler noise model. VR, audio, real locations, persistent settings, and detailed flight hardware are not implemented. Actual resource use needs profiling on the target machine; the quality selector controls resolution rather than guaranteeing a GPU budget. No network assets, telemetry, or external dependencies are used.
