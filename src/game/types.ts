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

/** Moves on the way: shown locked in the picker, not playable yet (no rep counter, not in ExerciseName). */
export const LOCKED_EXERCISES = [
  { id: 'pullup', label: 'Pull-ups' },
  { id: 'jumping_jack', label: 'Jumping Jacks' },
  { id: 'plank', label: 'Plank' },
] as const
export type LockedExerciseId = (typeof LOCKED_EXERCISES)[number]['id']

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
  /** False = verification is on and they haven't verified. */
  verified?: boolean | null
}

export interface SideResult extends RemoteBrief {
  reps: number
  score: number
  repScores: number[]
  /** Battle points this side earned (0 without an account). */
  bpAwarded?: number
}

/** What a fighter's worn items do in a battle (the server's battle-effects.mjs loadoutOf). */
export interface Loadout {
  shield: boolean
  gauntlet: boolean
  hat: boolean
  wand: boolean
}

/** One fighter in the HP duel (the server's battle-effects.mjs SideOut). */
export interface DuelSide {
  dealt: number
  taken: number
  hp: number
  /** Damage my shield blocked. */
  absorbed: number
  gauntletBonus: number
  /** My reps their warlock hat turned into −1. */
  cursedReps: number[]
  cursesCast: number
  cursesSuffered: number
  /** Current / best run of perfect reps (the magic wand needs 5). */
  streak: number
  bestStreak: number
  /** The magic wand fired: +50 BP. */
  surge: boolean
  rawScore: number
  reps: number
  loadout: Loadout
}

/** The HP duel from my side. */
export interface DuelView {
  hpMax: number
  you: DuelSide
  opponent: DuelSide
}

/** Something to toast during a live battle. by / who = 'you' means it's yours. */
export type DuelEvent = { kind: 'curse'; by: 'you' | 'opponent' } | { kind: 'surge'; who: 'you' | 'opponent' }

export interface ChallengeResult {
  you: SideResult
  opponent: SideResult
  /** Presence connection id of the winner, null on a draw. */
  winnerId: string | null
  /** True when the loser left mid-challenge. */
  forfeit: boolean
  /** The HP duel as settled (servers before the item rules don't send it). */
  battle?: DuelView
  /** The stored workout, for the replay screen. */
  workoutId?: string
}
