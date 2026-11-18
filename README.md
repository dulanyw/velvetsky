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
Follow style.md. Keep tests and supporting files in subfolders. Use Git from the start. Preview uses one persistent port; restart the server on that same port following UI changes. Proposed port: 8467, pending user selection.
