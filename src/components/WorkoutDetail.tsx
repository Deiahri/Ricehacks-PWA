import { useState } from 'react'
import { BattleBreakdown } from './BattleHud'
import LineChart from './LineChart'
import WorkoutPlayer from './WorkoutPlayer'
import { EXERCISE_OPTIONS } from '../game/types'
import type { WorkoutEntry } from '../live/useWorkoutHistory'
import { useWorkoutAdvice, useWorkoutDetail, useWorkoutSeries, type Advice } from '../live/useWorkoutInsights'

// One past workout, full screen: replay, AI coaching, and how it compares with my other sets.

const RESULT_LOOK = {
  win:  { label: 'WIN',  color: '#58cc02' },
  loss: { label: 'LOSS', color: '#ff4b4b' },
  draw: { label: 'DRAW', color: '#9aaac4' },
}

const setLength = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`)
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10)

function Shimmer({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="anim-skeleton h-3 rounded-full" style={{ background: '#dfe6f1', width: `${90 - i * 18}%` }}/>
      ))}
    </div>
  )
}

function AdviceCard({ data, failed }: { data: Advice | null; failed: boolean }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#eff5ff', border: '2.5px solid #bcd6f5' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>🧠 Coach's take</h3>
        {data && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-game font-black" style={{ background: '#ffffff', color: '#4a90e2', border: '1.5px solid #bcd6f5' }}>
            {data.source === 'gemini' ? '✨ AI coach' : 'Quick tips'}
          </span>
        )}
      </div>
      {failed ? (
        <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>Couldn't load coaching for this set.</p>
      ) : !data ? (
        <>
          <p className="text-xs font-game mb-3" style={{ color: '#7a8ba8' }}>Coach is reviewing your set…</p>
          <Shimmer/>
        </>
      ) : (
        <div className="anim-fade-up">
          <p className="font-game font-black text-sm" style={{ color: '#1a2b4a' }}>{data.headline}</p>
          <p className="text-[13px] font-game mt-1" style={{ color: '#4a6080' }}>{data.summary}</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {data.tips.map(tip => (
              <li key={tip} className="flex gap-2 text-[13px] font-game" style={{ color: '#1a2b4a' }}>
                <span className="flex-shrink-0 font-black" style={{ color: '#58cc02' }}>✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          {data.focusCue && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-game font-black text-xs"
              style={{ background: '#4a90e2', color: '#ffffff' }}>
              🎯 Next set: {data.focusCue}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Trends({ entry }: { entry: WorkoutEntry }) {
  const [scope, setScope] = useState<'same' | 'all'>('same')
  const same = scope === 'same'
  const { data, failed } = useWorkoutSeries(same ? entry.exercise : null, same ? entry.durationS : null)
  const label = EXERCISE_OPTIONS.find(o => o.id === entry.exercise)?.label ?? entry.exercise
  const highlight = data ? data.findIndex(s => s.id === entry.id) : -1

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>📈 Over time</h3>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '2px solid #c8d0e0' }}>
          {([['same', `${label} · ${setLength(entry.durationS)}`], ['all', 'All sets']] as const).map(([id, text]) => (
            <button key={id} onClick={() => setScope(id)} className="px-2.5 py-1 font-game font-bold text-[11px]"
              style={{ background: scope === id ? '#4a90e2' : '#ffffff', color: scope === id ? '#ffffff' : '#7a8ba8' }}>
              {text}
            </button>
          ))}
        </div>
      </div>
      {failed ? (
        <p className="text-xs font-game text-center py-4" style={{ color: '#7a8ba8' }}>Couldn't load your history.</p>
      ) : !data ? (
        <Shimmer lines={2}/>
      ) : data.length < 2 ? (
        <p className="text-xs font-game text-center py-4 rounded-2xl" style={{ color: '#7a8ba8', background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
          {same ? `Do another ${label.toLowerCase()} ${setLength(entry.durationS)} set to see a trend.` : 'Do another set to see a trend.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <LineChart title="Score" values={data.map(s => s.score)} color="#f59e0b" highlight={highlight} unit=" pts"/>
          <LineChart title="Form accuracy" values={data.map(s => r1(s.avgForm))} color="#58cc02" yMax={100} highlight={highlight} unit="%"/>
          <LineChart title="Reps" values={data.map(s => s.reps)} color="#4a90e2" highlight={highlight}/>
        </div>
      )}
    </div>
  )
}

export default function WorkoutDetail({ entry, onClose }: { entry: WorkoutEntry; onClose: () => void }) {
  const { data: detail, failed } = useWorkoutDetail(entry.id)
  const advice = useWorkoutAdvice(entry.id)
  const ex = EXERCISE_OPTIONS.find(o => o.id === entry.exercise)
  const pill = entry.result && RESULT_LOOK[entry.result]
  const when = new Date(entry.createdAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto anim-slide-in-right" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-(--top-gap) pb-3 flex items-center gap-3">
        <button
          onClick={onClose}
          aria-label="Back"
          className="flex items-center justify-center rounded-full transition-transform active:scale-90 flex-shrink-0"
          style={{ width: 34, height: 34, background: '#f5f7fb', border: '2px solid #c8d0e0' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="#1a2b4a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-game font-black text-xl leading-tight truncate" style={{ color: '#1a2b4a' }}>
              {ex?.icon} {ex?.label ?? entry.exercise} · {setLength(entry.durationS)}
            </h2>
            {pill && (
              <span className="px-2 rounded-full text-[10px] font-game font-black text-white flex-shrink-0" style={{ background: pill.color }}>{pill.label}</span>
            )}
          </div>
          <p className="text-xs font-game truncate" style={{ color: '#7a8ba8' }}>
            {entry.opponent ? `vs @${entry.opponent.name}` : 'Solo'} · {when}{entry.forfeit ? ' · forfeit' : ''}
          </p>
        </div>
      </div>

      <div className="px-4 pb-28 flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-2">
          {([
            ['Score', entry.score ?? '–', '#f59e0b'],
            ['Reps', entry.reps ?? '–', '#1a2b4a'],
            ['Form', entry.avgForm === null ? '–' : `${Math.round(entry.avgForm)}%`, '#58cc02'],
            ['BP', `+${entry.bp}`, '#b45309'],
          ] as [string, string | number, string][]).map(([label, val, color]) => (
            <div key={label} className="flex flex-col items-center py-2 rounded-2xl" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
              <span className="font-game font-black text-lg leading-tight" style={{ color }}>{val}</span>
              <span className="text-[10px] font-game" style={{ color: '#7a8ba8' }}>{label}</span>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-game font-black text-base mb-2" style={{ color: '#1a2b4a' }}>▶ Replay</h3>
          {failed ? (
            <p className="text-xs font-game text-center py-6 rounded-2xl" style={{ color: '#7a8ba8', background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
              Couldn't load this workout.
            </p>
          ) : detail ? (
            <WorkoutPlayer detail={detail}/>
          ) : (
            <div className="anim-skeleton rounded-2xl" style={{ height: 330, background: '#eef3fb' }}/>
          )}
        </div>

        <AdviceCard data={advice.data} failed={advice.failed}/>

        {detail?.battle && <BattleBreakdown battle={detail.battle} opponentName={detail.opponent?.name ?? 'Opponent'}/>}

        <Trends entry={entry}/>
      </div>
    </div>
  )
}
