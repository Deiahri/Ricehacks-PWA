import { useEffect, useState } from 'react'
import type { PoseTrack } from '../game/poseTrack'
import type { RepDetail } from '../game/repDetail'
import type { DuelView } from '../game/types'
import type { ExerciseName } from '../logic/exercises'
import { api } from './api'

/** One side of a stored workout (GET /api/workout). repDetail is empty for sets from before replays. */
export interface WorkoutSide {
  name: string
  score: number | null
  reps: number | null
  avgForm: number | null
  repScores: number[]
  repDetail: RepDetail[]
  bp: number
}

export interface WorkoutDetailData {
  id: string
  createdAt: string
  mode: 'solo' | 'challenge'
  exercise: ExerciseName
  durationS: number
  forfeit: boolean
  result: 'win' | 'loss' | 'draw' | null
  me: WorkoutSide
  opponent: WorkoutSide | null
  battle: DuelView | null
  /** My pose track; null for older sets. */
  track: PoseTrack | null
}

/** AI (or rule-based, when the server has no Gemini key) coaching on one set. */
export interface Advice {
  headline: string
  summary: string
  tips: string[]
  focusCue: string
  source: 'gemini' | 'fallback'
}

export interface SeriesPoint {
  id: string
  createdAt: string
  mode: 'solo' | 'challenge'
  exercise: ExerciseName
  durationS: number
  score: number | null
  reps: number | null
  avgForm: number | null
  result: 'win' | 'loss' | 'draw' | null
}

export type Trend = 'improving' | 'steady' | 'slipping' | 'slacking' | 'new'

/** "How you've been doing": source 'none' = no workouts yet. */
export interface Recap {
  headline: string
  text: string
  trend: Trend
  source: 'gemini' | 'fallback' | 'none'
  count: number
}

/** GET `path` whenever it changes (null = don't fetch). */
function useGet<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; failed: boolean }>({ path: null, data: null, failed: false })
  useEffect(() => {
    if (!path) return
    let live = true
    api<T>('GET', path).then(
      data => { if (live) setState({ path, data, failed: false }) },
      () => { if (live) setState({ path, data: null, failed: true }) },
    )
    return () => { live = false }
  }, [path])
  // Ignore a previous path's answer while the new one loads.
  return state.path === path ? { data: state.data, failed: state.failed } : { data: null, failed: false }
}

export const useWorkoutDetail = (id: string) => useGet<WorkoutDetailData>(`/api/workout?id=${id}`)

/** Written on first view (slow with Gemini), cached by the server after that. */
export const useWorkoutAdvice = (id: string) => useGet<Advice>(`/api/workout/advice?id=${id}`)

/** My sets of one exercise + length (or every set, with exercise null), oldest first. */
export const useWorkoutSeries = (exercise: ExerciseName | null, durationS: number | null) =>
  useGet<SeriesPoint[]>(exercise && durationS ? `/api/workouts/series?exercise=${exercise}&durationS=${durationS}` : '/api/workouts/series')

/**
 * The progress recap. The server keeps it until I record another workout; `latestId` (my newest workout) is in the
 * path only so a new workout refetches.
 */
export const useRecap = (latestId: string | null) => useGet<Recap>(latestId ? `/api/recap?latest=${latestId}` : null)
