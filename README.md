# NextRep (PWA)

A fitness battle game: find nearby players on the map, battle them with real-world workouts, and track progress and rankings. Squat and push-up reps are counted and form-scored entirely in the browser (the camera runs in the Battle flow's Workout Recording step). It's built for iPhone Safari and installable to the home screen. Video never leaves the phone.

The game screens come from a Figma Make design. Battles, workouts, rep counting, scoring, accounts, friends, the global leaderboard, notifications, the profile and the Progress screen are real.

Every launch opens on the entry screen (NR logo, "Your best rep is your next rep", tap to continue), then Google sign-in, then a required username pick.

## Battles and workouts

- **Battle (1v1):** on the Map, tap a live player and choose **⚔ Battle Request**. The other phone gets the request on any tab, with 30 s to accept.
  - Both players vote on the exercise (squats or push-ups) and the time limit (30 s, 1 m, 2 m or 5 m). If the votes differ, the server flips a coin, and both phones show the same result.
  - When both cameras are running, the server starts a shared **10 s countdown**, and then the set begins.
  - Each player sees the other's reps and score live.
  - The higher score wins. A tie goes to the higher rep count, and after that it's a draw. Leaving mid-set forfeits.
- **Workout (solo):** the Map's center **Workout** button. Pick an exercise and a time. The 10 s countdown starts as soon as the camera is up.
- **Score** = round(Σ rep form score ÷ 10), so each rep is worth 0–10 points by form. Reps are coloured green (≥ 80), yellow (≥ 50) or red.
- Every finished set is stored by the presence server in a Postgres `workouts` table (Tiger Cloud). See [`../Ricehacks-mybuild-backend`](../Ricehacks-mybuild-backend). A battle is stored as one row that holds both players.
- Accounts come from Google sign-in (Clerk), below. Without a Clerk key the app runs in guest mode, where a random id kept in localStorage (`presence.userId`) is the account.

Why this is a web app and not React Native: see [Findings.md](Findings.md).

## Sign-in (Clerk + Google)

1. Create an application at [clerk.com](https://clerk.com) and enable **Google** as the only sign-in option (User & authentication → SSO connections; turn off email/password). Development instances use Clerk's shared Google credentials, so nothing else is needed to try it.
2. Frontend: set `VITE_CLERK_PUBLISHABLE_KEY=pk_…` in `.env` (see `.env.example`) and on Vercel/Render, then rebuild.
3. Backend: set `CLERK_SECRET_KEY=sk_…` from the **same** Clerk app in its `.env` and on Render. Optionally set `CLERK_AUTHORIZED_PARTIES=https://<your app domain>`.
4. Clerk dashboard → **Domains**: add the deployed app's domain. For a production instance you also add your own Google OAuth client ID and secret.

Google sends people back to the app at `<app URL>?sso_callback=1`, which `src/components/ClerkGate.tsx` finishes. No rewrite rules are needed. Each Google account starts fresh; old guest (device) accounts aren't carried over. Test sign-in in the installed home-screen app on iPhone: iOS can open Google in a Safari sheet, and the sign-in has to land back in the app.

Leave both keys unset for local dev: the entry screen still shows, sign-in is skipped, and the device id is the credential.

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
- On iOS, **Share my location** asks for **Location**; the **🧭 Enable compass** pill that appears afterwards asks for **Motion & Orientation**. They're separate taps because home-screen apps drop the Location prompt if it follows the compass one. Both need https.

## Using it on an iPhone

- Open the URL in Safari. To install it, tap Share → **Add to Home Screen**.
- In home-screen mode, iOS asks for camera permission again on each launch. If the camera is blocked there, use Safari; it works the same way.
- After one session online, it works offline.
- `?delegate=cpu` at the end of the URL forces CPU inference (useful if the GPU path misbehaves).

## Weekly goal, XP and levels

Right after picking a username, a new account picks a weekly XP goal (10–100 on the slider, or any number up to 1000). Every counted rep in a set that earned BP is 1 XP and a rep at 80+ form (the green "Great!") is 2 — a small "+2 Perfect!" / "+1 Nice rep" pops up on each rep during a set. The week runs Monday→Sunday in the phone's time zone and the goal is cumulative, so it can be hit on any mix of days. Reaching it is a level-up: the map's level bar fills as the week goes, the star turns gold, and a reward wheel comes up (1- or 2-day streak saver, +10/+20/+50 BP, or a shop item). A streak saver keeps an unfinished week open one more day past Sunday. The Progress tab shows each week's days rolling up into its total, the week streak and banked savers; the profile shows this week's XP against the goal next to the avatar (tap to change it). The server owns all of it (`GET /api/me`, `POST /api/goal`, `GET /api/progress`, `POST /api/reward/spin` in the backend README).

## Layout

| Path | What |
|---|---|
| `src/App.tsx` | App shell (full-screen on phones, framed phone on desktop), bottom nav, mock player data |
| `src/components/` | Game screens from the Figma Make design: Map, Progress, Ranks, Alerts, Profile, Battle flow |
| `src/components/CameraFeed.tsx` | Live camera + pose skeleton; hands every pose frame to the rep engine |
| `src/components/ChallengeOverlays.tsx` | Incoming request modal, "waiting for…" card, toast |
| `src/game/` | Session config, scoring, `useRepSession` (frames → reps inside the countdown/timer window), `useChallenge` (client side of the battle protocol), `xp.ts` (weekly XP rules and the reward wheel, mirroring the server) |
| `src/imports/` | Figma-exported icons, sprite SVG paths and item PNGs |
| `src/logic/` | Rep state machine + form scoring, copied verbatim from `CV-Exercise/mobile/src/logic/` |
| `src/camera/` | Camera stream, MediaPipe loader (GPU → CPU fallback), per-frame pose hook |
| `src/live/` | Live map: stylized MapLibre map, GPS + compass hook, WebSocket presence hook, `LiveProvider` (one socket for the whole app). Also `ProfileProvider` (account, friends, notifications), `credential.ts` (Clerk token or device id) and `useLeaderboard.ts` |
| `src/components/EntryScreen.tsx`, `ClerkGate.tsx` | Launch screen and the Google sign-in gate |
| `src/components/AvatarEditor.tsx` | Skin tone swatches and the shirt colour wheel (`src/config/appearance.ts`) |
| `src/components/GoalPicker.tsx`, `RewardWheelModal.tsx` | The weekly XP goal (asked once after the username, editable from the profile and Progress) and the spin owed when a week's goal is met |
| `public/models/` | `pose_landmarker_full.task` / `pose_landmarker_lite.task` |
| `vite.config.ts` | PWA manifest + service worker (app shell precached; wasm + models cached on first use) |
