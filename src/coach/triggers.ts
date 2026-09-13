/** When the voice coach should speak up on its own, and the stats it's given (pure; see src/config/coach.ts). */
import type { CoachConfig } from '../config/coach'

export interface CoachRep {
  /** 0–100 form score. */
  score: number
  /** Top form cue for this rep, if any. */
  cue?: string
}

export interface SetSnapshot {
  reps: CoachRep[]
  /** ms since counting started. */
  elapsedMs: number
  durationS: number
  /** Best reps for this exercise and set length before today, or null if there's none. */
  recordReps: number | null
  /** The coach is talking right now. */
  speaking: boolean
}

export type CoachEvent =
  | { type: 'bad_form'; cue: string; bad: number; of: number }
  | { type: 'on_pace'; projected: number; record: number }

export interface TriggerMemory {
  lastAnyMs: number
  lastFormMs: number
  lastPaceMs: number
  formCount: number
  paceCount: number
}

export const freshMemory = (): TriggerMemory => ({
  lastAnyMs: -Infinity, lastFormMs: -Infinity, lastPaceMs: -Infinity, formCount: 0, paceCount: 0,
})

export const projectedReps = (reps: number, elapsedMs: number, durationS: number) =>
  elapsedMs > 0 ? (reps / elapsedMs) * durationS * 1000 : 0

function mostCommon(items: string[]): string {
  const counts = new Map<string, number>()
  let best = ''
  for (const s of items) {
    const n = (counts.get(s) ?? 0) + 1
    counts.set(s, n)
    if (n > (counts.get(best) ?? 0)) best = s
  }
  return best
}

/** The event to voice now, if any; records it in `mem`. */
export function nextCoachEvent(cfg: CoachConfig, s: SetSnapshot, mem: TriggerMemory): CoachEvent | null {
  const t = s.elapsedMs
  if (s.speaking || t - mem.lastAnyMs < cfg.globalGapS * 1000) return null

  const f = cfg.formAlert
  const recent = s.reps.slice(-f.window)
  const bad = recent.filter(r => r.score < f.badBelow)
  const latestBad = recent.length > 0 && recent[recent.length - 1].score < f.badBelow
  if (latestBad && bad.length >= f.minBad && mem.formCount < f.maxPerSet && t - mem.lastFormMs >= f.cooldownS * 1000) {
    mem.formCount++
    mem.lastFormMs = mem.lastAnyMs = t
    return { type: 'bad_form', cue: mostCommon(bad.map(r => r.cue).filter((c): c is string => !!c)), bad: bad.length, of: recent.length }
  }

  const p = cfg.pace
  if (s.recordReps !== null && s.recordReps > 0 && s.reps.length >= p.minReps && t >= p.minElapsedFrac * s.durationS * 1000
      && mem.paceCount < p.maxPerSet && t - mem.lastPaceMs >= p.cooldownS * 1000) {
    const projected = projectedReps(s.reps.length, t, s.durationS)
    if (projected > s.recordReps * p.aheadRatio) {
      mem.paceCount++
      mem.lastPaceMs = mem.lastAnyMs = t
      return { type: 'on_pace', projected: Math.round(projected), record: s.recordReps }
    }
  }
  return null
}

/** The line sent for an event (the agent is told to react to [APP EVENT] lines out loud). */
export function eventMessage(e: CoachEvent): string {
  if (e.type === 'bad_form') {
    return `[APP EVENT] bad_form: ${e.bad} of the last ${e.of} reps had poor form.${e.cue ? ` Main cue: "${e.cue}".` : ''}`
  }
  return `[APP EVENT] on_pace: projected ${e.projected} reps vs personal best ${e.record}.`
}

/** Silent live stats, sent after every rep. */
export function statsMessage(s: SetSnapshot, score: number): string {
  const n = s.reps.length
  const avg = n ? Math.round(s.reps.reduce((a, r) => a + r.score, 0) / n) : 0
  const last = s.reps[n - 1]
  const elapsed = Math.round(s.elapsedMs / 1000)
  const parts = [
    `reps=${n}`, `score=${score}pts`, `avg_form=${avg}%`,
    last ? `last_rep_form=${Math.round(last.score)}%` : '',
    last?.cue ? `last_cue="${last.cue}"` : '',
    `time=${elapsed}s/${s.durationS}s`, `left=${Math.max(0, s.durationS - elapsed)}s`,
    `projected_reps=${Math.round(projectedReps(n, s.elapsedMs, s.durationS))}`,
    s.recordReps ? `personal_best_reps=${s.recordReps}` : 'personal_best_reps=none',
  ]
  return `[STATS] ${parts.filter(Boolean).join(' ')}`
}
