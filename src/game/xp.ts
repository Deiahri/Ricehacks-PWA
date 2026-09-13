/**
 * Weekly XP goal (the server's game-config.mjs mirrors these). Every counted rep is 1 XP; a rep at XP_PERFECT_AT+ form
 * (the green "Great!" grade) is 2. The week runs Monday→Sunday in the phone's zone and reaching the goal is a level-up:
 * the star on the map turns gold and a spin of the reward wheel is owed. Pure, so selftest covers it.
 */
import { repQuality } from './scoring'

export const XP_PERFECT_AT = 80
export const GOAL_MIN = 10
export const GOAL_SLIDER_MAX = 100
export const GOAL_STEP = 5
export const GOAL_MAX = 1000
export const DEFAULT_GOAL = 40

export const xpForRep = (formScore: number) => (repQuality(formScore) === 'green' ? 2 : 1)
export const xpForScores = (scores: number[]) => scores.reduce((n, s) => n + xpForRep(s), 0)
export const repXpLabel = (formScore: number) => (xpForRep(formScore) === 2 ? 'Perfect!' : 'Nice rep')

export const clampGoal = (n: number) => (Number.isFinite(n) ? Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(n))) : GOAL_MIN)
/** How the slider position reads. */
export const goalTier = (goal: number) => (goal < 30 ? 'Easy does it' : goal < 60 ? 'Steady' : goal <= 100 ? 'Hard' : 'Beast mode')
/** 0–100, capped: how far this week's XP is toward the goal. */
export const goalPct = (xp: number, goal: number | null | undefined) => (goal ? Math.min(100, Math.round((100 * xp) / goal)) : 0)

/** Reward wheel wedges in the server's order. `weight` decides the odds there; here it only sizes the wedge. */
export interface Wedge { id: string; kind: 'saver' | 'bp' | 'item'; label: string; short: string; weight: number; color: string }
export const WHEEL: Wedge[] = [
  { id: 'saver1', kind: 'saver', label: '1-day streak saver', short: '🛟 1 day', weight: 30, color: '#4a90e2' },
  { id: 'bp10', kind: 'bp', label: '+10 BP', short: '◆ 10', weight: 25, color: '#f59e0b' },
  { id: 'saver2', kind: 'saver', label: '2-day streak saver', short: '🛟 2 days', weight: 15, color: '#2f6fc0' },
  { id: 'bp20', kind: 'bp', label: '+20 BP', short: '◆ 20', weight: 20, color: '#fbbf24' },
  { id: 'item', kind: 'item', label: 'A shop item!', short: '🎁', weight: 3, color: '#a855f7' },
  { id: 'bp50', kind: 'bp', label: '+50 BP', short: '◆ 50', weight: 7, color: '#ff9600' },
]
/** Where wedge `id` sits: its [start, end) angle in degrees, clockwise from the top. */
export function wedgeArc(id: string): [number, number] {
  const total = WHEEL.reduce((n, w) => n + w.weight, 0)
  let at = 0
  for (const w of WHEEL) {
    const span = (360 * w.weight) / total
    if (w.id === id) return [at, at + span]
    at += span
  }
  return [0, 0]
}
