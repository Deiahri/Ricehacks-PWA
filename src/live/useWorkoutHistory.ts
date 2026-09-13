import { useCallback, useEffect, useState } from 'react'
import type { ExerciseName } from '../logic/exercises'
import { api } from './api'

/** One of my stored sets, seen from my side (a battle's opponent is the other player). */
export interface WorkoutEntry {
  id: string
  createdAt: string
  mode: 'solo' | 'challenge'
  exercise: ExerciseName
  durationS: number
  score: number | null
  reps: number | null
  /** Mean form 0-100 (null for some older battles). */
  avgForm: number | null
  bp: number
  forfeit: boolean
  opponent: { name: string; score: number | null } | null
  /** null for solo sets. */
  result: 'win' | 'loss' | 'draw' | null
  /** A pose track was recorded, so the replay shows a moving figure. */
  hasReplay: boolean
}

/** My latest workouts, newest first (GET /api/workouts), fetched when the caller mounts. */
export function useWorkoutHistory() {
  const [items, setItems] = useState<WorkoutEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const reload = useCallback(() => {
    api<WorkoutEntry[]>('GET', '/api/workouts').then(
      w => { setItems(w); setFailed(false) },
      () => setFailed(true),
    )
  }, [])
  useEffect(() => { reload() }, [reload])
  return { items, failed, reload }
}
