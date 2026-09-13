import { useCallback, useEffect, useState } from 'react'
import type { Equipped } from '../config/cosmetics'
import { api } from './api'

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
  /** My rank, even when I'm outside the top of the list (null before I pick a username). */
  me: { rank: number; bestScore: number | null } | null
}

/** Everyone on the app, ranked by best set score (GET /api/leaderboard), fetched when the caller mounts. */
export function useGlobalLeaderboard() {
  const [board, setBoard] = useState<GlobalBoard | null>(null)
  const [failed, setFailed] = useState(false)
  const reload = useCallback(() => {
    api<GlobalBoard>('GET', '/api/leaderboard').then(
      b => { setBoard(b); setFailed(false) },
      () => setFailed(true),
    )
  }, [])
  useEffect(() => { reload() }, [reload])
  return { board, failed, reload }
}
