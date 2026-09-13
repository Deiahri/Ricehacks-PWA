import type { Equipped } from '../config/cosmetics'
import type { ExerciseName } from '../logic/exercises'

/** Set lengths in seconds; the server allows the same list (game-config.mjs). */
export const DURATIONS = [15, 30, 60, 120, 300] as const
export type DurationS = (typeof DURATIONS)[number]

export interface SessionConfig {
  exercise: ExerciseName
  durationS: DurationS
}

export const EXERCISE_OPTIONS: { id: ExerciseName; label: string; icon: string; hint: string }[] = [
  { id: 'squat',  label: 'Squats',   icon: '🏋️', hint: 'Face the camera or stand side-on' },
  { id: 'pushup', label: 'Push-ups', icon: '💪', hint: 'Plank side-on to the camera' },
]

/** "Get in position" time between the camera being ready and rep counting starting. */
export const COUNTDOWN_MS = 10_000

/** Brief identity of another connected player (presence connection id, not the stable user id). */
export interface RemoteBrief {
  id: string
  name: string
  shirt: string
  /** Skin tone id (src/config/appearance.ts). */
  skin?: string | null
  equipped?: Equipped
}

export interface SideResult extends RemoteBrief {
  reps: number
  score: number
  repScores: number[]
  /** Battle points this side earned (0 without an account). */
  bpAwarded?: number
}

export interface ChallengeResult {
  you: SideResult
  opponent: SideResult
  /** Presence connection id of the winner, null on a draw. */
  winnerId: string | null
  /** True when the loser left mid-challenge. */
  forfeit: boolean
}
