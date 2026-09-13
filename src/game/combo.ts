/** Rep streak tracking for the combo sounds (pure; times are ms on any one clock). See src/config/sounds.ts. */
export interface ComboRules {
  startAt: number
  gapMs: number
  maxLevel: number
}

export type ComboEvent = { type: 'step'; level: number } | { type: 'break'; streak: number }

export class ComboTracker {
  private streak = 0
  private lastRepAt = -Infinity

  constructor(private readonly rules: ComboRules) {}

  /** 0 while no combo is running, then 1..maxLevel. */
  get level(): number {
    const { startAt, maxLevel } = this.rules
    return this.streak >= startAt ? Math.min(maxLevel, this.streak - startAt + 1) : 0
  }

  /** Reps in the running combo (0 when none). */
  get count(): number {
    return this.level > 0 ? this.streak : 0
  }

  /** A rep landed at `t`. */
  rep(t: number): ComboEvent[] {
    const events: ComboEvent[] = []
    const lapsed = this.expire(t)
    if (lapsed) events.push(lapsed)
    this.streak = t - this.lastRepAt < this.rules.gapMs ? this.streak + 1 : 1
    this.lastRepAt = t
    if (this.level > 0) events.push({ type: 'step', level: this.level })
    return events
  }

  /** Call regularly: ends the streak once `gapMs` passes without a rep; a 'break' if a combo was running. */
  expire(t: number): ComboEvent | null {
    if (this.streak === 0 || t - this.lastRepAt < this.rules.gapMs) return null
    const was = this.streak
    const wasCombo = this.level > 0
    this.streak = 0
    return wasCombo ? { type: 'break', streak: was } : null
  }

  /** Forget the streak without a sound (the set ended). */
  reset(): void {
    this.streak = 0
    this.lastRepAt = -Infinity
  }
}
