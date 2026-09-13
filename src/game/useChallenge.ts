import { useCallback, useEffect, useReducer } from 'react'
import { useSocket } from '../live/LiveProvider'
import type { ServerMessage } from '../live/usePresence'
import type { RepQuality } from './scoring'
import { COUNTDOWN_MS, type ChallengeResult, type RemoteBrief, type SessionConfig } from './types'

/** Why a challenge ended before a result. 'disconnected' = our own socket dropped. */
export type EndStatus = 'declined' | 'cancelled' | 'timeout' | 'busy' | 'offline' | 'left' | 'disconnected'
export type ChallengePhase = 'idle' | 'outgoing' | 'incoming' | 'picking' | 'resolved' | 'live' | 'result' | 'ended'

export interface Resolution {
  /** Each player's vote, keyed by presence connection id. */
  picks: Record<string, SessionConfig>
  config: SessionConfig
  coinFlips: { exercise: boolean; duration: boolean }
}

export interface ChallengeState {
  phase: ChallengePhase
  challengeId: string | null
  opponent: RemoteBrief | null
  myPick: SessionConfig | null
  resolution: Resolution | null
  /** performance.now() when the server said go; the countdown starts here. */
  goAt: number | null
  countdownMs: number
  opp: { reps: number; score: number; qualities: RepQuality[] }
  result: ChallengeResult | null
  ended: EndStatus | null
}

const IDLE: ChallengeState = {
  phase: 'idle', challengeId: null, opponent: null, myPick: null, resolution: null,
  goAt: null, countdownMs: COUNTDOWN_MS, opp: { reps: 0, score: 0, qualities: [] }, result: null, ended: null,
}

type Action =
  | { type: 'request'; opponent: RemoteBrief }
  | { type: 'pick'; config: SessionConfig }
  | { type: 'end'; status: EndStatus }
  | { type: 'reset' }
  | { type: 'server'; msg: ServerMessage; at: number }

function onServer(s: ChallengeState, m: ServerMessage, at: number): ChallengeState {
  const id = typeof m.challengeId === 'string' ? m.challengeId : null
  if (m.type === 'challenge_outgoing') {
    return s.phase === 'outgoing' && !s.challengeId ? { ...s, challengeId: id, opponent: (m.opponent as RemoteBrief) ?? s.opponent } : s
  }
  if (m.type === 'challenge_incoming') {
    return s.phase === 'idle' ? { ...IDLE, phase: 'incoming', challengeId: id, opponent: m.from as RemoteBrief } : s
  }
  if (!id || id !== s.challengeId) return s // stale message from a challenge we already left

  switch (m.type) {
    case 'challenge_update':
      return s.phase === 'result' || s.phase === 'ended' ? s : { ...s, phase: 'ended', ended: m.status as EndStatus }
    case 'challenge_accepted':
      return { ...s, phase: 'picking', opponent: m.opponent as RemoteBrief }
    case 'challenge_resolved':
      return {
        ...s,
        phase: 'resolved',
        resolution: {
          picks: m.picks as Resolution['picks'],
          config: { exercise: m.exercise, durationS: m.durationS } as SessionConfig,
          coinFlips: m.coinFlips as Resolution['coinFlips'],
        },
      }
    case 'challenge_go':
      return { ...s, phase: 'live', goAt: at, countdownMs: Number(m.countdownMs) || COUNTDOWN_MS }
    case 'challenge_opp': {
      const reps = Number(m.reps) || 0
      const qualities = reps > s.opp.qualities.length ? [...s.opp.qualities, m.quality as RepQuality] : s.opp.qualities
      return { ...s, opp: { reps, score: Number(m.score) || 0, qualities } }
    }
    case 'challenge_result':
      return { ...s, phase: 'result', result: m as unknown as ChallengeResult }
  }
  return s
}

function reducer(s: ChallengeState, a: Action): ChallengeState {
  switch (a.type) {
    case 'request': return { ...IDLE, phase: 'outgoing', opponent: a.opponent }
    case 'pick': return { ...s, myPick: a.config }
    case 'end': return s.phase === 'idle' ? s : { ...s, phase: 'ended', ended: a.status }
    case 'reset': return IDLE
    case 'server': return onServer(s, a.msg, a.at)
  }
}

/** Client side of the 1v1 challenge protocol (see the backend README). Mounted once, at App level. */
export function useChallenge() {
  const { connected, send, subscribe } = useSocket()
  const [state, dispatch] = useReducer(reducer, IDLE)

  useEffect(
    () => subscribe((msg) => {
      if (msg.type.startsWith('challenge_')) dispatch({ type: 'server', msg, at: performance.now() })
    }),
    [subscribe],
  )

  // The server ends a challenge when either socket drops, so mirror that locally.
  const active = state.phase !== 'idle' && state.phase !== 'ended' && state.phase !== 'result'
  useEffect(() => {
    if (!connected && active) dispatch({ type: 'end', status: 'disconnected' })
  }, [connected, active])

  const id = state.challengeId
  const request = useCallback((opponent: RemoteBrief) => {
    dispatch({ type: 'request', opponent })
    if (!send({ type: 'challenge_request', to: opponent.id })) dispatch({ type: 'end', status: 'disconnected' })
  }, [send])
  /** Withdraw a request, leave the pick screen, or forfeit mid-set. */
  const cancel = useCallback(() => {
    if (id) send({ type: 'challenge_cancel', challengeId: id })
    dispatch({ type: 'reset' })
  }, [id, send])
  const respond = useCallback((accept: boolean) => {
    if (id) send({ type: 'challenge_respond', challengeId: id, accept })
    if (!accept) dispatch({ type: 'reset' })
  }, [id, send])
  const pick = useCallback((config: SessionConfig) => {
    dispatch({ type: 'pick', config })
    send({ type: 'challenge_pick', challengeId: id, ...config })
  }, [id, send])
  const ready = useCallback(() => send({ type: 'challenge_ready', challengeId: id }), [id, send])
  const rep = useCallback(
    (reps: number, score: number, quality: RepQuality) => send({ type: 'challenge_rep', challengeId: id, reps, score, quality }),
    [id, send],
  )
  const final = useCallback((repScores: number[]) => send({ type: 'challenge_final', challengeId: id, repScores }), [id, send])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return { state, request, cancel, respond, pick, ready, rep, final, reset }
}

export type ChallengeHandle = ReturnType<typeof useChallenge>
