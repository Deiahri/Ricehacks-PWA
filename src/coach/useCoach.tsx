import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { COACH, fillTemplate } from '../config/coach'
import { formatDuration } from '../game/scoring'
import { EXERCISE_OPTIONS, type SessionConfig } from '../game/types'
import { api, ApiError } from '../live/api'
import { storage } from '../platform'
import { eventMessage, freshMemory, nextCoachEvent, statsMessage, type CoachRep, type SetSnapshot } from './triggers'
import type { VoiceHandle } from './voice'

const CoachHost = lazy(() => import('./CoachHost'))

const MUTE_KEY = 'coach.muted'
const TOKEN_MAX_AGE_MS = 4 * 60_000 // mint a fresh token if the one on hand is older than this

/** What the workout screen shows for the coach button. */
export type CoachState = 'off' | 'muted' | 'offline' | 'idle' | 'connecting' | 'listening' | 'speaking'

const label = (c: Partial<SessionConfig> | null) => EXERCISE_OPTIONS.find(o => o.id === c?.exercise)?.label.toLowerCase()

/**
 * The ElevenLabs voice coach for one workout or battle (see src/config/coach.ts).
 * Render `element`; call start() inside a tap, prime() once the set is known, onRep() per rep and finish() at the end.
 */
export function useCoach({ username, isSolo }: { username: string; isSolo: boolean }) {
  const enabled = COACH.enabled && (isSolo ? COACH.modes.solo : COACH.modes.challenge)
  const [voice, setVoice] = useState<VoiceHandle | null>(null)
  const [muted, setMuted] = useState(() => storage.get(MUTE_KEY) === '1')
  const [unavailable, setUnavailable] = useState(false)
  const voiceRef = useRef(voice)
  voiceRef.current = voice

  const token = useRef<{ value: string; at: number } | null>(null)
  const record = useRef<number | null>(null)
  const memory = useRef(freshMemory())
  const vars = useRef<Record<string, string> | null>(null)
  const intro = useRef<string | null>(null)
  const done = useRef(false)
  const hangUp = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Keep a token on hand, so start() can run synchronously inside the tap.
  useEffect(() => {
    if (!enabled) return
    let stopped = false
    const fetchToken = () => {
      if (stopped || (token.current && Date.now() - token.current.at < TOKEN_MAX_AGE_MS)) return
      api<{ token: string }>('GET', '/api/coach/token').then(
        r => { token.current = { value: r.token, at: Date.now() }; setUnavailable(false) },
        (e: unknown) => {
          setUnavailable(true)
          if (e instanceof ApiError && (e.status === 503 || e.status === 404)) stopped = true // no coach on this server
        },
      )
    }
    fetchToken()
    const t = setInterval(fetchToken, 30_000)
    return () => { stopped = true; clearInterval(t) }
  }, [enabled])

  const begin = useCallback(() => {
    const v = voiceRef.current
    const t = token.current
    if (!v || !t || !vars.current || v.status === 'connecting' || v.status === 'connected') return
    token.current = null
    memory.current = freshMemory()
    v.start({
      token: t.value,
      prompt: fillTemplate(COACH.prompt, vars.current),
      firstMessage: fillTemplate(COACH.firstMessage, vars.current),
      voiceId: COACH.voiceId,
    })
  }, [])

  /** Inside a tap: open the voice session (no-op when muted, unavailable or already running). */
  const start = useCallback((c: SessionConfig | null) => {
    if (!enabled) return
    vars.current = isSolo
      ? { username, exercise: label(c) ?? 'workout', duration: c ? formatDuration(c.durationS) : 'a timed set' }
      : { username, exercise: 'battle', duration: 'length picked by vote' }
    done.current = false
    if (!muted) begin()
  }, [enabled, isSolo, username, muted, begin])

  /** The set is decided: look up the personal record, and tell the coach (battles decide by vote). */
  const prime = useCallback((c: SessionConfig, opponent?: string) => {
    record.current = null
    api<{ bestReps: number | null }>('GET', `/api/pr?exercise=${c.exercise}&durationS=${c.durationS}`)
      .then(r => { record.current = r.bestReps }, () => {})
    intro.current = `[STATS] set confirmed: ${label(c)} for ${c.durationS}s${opponent ? `, battle vs ${opponent}` : ''}.`
    voiceRef.current?.context(intro.current)
  }, [])

  const status = voice?.status
  useEffect(() => {
    if (status === 'connected' && intro.current) voiceRef.current?.context(intro.current)
  }, [status])

  const snapshot = (reps: CoachRep[], elapsedMs: number, durationS: number): SetSnapshot =>
    ({ reps, elapsedMs, durationS, recordReps: record.current, speaking: voiceRef.current?.speaking ?? false })

  /** After every rep: silent stats, and an unprompted line when a trigger fires. `extra` is appended to the stats. */
  const onRep = useCallback((reps: CoachRep[], elapsedMs: number, durationS: number, score: number, extra = '') => {
    const v = voiceRef.current
    if (!v || v.status !== 'connected') return
    const s = snapshot(reps, elapsedMs, durationS)
    v.context(statsMessage(s, score) + extra)
    const e = nextCoachEvent(COACH, s, memory.current)
    if (e) v.say(eventMessage(e))
  }, [])

  /** The set ended: final stats, an optional recap line, then hang up. */
  const finish = useCallback((reps: CoachRep[], durationS: number, score: number, extra = '') => {
    done.current = true
    const v = voiceRef.current
    if (!v || v.status !== 'connected') return v?.end()
    v.context(statsMessage(snapshot(reps, durationS * 1000, durationS), score) + extra)
    if (COACH.endOfSetSummary) v.say('[APP EVENT] set_done: the set just ended.')
    clearTimeout(hangUp.current)
    hangUp.current = setTimeout(() => voiceRef.current?.end(), COACH.hangUpAfterS * 1000)
  }, [])

  const stop = useCallback(() => {
    clearTimeout(hangUp.current)
    voiceRef.current?.end()
  }, [])

  /** A tap: mute stops the coach listening and talking; unmute mid-set starts it. */
  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    storage.set(MUTE_KEY, next ? '1' : '0')
    if (!next && !done.current) begin()
  }, [muted, begin])

  useEffect(() => {
    window.addEventListener('pagehide', stop)
    return () => {
      window.removeEventListener('pagehide', stop)
      stop()
    }
  }, [stop])

  const state: CoachState = !enabled ? 'off'
    : muted ? 'muted'
    : status === 'error' || (unavailable && status !== 'connected' && status !== 'connecting') ? 'offline'
    : status === 'connected' ? (voice?.speaking ? 'speaking' : 'listening')
    : status === 'connecting' ? 'connecting'
    : 'idle'

  const element = enabled ? (
    <Suspense fallback={null}>
      <CoachHost register={setVoice} muted={muted} volume={COACH.volume}/>
    </Suspense>
  ) : null

  return { element, state, start, prime, onRep, finish, stop, toggleMute }
}

export type CoachApi = ReturnType<typeof useCoach>
