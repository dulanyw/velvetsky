# Velvet Sky

A peaceful, browser-only cloudscape for drifting through the sky, designed for a second screen and immersive VR.

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
- Stationary WebXR preview with stereo cameras; wrist controls and immersive flight are later milestones.

## Implementation direction
Use a procedural WebGL scene with explicit camera, scene, rendering, and controls modules. Begin with a conservative rendering resolution and quality budget. Prefer convincing light, atmospheric depth, and stable motion over dense geometry. Terrain generation must be deterministic and continuous during travel.

## Development
Follow style.md. Keep tests and supporting files in subfolders. Use Git from the start. Preview uses user-approved port 8467; restart the server on that same port following UI changes.

Run `node server.cjs`, then open http://127.0.0.1:8467. No package installation or build is needed. Node is used only to serve static files locally; the visualization runs entirely in the browser using WebGL 2.

Drag to look, double-click to recenter, and press H to hide the interface. Power saving is the default: deadline-paced 30 FPS, a resolution cap of 0.65� at device pixel ratio 1, 144 primary cloud traversal samples, larger traversal steps, and two shadow-density probes with a reused surface-light sample. The single Rendering menu combines power saving with Smooth auto, reduced, balanced, and fine-detail options. Smooth mode renders on display refresh with the original lighting and 192-sample budget. Both modes integrate travel from elapsed time. Paused flights and zero-speed scenes with frozen time render only after input or resize; hidden tabs stop scheduling entirely.

Auto resolution decreases after sustained overload. Smooth mode can increase resolution with sustained GPU headroom, using optional asynchronous WebGL GPU timers; power saving never automatically increases its resolution to fill unused GPU capacity. The settings panel reports submitted-frame cadence, or Paused/Still when idle. Actual achievable FPS and energy savings depend on the device and scene. Shader compilation is excluded from automatic tuning.

Altitude displays feet and reaches 20,000 ft (6,096 m); rendering keeps metre units internally. Cruising speed reaches 500 km/h. Sunset colours vary with sun elevation and viewing bearing, with warm directional cloud lighting, cooler shadowed interiors, and an elevation-dependent twilight cutoff. These are inexpensive artistic lighting approximations, not a full atmospheric scattering simulation. Time starts frozen. Time progression selects Frozen or Running, and Time rate sets 0.1–120 simulated minutes per real second (default 1). The clock wraps midnight, pauses with flight, and stops in hidden tabs; a running clock keeps drawing even at zero cruising speed. Initial altitude is 2,900 m (9,514 ft), just above the usual default cumulus tops.

Cloud character includes Storm towers (cumulonimbus): broad overlapping convective masses, dark bases, thick asymmetric anvil canopies, and surrounding smaller cumulus. Storms use an expanded vertical render bound and longer shadow samples while retaining the same capped adaptive traversal. Coverage controls storm occupancy/spread and joins the lower bases at high coverage. This models their appearance, without rain, lightning, turbulence, or weather dynamics. Cloud-specific shader programs are compiled on demand and cached; the first selection of storms may briefly pause while its program compiles. Target-hardware GPU profiling remains outstanding.

Stars emerge progressively through twilight, with varied brightness, warm/cool colours, and reduced visibility toward the horizon. Three independently seeded stellar populations cluster around a tilted Milky Way band with a brighter central bulge, mottled unresolved light, and dark absorbing dust lanes. Moonlight reduces its contrast. The procedural star field is fictional, not a catalogue of real constellations. Moon options are Off (default), Crescent, Half, and Full, with an illustrative nightly arc, textured disc, and subtle cloud/water illumination. Phases are selected artistically rather than calculated from a calendar. Ground and clouds occlude celestial objects. Only functional controls remain on the view; press H to hide them.

Sun and Moon use a shared base angular diameter of approximately 0.53°. A fixed 6× display scale enlarges them for monitor viewing. Solar eclipse mode offers total and annular geometry with a fixed progress slider (50% is central alignment), analytically calculated disc overlap, lighting dimming, and a totality-only corona. Enabling eclipse mode points at the Sun and selects 16:00 if the current time is outside the useful daylight range. This is a local illustrative eclipse, not an ephemeris, moving ground-shadow simulation, or real event prediction.

Clouds composite front to back. Cumulus and storm rays that remain transparent can now continue for up to four times the primary budget (576 iterations in power saving, 768 in Smooth), retaining the original step spacing, density, geometry and lighting. Rays stop early when opaque or outside the shell. This addresses inspected foreground-edge cutouts caused by exhausting the old budget; extreme paths can still hit the expanded cap. Continuation can increase GPU work in transparent, long views; automatic resolution remains active. The earlier fringe-acceleration experiments remain reverted. For inspection, append `?cloudDebug` to the preview URL: red marks unfinished transparent rays, green opaque rays, blue completed shell rays. The inspected near-layer case had red background/edge rays before continuation and none afterward; this is not exhaustive scene coverage.

Run `node tests/performance.test.cjs` for refresh-independent movement and adaptive-resolution policy checks. Run `node tests/server.test.cjs` with the server running. Syntax checks: `node --check src/main.js`, `node --check src/shaders.js`, and `node --check server.cjs`.

Ground uses 1.6 km agricultural sections subdivided into whole, half, or quarter parcels, with muted late-summer crop colours, thin section roads, broad crop variation, wooded patches, and vegetated irregular lake banks. All are procedural surface colours on the existing sphere: no added geometry, terrain marching, texture downloads, or cloud queries. Ground noise evaluation count is unchanged; crop-row sine stripes were removed. Footprint filtering suppresses subpixel field boundaries, roads, and roofs, with broad material colours at the horizon. This is a visual approximation, not a land-use model. Target-device GPU timing comparisons remain outstanding.

## VR and GitHub Pages

The first WebXR preview renders a stationary scene with per-eye projections and
headset pose tracking. Choose the scene in desktop settings, then select Enter VR
in a supported headset browser. Flight and time freeze during immersion, and the
desktop state resumes on exit. All settings will eventually move to a wrist
appliance; this milestone has no in-VR controls or floating panel. No eye tracking
is requested or used. Real Quest 3 and Steam Frame validation is outstanding.

`node tools/package-site.cjs` creates a browser-only dist/ artifact for static HTTPS
hosting. A manual GitHub Pages workflow is included; no deployment has been run.
Relative paths support repository subpaths. See [VR testing and publishing](docs/vr-testing.md)
for setup, current limitations and the headset validation procedure.

Run `node tests/camera.test.cjs`, `node tests/xr.test.cjs` and
`node tests/site.test.cjs` for stereo math, mocked session lifecycle and Pages
asset/import checks. These complement the existing performance and preview-server
checks; they do not establish physical headset performance or comfort.

## Current limitations
This is a visual rough-in. Ground has no local relief but uses an analytic Earth-radius sphere intersection for the horizon; crops and towns remain procedural surface detail. Distance fog is disabled; subpixel terrain detail averages into terrain material colours. The sun is a crisp disc with cloud occlusion; desktop uses screen projection and VR uses a world-anchored angular disc. Cloud geometry follows curved planetary shells to their geometric horizon, with stable radial height evaluation and progressively coarser distant samples. There is no fixed 28 km cutoff. The primary ray budget is 144/192 iterations, with bounded fourfold continuation for shaped clouds; distant detail is an approximation and can show sampling artifacts. The desktop apparatus is represented by peripheral suspension lines, which are omitted in the initial VR preview. Cumulus uses world-anchored billow volumes, adaptive traversal, and directional self-shadowing; cirrus and stratus retain the simpler noise model. VR wrist controls, immersive flight, audio, real locations, persistent settings, and detailed flight hardware are not implemented. Actual resource use needs profiling on the target machine; the quality selector controls resolution rather than guaranteeing a GPU budget. No network assets, telemetry, or external dependencies are used.
