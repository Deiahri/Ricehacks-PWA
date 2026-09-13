/**
 * Combo streak sounds. A combo starts at `startAt` reps in a row, each less than `gapMs` after the last.
 * Every rep from then on plays the step sound one pitch higher, up to `maxLevel`, where it holds.
 * Letting `gapMs` pass without a rep breaks the combo and plays the sad sound.
 *
 * Sounds are synthesized. Set `url` to use a file instead (it must allow CORS: it's loaded with fetch).
 * The step file is re-pitched per level with `semitones`; if the file can't load, the synth plays.
 */
export const COMBO = {
  startAt: 3,
  gapMs: 2500,
  maxLevel: 5,
}

export interface StepSound {
  url?: string
  volume: number
  /** Semitones above `baseHz` (or the file's own pitch) for levels 1..maxLevel. */
  semitones: number[]
  baseHz: number
  wave: OscillatorType
  durMs: number
}

export interface BreakSound {
  url?: string
  volume: number
  /** Pitches of the descending "womp", in Hz. */
  notesHz: number[]
  wave: OscillatorType
  noteMs: number
}

export const SOUNDS: { comboStep: StepSound; comboBreak: BreakSound } = {
  comboStep: {
    url: undefined,
    volume: 0.3,
    semitones: [0, 2, 4, 7, 12],
    baseHz: 784, // G5
    wave: 'triangle',
    durMs: 160,
  },
  comboBreak: {
    url: undefined,
    volume: 0.3,
    notesHz: [392, 349, 311, 262],
    wave: 'sawtooth',
    noteMs: 150,
  },
}
