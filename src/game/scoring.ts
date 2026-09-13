/** Session scoring on top of the per-rep form score (0-100) from src/logic/exercises.ts. Pure, so selftest covers it. */

export type RepQuality = 'red' | 'yellow' | 'green'

export function repQuality(formScore: number): RepQuality {
  return formScore >= 80 ? 'green' : formScore >= 50 ? 'yellow' : 'red'
}

/** Each rep is worth 0-10 points by form: round(sum of rep scores / 10). The server uses the same formula. */
export function totalScore(repScores: number[]): number {
  return Math.round(repScores.reduce((s, v) => s + v, 0) / 10)
}

export function avgForm(repScores: number[]): number {
  return repScores.length ? Math.round(repScores.reduce((s, v) => s + v, 0) / repScores.length) : 0
}

/** 125 -> "2:05" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : `${seconds / 60}m`
}
