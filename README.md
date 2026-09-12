# CV Exercise (PWA)

Counts squat and push-up reps and gives each rep a form score, entirely in the browser. It's built for iPhone Safari and installable to the home screen. Video never leaves the phone.

Why this is a web app and not React Native: see [Findings.md](Findings.md).

## Develop

Needs Node ≥ 22.12.

```sh
npm install
npm run dev          # http://localhost:5173 (the desktop webcam works on localhost)
npm run test:logic   # rep/score engine self-test (9 scenarios)
npm run build        # -> dist/
npm run preview      # serve dist/ locally
```

Phones only allow the camera over **HTTPS**, so test on a deployed URL. A LAN `http://` address won't get camera access.

## Deploy (static site)

- **Vercel:** import the repo, framework preset **Vite**, build command `npm run build`, output directory `dist`.
- **Render:** New → **Static Site**, build command `npm ci && npm run build`, publish directory `dist`.

`npm run build` copies the MediaPipe wasm into `public/wasm/` first (the `prebuild` script), so no CDN is needed at runtime.

## Using it on an iPhone

- Open the URL in Safari. To install it, tap Share → **Add to Home Screen**.
- In home-screen mode, iOS asks for camera permission again on each launch. If the camera is blocked there, use Safari; it works the same way.
- After one session online, it works offline.
- `?delegate=cpu` at the end of the URL forces CPU inference (useful if the GPU path misbehaves).
- To share results, finish a set and tap **End session → Session data (JSON) → Copy JSON**.

## Layout

| Path | What |
|---|---|
| `src/logic/` | Rep state machine + form scoring, copied verbatim from `CV-Exercise/mobile/src/logic/` |
| `src/camera/` | Camera stream, MediaPipe loader (GPU → CPU fallback), per-frame pose hook |
| `src/App.tsx` | Home, camera (skeleton overlay + HUD), summary |
| `public/models/` | `pose_landmarker_full.task` / `pose_landmarker_lite.task` |
| `vite.config.ts` | PWA manifest + service worker (app shell precached; wasm + models cached on first use) |
