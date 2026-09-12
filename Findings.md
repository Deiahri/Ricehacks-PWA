# Findings: CV-Exercise on iOS as a Progressive Web App

**Audience:** Engineering & Product · **Spike date:** 2026-09-12 · **Question:** [Bruh.md](Bruh.md) · **App:** this folder (see [README.md](README.md))

## TL;DR
- **Question:** to get CV-Exercise (rep counting + form score) working on iOS, is a mobile web app better than the React Native app?
- **Answer: yes, for this project and this deadline.** It's built here as a **Progressive Web App**. It opens in Safari, can be added to the home screen, and works offline after the first session.
- **Same brains as the native app:**
  - The same MediaPipe BlazePose model (`full` / `lite`).
  - The same rep and score engine: `src/logic/` is copied verbatim from `CV-Exercise/mobile/src/logic/`, and the 9/9 self-tests pass with identical results.
- **What it removes:** Mac, Xcode, code signing, App Store/TestFlight, native plugins, and the separate Kotlin and Swift camera code. Deploying is just static files on any HTTPS host.
- **What it costs:**
  - Probably lower FPS than native (not yet measured on an iPhone).
  - iOS asks again for camera permission each time the home-screen app launches.
  - A GPU bug in iOS Safari; the app falls back to CPU.
  - Each cost has a mitigation, listed below.

## Why not native (what kept failing)
| Blocker | Detail |
|---|---|
| iOS compile fails | Xcode 26.4+ ships Apple clang 21. It rejects the `fmt` 11.0.2 library that React Native bundles (a consteval error in `format-inl.h`). The fix is only in RN ≥ 0.83.9 / Expo SDK 56. NextRep is on RN 0.81, and its iOS build has never compiled. |
| No iOS build machine | Native iOS builds need a Mac. Our build box is Linux. |
| Plugin version drift | `react-native-vision-camera` moved to v5 (Nitro), but the MediaPipe frame-processor plugins still target v4 on older RN. CV-Exercise got around this with a custom Kotlin module, but its Swift half was never written (estimated 1–2 days). |
| Two native codebases | The Android (Kotlin) and iOS (Swift) camera and pose code would have to be kept in sync by hand. |

## What the PWA is
| Piece | Implementation |
|---|---|
| Camera | `getUserMedia`, ~640×480, front or back ([src/camera/stream.ts](src/camera/stream.ts)). One stream per app launch, reused across sets. |
| Pose | `@mediapipe/tasks-vision` 1.0.1, `PoseLandmarker` in VIDEO mode, one frame at a time, paced by `requestVideoFrameCallback`. GPU first, falling back to CPU at startup and mid-session. `?delegate=cpu` forces CPU ([src/camera/landmarker.ts](src/camera/landmarker.ts), [src/camera/usePoseCamera.ts](src/camera/usePoseCamera.ts)). |
| Logic | [src/logic/](src/logic/), unchanged. Its input has the same event shape as the native `PoseCameraView`. |
| UI | A port of `CV-Exercise/mobile/App.tsx` ([src/App.tsx](src/App.tsx)): exercise picker, SVG skeleton overlay, HUD, summary, and a "Copy JSON" button for the session data (an iPhone has no `adb logcat`). |
| PWA | `vite-plugin-pwa`: the manifest, icons and iOS meta tags. A Workbox service worker precaches the app shell (~680 KB). The wasm runtime and model (~15 MB) are cached on first use. |
| Hosting | Any static HTTPS host (Render / Vercel). The `dist/` folder is ~50 MB: both models plus three wasm variants. |

## Tradeoffs vs. native
| | PWA (this) | Native (React Native) |
|---|---|---|
| iOS build | None. It's a URL. | Mac + Xcode + signing |
| Distribution | Link, or Add to Home Screen | TestFlight / App Store / dev builds |
| Pose speed | WebGL / WASM in WebKit. Likely slower. **iPhone numbers pending.** | Android S24 FE: ~47 ms inference, 10–13 FPS (CV-Exercise §3d). iOS never built. |
| Camera permission | Safari: remembered per site. Home-screen app: asks again on each launch. | Asked once |
| Offline | After the first session | Always |
| Code | One web codebase | RN + Kotlin module + a Swift module (not written) |

## iOS caveats and how the app handles them
| Caveat | Mitigation in the app |
|---|---|
| Home-screen (standalone) apps don't remember camera permission, and ask again when the URL changes (WebKit bugs [185448](https://bugs.webkit.org/show_bug.cgi?id=185448), [215884](https://bugs.webkit.org/show_bug.cgi?id=215884)) | No router or URL changes. The camera is acquired once per launch and reused for Home → Camera → Summary → Go again. It's released when the app is backgrounded. If the camera fails in home-screen mode, the app shows an "Open in Safari" card. |
| MediaPipe's GPU mode has had iOS Safari bugs ([mediapipe#6142](https://github.com/google-ai-edge/mediapipe/issues/6142)) | Automatic CPU fallback at startup and mid-session. The delegate in use is shown in the HUD and the summary. |
| The camera needs HTTPS | Deploy to an HTTPS host. A LAN `http://` dev server won't get camera access on a phone. |
| iOS has no install prompt | A dismissible "Share → Add to Home Screen" banner in Safari. |
| The screen sleeps mid-set | Screen Wake Lock (iOS 16.4+). It does nothing on older iOS. |

## Results

### Local checks (2026-09-12, Linux desktop, headless browser, fake camera)
| Check | Result |
|---|---|
| Logic self-test (`npm run test:logic`) | ✅ 9/9, same numbers as CV-Exercise |
| Typecheck + production build | ✅ clean. The manifest and service worker are generated. |
| Chrome 150: camera → video → model → pose loop | ✅ runs end to end: 640×480 frames, `full` model, GPU path. Speed here was ~1 FPS on software rendering, which says nothing about phones. It showed "Body not fully visible", which is correct, since the fake camera has no person in it. |
| Manifest + service worker | ✅ manifest `CV Exercise`. The service worker activated, precached the app shell, and cached the model and wasm at runtime. |
| Offline relaunch (airplane-mode equivalent) | ✅ after one online session, a reload with the network cut loads the app, wasm and model from the cache and runs the pose loop. The first attempt failed: the cached entries missed because the server sends `Vary: Origin`. Fixed with `ignoreVary` in `vite.config.ts`. |
| WebKit 26.6 (Playwright on Linux) | ⚠️ couldn't load any `http://` page in this sandboxed machine ("internal error", even with WebKit's own sandbox off). This is an environment limit, not an app result. **The iPhone test is the real WebKit check.** |

### iPhone (pending: user test on the deployed URL)
To collect the numbers: finish a set, tap **End session → Session data (JSON) → Copy JSON**, and paste it back.

| Mode | iPhone / iOS | Model | Delegate | FPS | Inference ms | Actual reps | Counted | Avg score | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Safari | | full | | | | | | | |
| Safari | | lite | | | | | | | |
| Home-screen PWA | | full | | | | | | | Camera prompts per launch? |
| Airplane mode (after one session) | | full | | | | | | | Opens and tracks offline? |

## Next steps
1. Deploy `dist/` (Render or Vercel, see README). Open it in iPhone Safari and fill in the table.
2. If an iPhone runs below ~8 FPS on `full`, make `lite` the default. 10 FPS is enough for reps (CV-Exercise §10.4).
3. If the home-screen camera is unreliable on the demo phone, run the demo from Safari. It's the same app.
4. Tune the thresholds from real sessions, starting with push-up lockout and depth (CV-Exercise Findings §3c).

## Sources
- fmt / Xcode 26.4: [fmtlib/fmt#4740](https://github.com/fmtlib/fmt/issues/4740), [react/react-native#55601](https://github.com/react/react-native/issues/55601), [fix only in RN ≥ 0.83.9 / SDK 56](https://bleepingswift.com/blog/fmt-consteval-error-xcode-26-4-react-native)
- iOS home-screen camera issues: [STRICH KB](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa), [WebKit 185448](https://bugs.webkit.org/show_bug.cgi?id=185448), [WebKit 215884](https://bugs.webkit.org/show_bug.cgi?id=215884)
- MediaPipe web: [Pose Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [iOS Safari GPU bug #6142](https://github.com/google-ai-edge/mediapipe/issues/6142)
- Browser pose speed reference (~11–12 FPS on a Pixel 5): [PoseTracker 2026 guide](https://www.posetracker.com/news/best-pose-estimation-model-in-2026-the-real-time-mobile-guide)
