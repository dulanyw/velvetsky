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

Drag to look, double-click to recenter, and press H to hide the interface. The controls also offer pause, fullscreen, and three rendering resolutions. The default targets 30 frames per second with a reduced pixel budget and pauses travel when the tab is hidden.

Altitude displays feet and reaches 10,000 ft (3,048 m); rendering keeps metre units internally. Cruising speed reaches 500 km/h. Sunset colours vary with sun elevation and viewing bearing, with warm directional cloud lighting, cooler shadowed interiors, and an elevation-dependent twilight cutoff. These are inexpensive artistic lighting approximations, not a full atmospheric scattering simulation. Time remains fixed until adjusted.

Stars emerge progressively through twilight, with varied brightness, warm/cool colours, and reduced visibility toward the horizon. The procedural star field is fictional, not a catalogue of real constellations. Moon options are Off (default), Crescent, Half, and Full, with an illustrative nightly arc, textured disc, and subtle cloud/water illumination. Phases are selected artistically rather than calculated from a calendar. Ground and clouds occlude celestial objects. Only functional controls remain on the view; press H to hide them.

Run `node tests/server.test.cjs` with the server running. Syntax checks: `node --check src/main.js`, `node --check src/shaders.js`, and `node --check server.cjs`.

## Current limitations
This is a visual rough-in. Ground has no local relief but uses an analytic Earth-radius sphere intersection for the horizon; crops and towns remain procedural surface detail. Distance fog is disabled; subpixel terrain detail averages into terrain material colours. The sun is a crisp screen-projected disc with cloud occlusion. Cloud geometry still uses a local planar layer with a bounded march distance. The apparatus is represented by peripheral suspension lines. Cumulus uses world-anchored billow volumes, adaptive traversal, and directional self-shadowing; cirrus and stratus retain the simpler noise model. VR, audio, real locations, persistent settings, and detailed flight hardware are not implemented. Actual resource use needs profiling on the target machine; the quality selector controls resolution rather than guaranteeing a GPU budget. No network assets, telemetry, or external dependencies are used.
