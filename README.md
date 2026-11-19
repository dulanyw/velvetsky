# Velvet Sky

A peaceful, browser-based cloudscape for drifting above fictional farmland. The goal is a beautiful, relaxing view for a second screen, with an experimental stationary VR preview.

Run locally with `node server.cjs`, then open http://127.0.0.1:8467. No package installation is needed.

## Controls

Open the sliders icon to change your scene.

| Control | What it does |
| --- | --- |
| Altitude | Move up or down, up to 20,000 feet. |
| Cruising speed | Set forward speed from 0 to 500 km/h. |
| Cloud cover / character | Adjust cloud quantity and choose cumulus, cirrus, stratus, or storm towers. |
| Time of day | Choose daylight, sunset, or night. |
| Time progression / rate | Freeze time or let it run; set simulated minutes per real second. |
| Moon | Turn the Moon off or choose its phase. |
| Solar eclipse / progress | Enable a total or annular eclipse and adjust its alignment. |
| Rendering | Choose power-saving 30 FPS or smoother modes with different resolution settings. |
| Drag the view | Look around without changing flight direction. |
| Look forward / double-click / Home | Recenter the view. |
| Sliders icon / H | Toggle settings; H hides or restores the interface. |
| Pause | Freeze flight and time; look-around and settings remain usable. |
| Fullscreen | Enter or leave fullscreen. |
| Enter VR | Open a stationary headset view with flight and time frozen. Choose settings beforehand; exit through the headset menu. |

VR uses headset pose, with no eye tracking or floating settings panel. Wrist controls are planned. See the [VR testing guide](docs/vr-testing.md) for setup and current limitations.

## Feedback & license

Share bugs and suggestions through [GitHub Issues](https://github.com/dulanyw/velvetsky/issues). For visual or performance problems, include your browser, device/headset, scene settings, and a screenshot or short recording if possible.

No license has been specified yet.
