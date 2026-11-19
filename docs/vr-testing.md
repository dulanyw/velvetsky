# Stationary WebXR preview

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

## Publish a test on GitHub Pages

1. Put this repository on GitHub, including the manual Pages workflow on its
   default branch. Local source changes do not publish anything by themselves.
2. In repository Settings > Pages, select GitHub Actions as the publishing source.
3. Run Actions > Publish browser preview > Run workflow.
4. The workflow runs unit/package checks and packages only index.html, src/ and
   .nojekyll into dist/. It uploads that artifact and deploys it to Pages.
5. Use the HTTPS URL reported by the deployment, including the repository subpath
   and trailing slash. Example: https://USERNAME.github.io/REPOSITORY/.

All paths are relative. No packages, API keys, application backend, service worker
or external assets are required. Node runs during local development and packaging,
not in the hosted application. Pushes do not trigger deployment; the workflow is
manual. Published assets run on the headset's GPU.

To build the same artifact locally, run `node tools/package-site.cjs`. It recreates
the generated dist/ directory. `node tests/site.test.cjs` also packages and checks
the full browser import graph under a repository-style URL prefix.

## First Quest 3 check

1. Open the deployed HTTPS URL in Quest Browser. The desktop app's localhost URL
   refers to the PC and is not the headset's address.
2. Choose altitude, clouds, moon/time and other settings before entering.
3. Sit in the intended viewing position, face forward and select Enter VR.
4. Verify a single coherent horizon and sky, correct scale, and comfortable stereo
   alignment. Turn and tilt your head, then lean slightly left/right and up/down.
   Nearby clouds should show parallax while the distant sky stays fixed.
5. Check sunset, moon/night and eclipse scenes in separate sessions. Celestial
   discs should retain their orientation and angular size across both eyes.
6. Test tracking interruption, headset recenter and exit using the headset's
   browser/system controls. Then verify desktop controls, pause and time resume
   normally. Repeat entry/exit with a different cloud type.
7. Profile actual headset frame delivery. The desktop FPS label does not measure
   immersive rendering and is not evidence of headset performance.

Steam Frame must be checked in its actual supported WebXR browser/runtime path;
support is detected rather than assumed. Unit fixtures validate lifecycle and
camera math, but do not replace visual or comfort checks on real hardware.

## References

- [WebXR rendering](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Rendering)
- [Session support detection](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)
- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
