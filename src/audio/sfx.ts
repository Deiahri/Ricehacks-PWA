import { SOUNDS } from '../config/sounds'

// One shared AudioContext. iOS only lets audio start inside a user gesture, so call unlockAudio() from a tap
// before the first sound; after that, sounds can play from timers and camera callbacks.
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

/** Call synchronously inside a tap handler. Also starts loading any sound files from the config. */
export function unlockAudio(): void {
  const c = audio()
  if (!c) return
  if (c.state !== 'running') void c.resume().catch(() => {})
  const src = c.createBufferSource()
  src.buffer = c.createBuffer(1, 1, 22050)
  src.connect(c.destination)
  src.start(0)
  for (const url of [SOUNDS.comboStep.url, SOUNDS.comboBreak.url]) if (url) void load(c, url)
}

const files = new Map<string, Promise<AudioBuffer | null>>()

function load(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = files.get(url)
  if (!p) {
    p = fetch(url)
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(b => c.decodeAudioData(b))
      .catch(() => null)
    files.set(url, p)
  }
  return p
}

/** Play a file at `rate` (1 = as recorded); resolves false if it couldn't load. */
async function playFile(c: AudioContext, url: string, rate: number, volume: number): Promise<boolean> {
  const buffer = await load(c, url)
  if (!buffer) return false
  const src = c.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = rate
  const gain = c.createGain()
  gain.gain.value = volume
  src.connect(gain).connect(c.destination)
  src.start()
  return true
}

function tone(c: AudioContext, wave: OscillatorType, hz: number, at: number, durS: number, volume: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = wave
  osc.frequency.setValueAtTime(hz, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + durS)
  osc.connect(gain).connect(c.destination)
  osc.start(at)
  osc.stop(at + durS + 0.02)
}

function synthStep(c: AudioContext, semitone: number) {
  const s = SOUNDS.comboStep
  const hz = s.baseHz * 2 ** (semitone / 12)
  const t = c.currentTime
  const dur = s.durMs / 1000
  tone(c, s.wave, hz, t, dur, s.volume)
  tone(c, 'sine', hz * 2, t, dur * 0.7, s.volume * 0.35) // sparkle an octave up
}

function synthBreak(c: AudioContext) {
  const s = SOUNDS.comboBreak
  const step = s.noteMs / 1000
  s.notesHz.forEach((hz, i) => {
    const last = i === s.notesHz.length - 1
    tone(c, s.wave, hz, c.currentTime + i * step, last ? step * 2.5 : step * 1.1, s.volume * 0.6)
  })
}

/** Combo step at `level` (1 = first combo rep). */
export function playComboStep(level: number): void {
  const c = audio()
  if (!c || c.state !== 'running') return
  const s = SOUNDS.comboStep
  const semitone = s.semitones[Math.min(s.semitones.length, Math.max(1, level)) - 1] ?? 0
  if (!s.url) return synthStep(c, semitone)
  void playFile(c, s.url, 2 ** (semitone / 12), s.volume).then(ok => { if (!ok) synthStep(c, semitone) })
}

/** The combo was lost. */
export function playComboBreak(): void {
  const c = audio()
  if (!c || c.state !== 'running') return
  const s = SOUNDS.comboBreak
  if (!s.url) return synthBreak(c)
  void playFile(c, s.url, 1, s.volume).then(ok => { if (!ok) synthBreak(c) })
}
