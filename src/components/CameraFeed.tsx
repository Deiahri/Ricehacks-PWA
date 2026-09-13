import { useCallback, useEffect, useRef, useState } from 'react'
import type { Model } from '../camera/landmarker'
import type { Facing } from '../camera/stream'
import type { Landmark, PoseEventPayload } from '../camera/types'
import { usePoseCamera, type CameraPhase } from '../camera/usePoseCamera'
import { SKELETON, VIS_THRESHOLD } from '../logic/pose'
import { cameraErrorMessage, useElementSize, useWakeLock } from '../platform'

type Frame = {
  landmarks: Landmark[]
  imageWidth: number
  imageHeight: number
  mirrored: boolean
}

const MODEL: Model = 'full'

interface Props {
  /** Every pose frame (the rep engine hooks in here). */
  onPose?: (p: PoseEventPayload) => void
  /** Camera/model startup progress; 'running' = frames are flowing. */
  onPhase?: (phase: CameraPhase) => void
}

// Live camera + pose skeleton for the Workout Recording step. Fills its (relative) parent.
export default function CameraFeed({ onPose: onPoseProp, onPhase }: Props) {
  useWakeLock()
  const videoRef = useRef<HTMLVideoElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(boxRef)
  const [facing, setFacing] = useState<Facing>('front')
  const [frame, setFrame] = useState<Frame | null>(null)
  const [error, setError] = useState('')
  const onPoseRef = useRef(onPoseProp)
  onPoseRef.current = onPoseProp

  const onPose = useCallback((p: PoseEventPayload) => {
    onPoseRef.current?.(p)
    setFrame({ landmarks: p.landmarks, imageWidth: p.imageWidth, imageHeight: p.imageHeight, mirrored: p.mirrored })
  }, [])

  const onError = useCallback((e: unknown) => {
    console.error(e)
    setError(cameraErrorMessage(e))
  }, [])

  const phase = usePoseCamera(videoRef, { model: MODEL, facing, onPose, onError })
  useEffect(() => onPhase?.(phase), [phase, onPhase])
  const loading = phase === 'camera' ? 'Starting camera…' : phase === 'model' ? 'Loading pose model…' : ''

  return (
    <div ref={boxRef} className="absolute inset-0" style={{ background: '#e8edf5' }}>
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${facing === 'front' ? '-scale-x-100' : ''}`}
        playsInline
        muted
        autoPlay
      />
      {frame && size.width > 0 && <PoseSkeleton frame={frame} width={size.width} height={size.height}/>}

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-xl font-game font-bold text-sm" style={{ background: '#ffffffee', border: '2px solid #c8d0e0', color: '#7a8ba8' }}>
            {loading}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="font-game font-bold text-sm text-center rounded-xl px-4 py-3" style={{ background: '#fff0f0', border: '2px solid #ffb3b3', color: '#c0392b' }}>
            {error}
          </p>
        </div>
      )}

      <button
        onClick={() => {
          setError('')
          setFrame(null)
          setFacing(f => (f === 'front' ? 'back' : 'front'))
        }}
        className="absolute bottom-3 right-3 z-10 flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ width: 40, height: 40, background: '#ffffffee', border: '2px solid #c8d0e0' }}
        aria-label="Flip camera"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 12a8 8 0 0113.66-5.66L20 8.5M20 12a8 8 0 01-13.66 5.66L4 15.5" stroke="#7a8ba8" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M20 4v4.5h-4.5M4 20v-4.5h4.5" stroke="#7a8ba8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

/** Landmarks are normalized to the camera image; the video fills the box with object-fit: cover. */
function PoseSkeleton({ frame, width, height }: { frame: Frame; width: number; height: number }) {
  const { landmarks, imageWidth: w, imageHeight: h, mirrored } = frame
  if (landmarks.length === 0 || !w || !h) return null
  const scale = Math.max(width / w, height / h)
  const dx = (width - w * scale) / 2
  const dy = (height - h * scale) / 2
  const pt = (i: number) => {
    const x = landmarks[i].x * w * scale + dx
    return { x: mirrored ? width - x : x, y: landmarks[i].y * h * scale + dy }
  }
  const visible = (i: number) => landmarks[i].visibility >= VIS_THRESHOLD
  const joints = [...new Set(SKELETON.flat())]

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
      {SKELETON.filter(([a, b]) => visible(a) && visible(b)).map(([a, b]) => {
        const p = pt(a), q = pt(b)
        return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#ffffff" strokeWidth={4} strokeLinecap="round"/>
      })}
      {joints.map(i => {
        const p = pt(i)
        return <circle key={i} cx={p.x} cy={p.y} r={6} fill={visible(i) ? '#58cc02' : '#ff4b4b'} stroke="#ffffff" strokeWidth={1.5}/>
      })}
    </svg>
  )
}
