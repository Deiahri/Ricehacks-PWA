# Level progression per week + updated points system

## Context

The app scores each rep 0–100 and buckets it red/yellow/green (`src/game/scoring.ts:5-7`), but "level" is a bare integer the server hands back and the level bar on the map (`StreakStrip`, `src/components/MapScreen.tsx:198-335`) is hard-coded to 55 %. There is no daily goal, no week, no streak freeze, and BP is awarded by the server for both solo and battle sets.

This change introduces the real progression loop:

- **Points per rep**: red = 0 · yellow = 1 lvl pt · green = 2 lvl pts (+1 BP in battles only). Battle winner = more BP.
- **Daily objective**: a day is "done" once the lvl pts earned that day (solo + battle combined) reach a fixed target.
- **Week**: 4 training days per week (base user). Each completed day advances the map bar one goalpost; the 4th lights the star → level +1 → spin-the-wheel reward. Bar stays gold until the week rolls over on Sunday. A missed week is just "short" (no penalty) unless the user holds a streak freeze.

**Scope decision (the repo is client-only; BP/level/battle settlement live on an external Node server not in this repo):** build the engine client-side as pure functions + a localStorage-backed store, shaped so the server can adopt the same formulas later. BP and level stay server-authoritative for the base value; the client layers local bonuses (wheel rewards, weekly level-ups) on top for display. A "Server changes" section lists what the server must eventually implement.

---

## 1. Point rules (final spec)

Per rep (`repQuality(score)` already exists in `src/game/scoring.ts`):

| Quality | Form score | Lvl pts | BP (battle only) |
|---|---|---|---|
| red    | < 50   | 0 | 0 |
| yellow | 50–79  | 1 | 0 |
| green  | ≥ 80   | 2 | 1 |

- **Solo workout**: earns lvl pts only. No BP.
- **Battle**: earns lvl pts (win or lose) + 1 BP per green rep. Winner = side with more BP (ties → draw).
- **Daily target**: `DAILY_LVL_TARGET = 20` (10 perfect reps, or 20 ok reps). Tunable constant.
- **Days per week**: `DAYS_PER_WEEK = 4`. Matches the existing strip layout (3 flame goalposts + star).
- Extra lvl pts on an already-completed day are kept in the ledger (for stats) but do not spill into the next day.

## 2. How lvl pts flow through a session → day → week → level

```
rep scored (useRepSession)            every rep, live
  └─ repQuality → lvlPtsForRep        shown in HUD as "+2" / "+1" ticks (optional, cheap)
set ends (BattleFlow WorkoutRecording / challenge_result)
  └─ sessionPoints(repScores) → { lvl, bp, greens, yellows, reds }
  └─ progression.recordSession({ lvl, mode })     ← the ONE write into the store
        ├─ rolls the week over if needed (Sunday, or freeze exhausted)
        ├─ days[today] += lvl
        ├─ dayJustCompleted   = days[today] crossed DAILY_LVL_TARGET this call
        ├─ weekJustCompleted  = daysCompleted reached DAYS_PER_WEEK this call
        │     └─ levelBonus += 1, pendingReward = true, weekCompletedAt = now
        └─ persists to localStorage
result screen shows "+N lvl pts · Day 2/4 · 8 more to finish today"
user returns to map
  └─ StreakStrip mounts, sees lastSeenFill ≠ fill → animates fill, sparkles,
     lights goalpost(s), spins star, opens RewardWheelModal if pendingReward
```

Bar fill is **days completed + fraction of today**: `fill = min(daysCompleted + (todayDone ? 0 : todayPts / DAILY_LVL_TARGET), DAYS_PER_WEEK)`. So a 12-pt solo set on a fresh day moves the bar 60 % of the way to the next goalpost; a later 8-pt battle finishes the day and snaps it to the goalpost.

## 3. Data model (client store, server-shaped)

New file `src/game/progression.ts` — pure functions, no React:

```ts
export interface ProgressionState {
  weekStart: string            // ISO date (local Sunday) of the active week
  days: Record<string, number> // ISO date → lvl pts earned that day (this week only)
  weekCompletedAt: string | null
  levelBonus: number           // local level-ups not yet known to the server
  bonusBp: number              // wheel BP not yet known to the server
  bonusOwned: string[]         // wheel cosmetics not yet known to the server
  freezeDays: number           // banked streak freezes
  pendingReward: boolean       // star hit, wheel not yet spun
  lastSeenFill: number         // bar fill (0..DAYS_PER_WEEK) last animated on the map
}
```

Pure helpers (all unit-testable in `selftest.ts`):

- `lvlPtsForRep(score)`, `sessionPoints(repScores, mode)` → `{ lvl, bp, greens, yellows, reds }`
- `startOfWeek(date)`, `weekDeadline(state)` = Saturday of `weekStart` + `freezeDays` consumed
- `rollover(state, today)` — if `today > deadline`: fresh week (`days = {}`, `weekCompletedAt = null`, `pendingReward` kept if unclaimed). If `today` is past Saturday but ≤ deadline: consume one `freezeDays` per extra day, keep progress. Completed weeks always reset on the next Sunday.
- `recordSession(state, lvl, today)` → `{ state, dayJustCompleted, weekJustCompleted }`
- `summary(state, today)` → `{ daysCompleted, todayPts, todayDone, fill, weekDone, remainingToday }`
- `spinWheel(rng, owned)` → reward (see §6)
- `applyReward(state, reward)`

Store: `src/game/progressionStore.ts` — module singleton, `storage.get/set('progression.v1', JSON)` (`src/platform.ts:30-45`, string-only so JSON.stringify/parse here), `useSyncExternalStore` hook `useProgression()` returning `{ state, summary, recordSession, claimReward, markSeen }`. In dev, expose on `window.prog` for manual testing.

## 4. Files to change

### `src/game/scoring.ts`
Add `lvlPtsForRep` and `sessionPoints` next to `repQuality` (keep `totalScore` — the server still uses it for the existing score field).

### `src/game/progression.ts`, `src/game/progressionStore.ts` (new)
As in §3. Constants `DAILY_LVL_TARGET`, `DAYS_PER_WEEK` live in `progression.ts`.

### `src/live/ProfileProvider.tsx`
In the `value` memo (line ~131), merge local bonuses into the exposed profile so every consumer (map HUD, ProfileScreen shop `stateOf` at `ProfileScreen.tsx:111-116`, friends leaderboards) sees them without per-screen edits:
`profile = server ? { ...server, level: server.level + levelBonus, bp: server.bp + bonusBp, owned: [...server.owned, ...bonusOwned] } : null`.
Subscribe to the store via `useProgression()` (ProfileProvider is inside the React tree, so the hook works here).

### `src/components/BattleFlow.tsx`
- **Solo** (`WorkoutRecording`, effect at lines 517-529): after computing `repScores`, call `recordSession(sessionPoints(repScores, 'solo').lvl)`; keep the `solo_result` send. Replace the "+N BP earned" block (678-682) with a `SessionGain` panel: `+{lvl} lvl pts`, day progress `Day {daysCompleted}/{4}`, and either `"{remaining} more to finish today"` or `"Day complete!"` / `"Week complete — check the map!"`. Ignore `msg.bpAwarded` for solo (server change pending).
- **Battle**: `challenge_result` lands in `useChallenge.ts:74-75` → `PostBattleResult` (line 754). Call `recordSession` once when `result` first appears (effect in `BattleFlow` keyed on `result.you.id + challengeId`, guarded so it fires once). Add the same `SessionGain` panel under the BP row (line ~853). Show BP earned as `greens` count client-side (`sessionPoints(result.you.repScores, 'battle').bp`), falling back to `result.you.bpAwarded` until the server matches the formula.
- Optional HUD tick during counting: next to `QualityStrip`, a floating `+2`/`+1` `anim-pop-in` on each rep (`lastQ` at line 535 already knows the quality).

### `src/components/MapScreen.tsx` — `StreakStrip` (198-335)
- Replace `const progress = 55` with `const { summary, state, markSeen } = useProgression()`.
- Geometry: goalposts are at fixed px along the 230 px pill — flame centres ≈ 55, 109, and the circle ≈ 155; star at the right edge (230). Define `POST_PX = [55, 109, 155, 230]` and `fillPx(fill)` = linear interpolation between posts (0 → post[0] for the first day, post[k-1] → post[k] for day k+1). This makes "advance to the next goalpost" exact.
- Animation: `displayFill` state initialised from `state.lastSeenFill`; on mount `requestAnimationFrame` → set to `summary.fill`; the yellow fill div gets `transition: width 900ms cubic-bezier(.2,.8,.2,1)`. While `displayFill !== fill`, render `<Sparkles x={fillPx(displayFill)}/>` at the leading edge. Goalpost `i` renders `FlameIcon` when `i < daysCompleted` (else the grey circle); a goalpost that flips during this animation gets `anim-pop-in` + a sparkle burst. Star: `reached = weekDone`; if it flipped this animation, add `anim-star-spin` (new keyframe: rotate 360° + scale 1→1.35→1 over 1.2 s) + burst, then after 1.2 s open the wheel if `pendingReward`. On animation end call `markSeen()`.
- Star label shows `me.level + 1` as now (level already includes `levelBonus` via ProfileProvider).
- Render `<RewardWheelModal/>` inside `MapScreen` (z-[60], same pattern as `IncomingChallengeModal` in `ChallengeOverlays.tsx:20-76`) when `pendingReward && starAnimDone`.

### `src/components/Sparkles.tsx` (new)
8 absolutely-positioned particles (small 4-point star SVGs, gold/white) around `(x, y)`; each uses `anim-sparkle` with CSS vars `--dx/--dy/--delay` like `confettiFall` does at `BattleFlow.tsx:770-804`. `pointer-events-none`, unmounts after 1.2 s.

### `src/components/RewardWheelModal.tsx` (new)
- Backdrop `rgba(0,0,0,.35)` + card `anim-pop-in` (copy `IncomingChallengeModal` shell).
- Wheel: SVG with 5 wedges sized by weight; segment order/weights: `1-day freeze 30 %`, `+10 BP 30 %`, `+20 BP 20 %`, `2-day freeze 17 %`, `Shop item 3 %` (thin sliver). Pointer at top.
- "SPIN" → `spinWheel(Math.random, profile.owned)` picks the reward first, then the wheel animates to the matching wedge with inline `transition: transform 3s cubic-bezier(.17,.67,.12,1)` and `rotate(1800 + targetDeg)`. On `transitionend` → reveal + `Sparkles` + "Claim" → `claimReward()` (sets `pendingReward=false`, applies bonus).
- Shop item = random unowned `COSMETICS` entry (`src/config/cosmetics.ts:36-61`); if everything is owned it degrades to +20 BP. Copy: "You won the Magic Wand!" with the cosmetic's image via `cosmeticUrl`.

### `src/index.css`
Add `@keyframes sparkle` (scale 0→1→0, translate by `--dx/--dy`, opacity), `@keyframes starSpin`, classes `.anim-sparkle`, `.anim-star-spin`. Reuse existing `popIn`, `spin`.

### `src/components/CalendarScreen.tsx` (light touch)
Replace the hard-coded `buildMonth()` trained/missed sets (lines 15-28) with `state.days` for the current week (trained = `pts ≥ target`, missed = past training-window day with `pts < target` only when the week is over) and the "4 Day Streak" badge (line 124) with `daysCompleted`/`DAYS_PER_WEEK` + a small "❄ N freezes" chip when `freezeDays > 0`. Prior weeks stay mock until the server exposes history.

### `src/logic/selftest.ts`
Add a `progression` block using the existing `failed` counter pattern (lines 217-232): `sessionPoints([85, 60, 30]) → {lvl:3, bp:1}`; day completes at exactly `DAILY_LVL_TARGET`; 4 completed days → `weekJustCompleted`, `levelBonus 1`; 5th day adds no fill; Sunday rollover resets; Saturday-missed week with `freezeDays=1` survives one day then resets; `spinWheel` with a seeded rng hits every wedge and never returns an owned cosmetic.

## 5. Streak freeze semantics

- A freeze is a banked day. Week deadline = end of Saturday + banked freezes.
- On the first app open after Saturday with the week unfinished: each day past Saturday consumes one freeze and keeps the bar as-is. When freezes run out (or the user had none) the bar resets to 0 for the new week.
- Freezes are only consumed on unfinished weeks; a completed week never consumes one.
- Shown as a small "❄ N" chip next to the strip and on the calendar.

## 6. Reward wheel outcomes

| Wedge | Weight | Effect (`applyReward`) |
|---|---|---|
| 1-day streak freeze | 30 | `freezeDays += 1` |
| +10 BP | 30 | `bonusBp += 10` |
| +20 BP | 20 | `bonusBp += 20` |
| 2-day streak freeze | 17 | `freezeDays += 2` |
| Shop item | 3 | `bonusOwned.push(id)` |

## 7. Server changes required (outside this repo — list for the API owner)

1. `solo_result` → award **0 BP**; return `lvlPts` instead.
2. Battle settlement: `bp = green rep count`; `winnerId` = higher BP (draw on tie). Include `lvlPts` per side in `challenge_result`.
3. New fields on `Profile`: `levelPoints`, `weekStart`, `daysCompleted`, `freezeDays`, `pendingReward`; endpoints `POST /api/progress/session`, `POST /api/rewards/spin`. Once these exist, `progressionStore` becomes a cache of server state and the `bonus*` fields go away.

## 8. Verification

1. `npm run test:logic` — new progression checks pass.
2. `npm run dev`, open the app on the map tab. In the console: `prog.recordSession(12)` → return to map (switch tab away/back): bar slides 60 % toward the first goalpost with sparkles. `prog.recordSession(8)` → goalpost 1 pops to a flame with a burst; calendar shows today trained, badge "1/4".
3. Repeat for days 2–3 (set `prog.debugDate('2026-09-15')` helper to move "today"), then day 4: star spins + sparkles, wheel modal opens, spin lands on a wedge, Claim → level badge on the star/profile increments, BP or freeze chip updates, shop shows the won item as owned.
4. Real flow: run a solo workout (camera) → result screen shows "+N lvl pts · Day x/4"; back on the map the bar animates. Run a friend battle → `PostBattleResult` shows lvl pts and BP = green count.
5. Freeze: set `weekStart` to last week with 3 days done and `freezeDays: 1`, reload on "Sunday" → bar persists; set `freezeDays: 0` → bar resets.
6. Phone width (~400 px): wheel modal and sparkles stay inside the phone shell; no horizontal scroll.
