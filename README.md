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

Run `node tests/server.test.cjs` with the server running. Syntax checks: `node --check src/main.js`, `node --check src/shaders.js`, and `node --check server.cjs`.

## Current limitations
This is a visual rough-in. Ground relief is flat, crops and towns are procedural surface detail, and the apparatus is represented by peripheral suspension lines. Cumulus uses world-anchored billow volumes, adaptive traversal, and directional self-shadowing; cirrus and stratus retain the simpler noise model. VR, audio, real locations, persistent settings, and detailed flight hardware are not implemented. Actual resource use needs profiling on the target machine; the quality selector controls resolution rather than guaranteeing a GPU budget. No network assets, telemetry, or external dependencies are used.
