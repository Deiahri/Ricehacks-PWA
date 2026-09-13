import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useProfile } from './ProfileProvider'

export type WeekStatus = 'open' | 'met' | 'missed'
export interface ProgressDay { date: string; xp: number; sets: number }
export interface ProgressWeek {
  /** The Monday, as YYYY-MM-DD in my zone. */
  start: string
  goal: number
  xp: number
  status: WeekStatus
  /** Streak-saver days spent keeping it open past Sunday. */
  extraDays: number
  current: boolean
  days: ProgressDay[]
}
/** GET /api/progress: my recent weeks against the goal, oldest first. */
export interface Progress {
  goal: number | null
  today: string
  thisWeek: string
  streak: number
  saverDays: number
  level: number
  pendingReward: boolean
  weeks: ProgressWeek[]
}

/** The weekly-goal calendar, fetched when the caller mounts and again whenever this week's XP or the goal changes. */
export function useProgress(weeks = 12) {
  const { profile } = useProfile()
  const [data, setData] = useState<Progress | null>(null)
  const [failed, setFailed] = useState(false)
  const reload = useCallback(() => {
    api<Progress>('GET', `/api/progress?weeks=${weeks}`).then(
      p => { setData(p); setFailed(false) },
      () => setFailed(true),
    )
  }, [weeks])
  const weekXp = profile?.weekXp
  const goal = profile?.weeklyGoal
  useEffect(() => { reload() }, [reload, weekXp, goal])
  return { data, failed, reload }
}
