# Velvet Sky: stationary WebXR preview

This is the first VR milestone, not the completed wrist-control experience.
Physical headset validation and performance profiling are still required.

## What is implemented

- An Enter VR button appears in desktop settings when immersive VR is supported.
- Each runtime-provided eye receives its own projection, pose and viewport.
- Head orientation and small physical translations are tracked in metres.
- The initial seated position becomes the flight position; initial headset yaw
  aligns with the chosen desktop viewing bearing. Head pitch/roll remain natural.
- The selected scene, travel position and time freeze during the session.
- WebXR drives rendering continuously, independently of the desktop 30 FPS cap.
- The initial profiling preset uses half-scale XR framebuffers and cheaper cloud
  lighting. Cloud traversal and the expanded continuation cap are retained.
- The immersive scene contains no settings overlay, vignette or screen-space
  suspension lines. No DOM overlay is requested.
- Only the immersive-vr session and a local reference space are requested. There
  is no eye tracking, gaze input, hand tracking or controller interaction yet.
- Session end restores desktop settings and starts a fresh flight clock, avoiding
  a jump in travel or simulated time. Missing poses clear the scene until tracking
  returns. A reference-space reset establishes a fresh seated origin.

The wrist appliance, all in-VR settings, optional flight, controller/hand input,
adaptive VR performance policy and Steam Frame browser validation come later.

## References

- [WebXR rendering](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Rendering)
- [Session support detection](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
