import { useEffect, useMemo, useState } from 'react'
import { decodeTrack, poseAt, TRACK_BONES, trackBounds, type Bounds, type Pt } from '../game/poseTrack'
import { QUALITY_CFG, Q_COLOR } from '../game/qualityLook'
import { PERFECT_FORM } from '../game/repDetail'
import { repQuality } from '../game/scoring'
import type { WorkoutDetailData, WorkoutSide } from '../live/useWorkoutInsights'

// Replay of a stored set: a stick figure from the pose track, with each rep's grade popping up as it lands.
// Older sets have no pose track (and often no rep times): those replay the reps along the timeline only.

interface Tick { t: number; s: number; cue?: string }

/** Rep moments: real times when stored, otherwise spread evenly over the set. */
function ticksOf(side: WorkoutSide | null, durationS: number): Tick[] {
  if (!side) return []
  if (side.repDetail.length && side.repDetail.length === side.repScores.length) {
    return side.repDetail.map(r => ({ t: r.t, s: r.s, cue: r.c.find(c => c !== 'Good rep') ?? r.c[0] }))
  }
  const n = side.repScores.length
  return side.repScores.map((s, i) => ({ t: ((i + 1) * durationS) / (n + 1), s }))
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function StickFigure({ points, bounds, glow }: { points: (Pt | null)[]; bounds: Bounds; glow: string | null }) {
  const { x, y, w, h } = bounds
  const sw = h * 0.028
  const [nose, ls, rs] = points // TRACK_JOINTS starts nose, left shoulder, right shoulder
  const neck = ls && rs ? ([(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2] as const) : ls ?? rs
  const body = glow ?? '#1a2b4a'
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
      {TRACK_BONES.map(([a, b]) => {
        const p = points[a], q = points[b]
        return p && q ? <line key={`${a}-${b}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={body} strokeWidth={sw} strokeLinecap="round"/> : null
      })}
      {nose && neck && <line x1={nose[0]} y1={nose[1]} x2={neck[0]} y2={neck[1]} stroke={body} strokeWidth={sw} strokeLinecap="round"/>}
      {nose && <circle cx={nose[0]} cy={nose[1]} r={h * 0.045} fill="#ffffff" stroke={body} strokeWidth={sw * 0.8}/>}
      {points.slice(1).map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={sw * 0.75} fill="#ffffff" stroke={body} strokeWidth={sw * 0.4}/>)}
    </svg>
  )
}

export default function WorkoutPlayer({ detail }: { detail: WorkoutDetailData }) {
  const D = detail.durationS
  const track = useMemo(() => (detail.track ? decodeTrack(detail.track) : null), [detail.track])
  const bounds = useMemo(() => (track ? trackBounds(track) : null), [track])
  const mine = useMemo(() => ticksOf(detail.me, D), [detail.me, D])
  const theirs = useMemo(() => ticksOf(detail.opponent, D), [detail.opponent, D])
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed
      last = now
      setT(prev => Math.min(D, prev + dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, D])
  useEffect(() => { if (playing && t >= D) setPlaying(false) }, [playing, t, D])

  const done = mine.filter(r => r.t <= t)
  const last = done.length ? done[done.length - 1] : null
  const fresh = last !== null && t - last.t < 1.4
  const q = last ? repQuality(last.s) : null
  const points = track && bounds ? poseAt(track, t) : null
  const pts = Math.round(done.reduce((a, r) => a + r.s / 10, 0))
  const toggle = () => {
    if (!playing && t >= D) setT(0)
    setPlaying(p => !p)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
      <div className="relative" style={{ height: 260, background: 'linear-gradient(180deg,#eef3fb 0%,#ffffff 100%)' }}>
        {points && bounds ? (
          <StickFigure points={points} bounds={bounds} glow={fresh && q ? Q_COLOR[q] : null}/>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-8 text-center">
            <div className="font-game font-black" style={{ fontSize: 64, lineHeight: 1, color: '#1a2b4a' }}>{done.length}</div>
            <div className="font-game font-bold text-sm" style={{ color: '#7a8ba8' }}>reps</div>
            <p className="text-[11px] font-game mt-2" style={{ color: '#9aaac4' }}>
              {detail.me.repDetail.length
                ? "The pose replay wasn't recorded for this set."
                : "Replay wasn't recorded for this workout. Sets from now on include one."}
            </p>
          </div>
        )}

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl" style={{ background: '#ffffffee', border: '2px solid #c8d0e0' }}>
          <span className="font-game font-black text-lg" style={{ color: '#1a2b4a' }}>{done.length}</span>
          <span className="font-game font-bold text-xs ml-1" style={{ color: '#7a8ba8' }}>/ {mine.length} reps</span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl" style={{ background: '#fffbebee', border: '2px solid #fde68a' }}>
          <span style={{ color: '#f59e0b' }}>◆</span>
          <span className="font-game font-black text-base" style={{ color: '#b45309' }}>{pts}</span>
          <span className="font-game text-xs" style={{ color: '#d97706' }}>pts</span>
        </div>

        {fresh && last && q && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 pointer-events-none" style={{ maxWidth: '90%' }}>
            <div key={done.length} className="anim-pop-in px-3 py-1.5 rounded-xl text-center"
              style={{ background: '#ffffffee', border: `2px solid ${QUALITY_CFG[q].color}` }}>
              <div className="font-game font-black text-sm whitespace-nowrap" style={{ color: QUALITY_CFG[q].color }}>
                Rep {done.length} · {QUALITY_CFG[q].emoji} {QUALITY_CFG[q].label} · +{(last.s / 10).toFixed(1)}
                {last.s >= PERFECT_FORM && ' ⭐'}
              </div>
              {last.cue && <div className="font-game font-bold text-[11px] truncate" style={{ color: '#4a6080' }}>{last.cue}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Timeline: my reps as bars, the opponent's as faint dots; drag to scrub */}
      <div className="relative mx-4 mt-3" style={{ height: 28 }}>
        <div className="absolute inset-x-0 rounded-full" style={{ top: 11, height: 6, background: '#e2e8f2' }}/>
        {theirs.map((r, i) => (
          <div key={`o${i}`} className="absolute rounded-full"
            style={{ left: `${(r.t / D) * 100}%`, top: 21, width: 6, height: 6, marginLeft: -3, background: Q_COLOR[repQuality(r.s)], opacity: 0.4 }}/>
        ))}
        {mine.map((r, i) => (
          <div key={i} className="absolute rounded-sm"
            style={{ left: `${(r.t / D) * 100}%`, top: 4, width: 5, height: 20, marginLeft: -2.5, background: Q_COLOR[repQuality(r.s)], opacity: r.t <= t ? 1 : 0.35 }}/>
        ))}
        <div className="absolute" style={{ left: `${(t / D) * 100}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, background: '#1a2b4a' }}/>
        <input
          type="range" min={0} max={D} step={0.05} value={t}
          onChange={e => setT(Number(e.target.value))}
          aria-label="Scrub the replay"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-3 px-4 pt-2 pb-3">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base transition-transform active:scale-90 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 4px 12px rgba(88,204,2,0.35)' }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="font-game font-bold text-sm" style={{ color: '#1a2b4a' }}>{clock(t)} / {clock(D)}</span>
        {theirs.length > 0 && (
          <span className="text-[10px] font-game truncate" style={{ color: '#9aaac4' }}>▮ you · ● {detail.opponent?.name}</span>
        )}
        <button
          onClick={() => setSpeed(s => (s === 1 ? 2 : 1))}
          className="ml-auto px-2.5 py-1 rounded-lg font-game font-black text-xs flex-shrink-0"
          style={{ background: '#ffffff', border: '2px solid #c8d0e0', color: '#4a90e2' }}
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}
