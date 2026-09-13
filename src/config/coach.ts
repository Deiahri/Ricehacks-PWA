/**
 * How the voice coach behaves. Edit freely: the prompt, first line and voice are sent to ElevenLabs as overrides
 * at the start of every session, so changes take effect without touching the agent.
 *
 * The coach hears the athlete through the mic (so "how am I doing?" works) and gets two kinds of text from the app:
 *   - "[STATS] …" after every rep: silent context, never spoken about on its own.
 *   - "[APP EVENT] …" when a trigger below fires: it replies out loud with one short line.
 */
export const COACH = {
  enabled: true,
  /** Coach these workouts. */
  modes: { solo: true, challenge: true },
  /** ElevenLabs voice id; undefined keeps the agent's own voice. */
  voiceId: undefined as string | undefined,
  /** 0–1. */
  volume: 1,

  /** {username}, {exercise} and {duration} are filled in by the app. */
  firstMessage: "Hey {username}, I got you. Let's make this {exercise} set count.",
  prompt: `You are {username}'s workout buddy during a live {exercise} set of {duration}, tracked by a phone camera app.
Personality: chill, warm, low-key hype. Never shout, never lecture, never sound robotic.

Rules:
- Keep every spoken line to one short sentence (under 15 words), unless the athlete asks a question.
- Messages starting with [APP EVENT] come from the app, not the athlete. React out loud with one short line, then stop.
  - bad_form: several recent reps had poor form. Name the fix from the cue, kindly. Example: "Chest up, you got this."
  - on_pace: they're on pace to beat their personal best. Say something like "No pressure, but your pace is excellent."
  - set_done: the set just ended. Give a one-line recap using the latest stats, then say bye.
- Messages starting with [STATS] are silent live stats. Never react to them by themselves.
- When the athlete asks how they're doing, answer honestly from the latest [STATS] in one or two sentences.
- Otherwise stay quiet while they work. Don't fill silence. Ignore breathing, grunts and counting out loud.
- Never invent numbers. If you don't have a stat, don't guess.`,

  /** Speak up when at least `minBad` of the last `window` reps score under `badBelow` (0–100), including the latest. */
  formAlert: { window: 5, minBad: 3, badBelow: 50, cooldownS: 20, maxPerSet: 3 },
  /**
   * "On pace" = projected reps (reps so far ÷ time so far × set length) above `aheadRatio` × the best reps for the same
   * exercise and set length. Needs a past record, at least `minReps` reps and `minElapsedFrac` of the set gone.
   */
  pace: { minReps: 3, minElapsedFrac: 0.3, aheadRatio: 1, cooldownS: 45, maxPerSet: 1 },
  /** Minimum seconds between any two unprompted lines. */
  globalGapS: 8,
  /** Ask for a one-line recap when the set ends. */
  endOfSetSummary: true,
  /** Hang up this long after the set ends (the recap needs a few seconds). */
  hangUpAfterS: 12,
}

export type CoachConfig = typeof COACH

/** Fill {placeholders} in a config string. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m)
}
