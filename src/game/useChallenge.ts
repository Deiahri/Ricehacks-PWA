import { useCallback, useEffect, useReducer } from 'react'
import { useSocket } from '../live/LiveProvider'
import type { ServerMessage } from '../live/usePresence'
import type { FinalPayload } from './repDetail'
import type { RepQuality } from './scoring'
import {
  COUNTDOWN_MS, type ChallengeResult, type DuelEvent, type DuelSide, type DuelView, type Loadout, type RemoteBrief,
  type SessionConfig,
} from './types'

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
  /** Starting HP, from the go message (null = a server without the HP duel). */
  hpMax: number | null
  /** Each fighter's battle items, by presence connection id. */
  loadouts: Record<string, Loadout> | null
  /** Latest live HP duel; `seq` counts updates (a new event toast per update). */
  duel: (DuelView & { event: DuelEvent | null; seq: number }) | null
  result: ChallengeResult | null
  ended: EndStatus | null
}

const IDLE: ChallengeState = {
  phase: 'idle', challengeId: null, opponent: null, myPick: null, resolution: null,
  goAt: null, countdownMs: COUNTDOWN_MS, opp: { reps: 0, score: 0, qualities: [] },
  hpMax: null, loadouts: null, duel: null, result: null, ended: null,
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
      return {
        ...s, phase: 'live', goAt: at, countdownMs: Number(m.countdownMs) || COUNTDOWN_MS,
        hpMax: typeof m.hpMax === 'number' ? m.hpMax : null,
        loadouts: (m.loadouts as Record<string, Loadout> | undefined) ?? null,
        duel: null,
      }
    case 'challenge_hp':
      return {
        ...s,
        duel: {
          hpMax: Number(m.hpMax), you: m.you as DuelSide, opponent: m.opponent as DuelSide,
          event: (m.event as DuelEvent | null) ?? null, seq: (s.duel?.seq ?? 0) + 1,
        },
      }
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
  /** A rep landed: running totals, its grade, and its form (the server turns that into HP damage). */
  const rep = useCallback(
    (reps: number, score: number, quality: RepQuality, formScore: number) =>
      send({ type: 'challenge_rep', challengeId: id, reps, score, quality, formScore }),
    [id, send],
  )
  const final = useCallback((payload: FinalPayload) => send({ type: 'challenge_final', challengeId: id, ...payload }), [id, send])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  return { state, request, cancel, respond, pick, ready, rep, final, reset }
}

export type ChallengeHandle = ReturnType<typeof useChallenge>
