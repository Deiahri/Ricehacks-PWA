# CV Exercise (PWA)

A fitness battle game: find nearby players on the map, battle them with real-world workouts, and track progress and rankings. Squat and push-up reps are counted and form-scored entirely in the browser (the camera runs in the Battle flow's Workout Recording step). It's built for iPhone Safari and installable to the home screen. Video never leaves the phone.

The game screens come from a Figma Make design and currently use mock data; game logic is being wired in incrementally.

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

## Live map (location sharing)

The Map tab is a real map (MapLibre GL + free OpenFreeMap tiles, restyled in `src/live/mapStyle.ts`). Tap **Share my location**, and the map follows you, rotating with your compass. Everyone else connected to the same presence server appears at their live position. The server lives in [`../Ricehacks-mybuild-backend`](../Ricehacks-mybuild-backend).

- **Local:** run `npm start` in the backend, then `npm run dev` here. The app connects to `ws://<page host>:8787`. Desktop browsers have no compass, so the map stays north-up.
- **Deployed:** deploy the backend as a Render Web Service, then set `VITE_PRESENCE_URL=wss://<service>.onrender.com` on the frontend host (see `.env.example`) and redeploy, because the value is baked in at build time.
- **One phone only?** Run `node fake-walker.mjs <lat> <lng> wss://<service>.onrender.com` in the backend folder to get a bot walking in a circle near you.
- iOS asks for **Motion & Orientation** (compass) and **Location** when you tap the button. Both need https.

## Using it on an iPhone

- Open the URL in Safari. To install it, tap Share → **Add to Home Screen**.
- In home-screen mode, iOS asks for camera permission again on each launch. If the camera is blocked there, use Safari; it works the same way.
- After one session online, it works offline.
- `?delegate=cpu` at the end of the URL forces CPU inference (useful if the GPU path misbehaves).

## Layout

| Path | What |
|---|---|
| `src/App.tsx` | App shell (full-screen on phones, framed phone on desktop), bottom nav, mock player data |
| `src/components/` | Game screens from the Figma Make design: Map, Progress, Ranks, Alerts, Profile, Battle flow |
| `src/components/CameraFeed.tsx` | Live camera + pose skeleton, shown in the Battle flow's Workout Recording step |
| `src/imports/` | Figma-exported icons, sprite SVG paths and item PNGs |
| `src/logic/` | Rep state machine + form scoring, copied verbatim from `CV-Exercise/mobile/src/logic/` (not yet wired into the game UI) |
| `src/camera/` | Camera stream, MediaPipe loader (GPU → CPU fallback), per-frame pose hook |
| `src/live/` | Live map: stylized MapLibre map, GPS + compass hook, WebSocket presence hook |
| `public/models/` | `pose_landmarker_full.task` / `pose_landmarker_lite.task` |
| `vite.config.ts` | PWA manifest + service worker (app shell precached; wasm + models cached on first use) |
