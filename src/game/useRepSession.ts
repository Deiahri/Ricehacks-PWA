import { useCallback, useRef, useState } from 'react'
import type { PoseEventPayload } from '../camera/types'
import { EXERCISES, type Exercise, type ExerciseName, type RepResult } from '../logic/exercises'
import { poseFromLandmarks } from '../logic/pose'
import { PoseTrackRecorder, trackFps } from './poseTrack'

/** performance.now() ms — the same clock as PoseEventPayload.timestampMs. */
interface CountWindow {
  countStart: number
  end: number
}

/**
 * Feeds camera frames into the rep engine inside a counting window.
 * Frames before `countStart` drive a throwaway engine, so the HUD can coach positioning during the countdown
 * ("Get into a plank") without banking reps. Frames after `end` are ignored: that is what stops counting.
 * The counting window is also recorded as a pose track for the replay screen (takeTrack).
 */
export function useRepSession(exercise: ExerciseName, onRep?: (rep: RepResult, all: RepResult[]) => void) {
  const win = useRef<CountWindow | null>(null)
  const preview = useRef<Exercise | null>(null)
  const counting = useRef<Exercise | null>(null)
  const recorder = useRef<PoseTrackRecorder | null>(null)
  const onRepRef = useRef(onRep)
  onRepRef.current = onRep
  const [reps, setReps] = useState<RepResult[]>([])
  const [status, setStatus] = useState('')
  const [notice, setNotice] = useState('')

  const arm = useCallback((countStart: number, end: number) => {
    win.current = { countStart, end }
    preview.current = EXERCISES[exercise]()
    counting.current = null
    recorder.current = new PoseTrackRecorder(countStart, end, trackFps((end - countStart) / 1000))
    setReps([])
  }, [exercise])

  const onPose = useCallback((p: PoseEventPayload) => {
    const w = win.current
    if (!w || p.timestampMs > w.end) return
    recorder.current?.push(p) // ignores the countdown
    const ex = p.timestampMs < w.countStart ? preview.current! : (counting.current ??= EXERCISES[exercise]())
    const rep = ex.update(poseFromLandmarks(p.landmarks, p.imageWidth, p.imageHeight), p.timestampMs / 1000)
    setStatus(ex.status) // unchanged values don't re-render
    setNotice(ex.notice)
    if (rep && ex === counting.current) {
      const all = [...ex.reps]
      setReps(all)
      onRepRef.current?.(rep, all)
    }
  }, [exercise])

  /** The set's pose track so far (null if no frames were recorded). */
  const takeTrack = useCallback(() => recorder.current?.encode() ?? null, [])

  return { reps, status, notice, arm, onPose, takeTrack }
}
