import { useCallback, useEffect, useState } from 'react'
import type { Equipped } from '../config/cosmetics'
import { api } from './api'
import { useProfile } from './ProfileProvider'

/** One person on the global leaderboard: their best single set, any exercise or length (null = no sets yet). */
export interface GlobalEntry {
  rank: number
  username: string
  shirt: string | null
  skin: string | null
  equipped: Equipped
  level: number
  bestScore: number | null
  bestReps: number | null
  exercise: string | null
  durationS: number | null
  isMe: boolean
}

export interface GlobalBoard {
  entries: GlobalEntry[]
  /**
   * My rank, even when I'm outside the top of the list (null before I pick a username). verified: false = I'm not on
   * the board until I verify my identity (rank is then null).
   */
  me: { rank: number | null; bestScore: number | null; verified?: boolean } | null
}

/** Verified players, ranked by best set score (GET /api/leaderboard): fetched on mount and again when I verify. */
export function useGlobalLeaderboard() {
  const verified = useProfile().profile?.verified
  const [board, setBoard] = useState<GlobalBoard | null>(null)
  const [failed, setFailed] = useState(false)
  const reload = useCallback(() => {
    api<GlobalBoard>('GET', '/api/leaderboard').then(
      b => { setBoard(b); setFailed(false) },
      () => setFailed(true),
    )
  }, [])
  useEffect(() => { reload() }, [reload, verified])
  return { board, failed, reload }
}
