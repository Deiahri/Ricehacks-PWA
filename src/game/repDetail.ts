import type { RepResult } from '../logic/exercises'
import type { PoseTrack } from './poseTrack'

/** A rep as stored for the replay screen: t = seconds into the set, s = form, d = rep seconds, sub = sub-scores, c = cues. */
export interface RepDetail {
  t: number
  s: number
  d: number | null
  sub: Record<string, number>
  c: string[]
}

/** Form score of a "perfect" rep (the magic wand counts these; the server's ITEM_EFFECTS.magic_wand.perfectAt). */
export const PERFECT_FORM = 90

/** `countStartMs` = performance.now() when counting began (the rep engine's clock, in ms). */
export function toRepDetail(reps: RepResult[], countStartMs: number): RepDetail[] {
  return reps.map(r => ({
    t: Math.max(0, Math.round((r.t - countStartMs / 1000) * 100) / 100),
    s: r.score,
    d: r.durationS,
    sub: r.subscores,
    c: r.cues.slice(0, 3),
  }))
}

/** What a finished set sends (solo_result / challenge_final). */
export interface FinalPayload {
  repScores: number[]
  repDetail?: RepDetail[]
  track?: PoseTrack
}

/** The server closes a socket on messages over 256 KB (mid-battle that's a forfeit), so stay well under. */
const MAX_PAYLOAD_CHARS = 200_000

/** Drop the pose track, then the rep detail, if the message would be too big. The scores always go. */
export function fitPayload(p: FinalPayload): FinalPayload {
  if (JSON.stringify(p).length <= MAX_PAYLOAD_CHARS) return p
  const noTrack: FinalPayload = { repScores: p.repScores, repDetail: p.repDetail }
  if (JSON.stringify(noTrack).length <= MAX_PAYLOAD_CHARS) return noTrack
  return { repScores: p.repScores }
}
