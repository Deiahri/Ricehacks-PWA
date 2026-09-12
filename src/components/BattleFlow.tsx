import { useState, useEffect, useRef } from 'react'
import CharacterSprite from './CharacterSprite'
import type { Player, BattleStep } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import CameraFeed from './CameraFeed'

interface Props {
  step: BattleStep
  setStep: (s: BattleStep) => void
  opponent: Player | null
  me: Player
  isSolo: boolean
  onExit: () => void
}

type RepQuality = 'red' | 'yellow' | 'green'

const QUALITY_CFG: Record<RepQuality, { label: string; color: string; pts: string; emoji: string }> = {
  red:    { label: 'Poor Form',  color: '#ff4b4b', pts: '+0 pts', emoji: '🔴' },
  yellow: { label: 'Good',       color: '#f59e0b', pts: '+1 pt',  emoji: '🟡' },
  green:  { label: 'Great!',     color: '#58cc02', pts: '+2 pts', emoji: '🟢' },
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 px-2">
      {steps.map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-game font-black"
            style={{
              background: i < current ? '#58cc02' : i === current ? '#4a90e2' : '#e8edf5',
              color: i <= current ? '#fff' : '#7a8ba8',
              border: `2.5px solid ${i === current ? '#4a90e2' : i < current ? '#58cc02' : '#c8d0e0'}`,
            }}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mx-0.5" style={{ background: i < current ? '#58cc02' : '#c8d0e0' }}/>
          )}
        </div>
      ))}
    </div>
  )
}

// ===================== PRE-BATTLE ANIM (stays dramatic/dark) =====================

function PreBattleAnim({ me, opponent, onNext }: { me: Player; opponent: Player; onNext: () => void }) {
  const [showVS, setShowVS] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShowVS(true), 600); return () => clearTimeout(t) }, [])

  const meColor = ACCENT
  const opColor = ACCENT

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        // Diagonal split: opponent's side (top-left) red, our side (bottom-right) blue,
        // with a white dividing line running bottom-left → top-right.
        background: `linear-gradient(135deg, #ff4b4b33 0%, #ff4b4b33 49.2%, #ffffff 49.2%, #ffffff 50.8%, #4a90e233 50.8%, #4a90e233 100%)`,
      }}
    >
      {/* Header — bigger, darker, slams in */}
      <div className="flex-shrink-0 pt-24 px-6 text-center relative z-10">
        <div className="anim-slam font-game font-black text-2xl" style={{ color: '#1a2b4a', letterSpacing: '0.15em' }}>BATTLE REQUEST ACCEPTED</div>
      </div>

      {/* Diagonal arena — opponent top-left, us bottom-right, no boxes */}
      <div className="flex-1 relative">
        {/* Opponent — top-left quadrant, biased left so its left edge sits on the text's left bound */}
        <div className="anim-slide-left absolute flex flex-col items-start" style={{ top: 'calc(4% - 10px)', left: 'calc(10% - 20px)' }}>
          <div style={{ width: 160, height: 224, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 0, left: -10, transform: 'scale(2)', transformOrigin: 'bottom left' }}>
              <CharacterSprite size="md" {...opponent.appearance} {...opponent.equipment}/>
            </div>
          </div>
          <div className="text-left">
            <div className="font-game font-black" style={{ color: '#1a2b4a', fontSize: 28 }}>{opponent.name}</div>
            <div className="font-game font-bold" style={{ color: opColor, fontSize: 24 }}>Lvl {opponent.level}</div>
          </div>
        </div>

        {/* Me — bottom-right quadrant, biased right so its right edge sits on the text's right bound */}
        <div className="anim-slide-right absolute flex flex-col items-end" style={{ bottom: 'calc(6% - 10px)', right: 'calc(10% - 20px)' }}>
          <div style={{ width: 160, height: 224, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 0, right: -10, transform: 'scale(2)', transformOrigin: 'bottom right' }}>
              <CharacterSprite size="md" flip {...me.appearance} {...me.equipment}/>
            </div>
          </div>
          <div className="text-right">
            <div className="font-game font-black" style={{ color: '#1a2b4a', fontSize: 28 }}>{me.name}</div>
            <div className="font-game font-bold" style={{ color: meColor, fontSize: 24 }}>Lvl {me.level}</div>
          </div>
        </div>
      </div>

      {/* VS — centered on the whole screen / middle of the diagonal */}
      {showVS && (
        <div className="absolute z-20 select-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="anim-vs-flash font-game font-black text-7xl"
            style={{
              WebkitTextStroke: '3px #ff9600', color: '#ffd700',
              textShadow: '0 0 24px #ffd70088, 0 4px 12px rgba(255,150,0,0.4)', letterSpacing: '-2px',
            }}>
            VS
          </div>
        </div>
      )}

      <div className="flex-shrink-0 px-6 pb-14 relative z-10">
        <button
          className="w-full py-4 rounded-2xl font-game font-black text-white text-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg,#ff9600,#e74c3c)', boxShadow: '0 8px 32px rgba(255,150,0,0.5)' }}
          onClick={onNext}
        >
          Set Battle Goals →
        </button>
      </div>
    </div>
  )
}

// ===================== BATTLE GOALS (light) =====================

const GOALS = [
  { id: 'squats',  label: 'Most Squats',    time: '30 sec', icon: '🏋️' },
  { id: 'pushups', label: 'Most Push-ups',   time: '30 sec', icon: '💪' },
  { id: 'jumps',   label: 'Most Jump Jacks', time: '45 sec', icon: '⚡' },
  { id: 'lunges',  label: 'Most Lunges',     time: '30 sec', icon: '🦵' },
]

function BattleGoals({ opponent, onNext }: { me: Player; opponent: Player | null; onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="flex-shrink-0 pt-14 px-6 pb-4">
        <div className="font-game font-bold text-sm mb-1" style={{ color: '#7a8ba8' }}>STEP 2 OF 4</div>
        <h1 className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>Agree on Goals</h1>
        {opponent && (
          <p className="text-sm font-game mt-1" style={{ color: '#7a8ba8' }}>
            You & {opponent.name} must agree on the same challenge
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <div className="flex flex-col gap-3">
          {GOALS.map(goal => {
            const isSelected = selected === goal.id
            return (
              <button
                key={goal.id}
                className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-98"
                style={{
                  background: isSelected ? '#eff5ff' : '#f5f7fb',
                  border: `2.5px solid ${isSelected ? '#4a90e2' : '#c8d0e0'}`,
                  boxShadow: isSelected ? '0 4px 16px rgba(74,144,226,0.18)' : 'none',
                }}
                onClick={() => setSelected(goal.id)}
              >
                <span className="text-3xl">{goal.icon}</span>
                <div className="flex-1">
                  <div className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>{goal.label}</div>
                  <div className="font-game font-bold text-sm" style={{ color: '#7a8ba8' }}>Time limit: {goal.time}</div>
                </div>
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: isSelected ? '#4a90e2' : '#c8d0e0', background: isSelected ? '#4a90e2' : 'transparent' }}
                >
                  {isSelected && <span className="text-white text-xs font-black">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-6">
        <button
          className="w-full py-4 rounded-2xl font-game font-black text-lg transition-all active:scale-95"
          style={{
            background: selected ? 'linear-gradient(135deg,#58cc02,#3d9100)' : '#e8edf5',
            color: selected ? '#fff' : '#7a8ba8',
            border: `2.5px solid ${selected ? 'transparent' : '#c8d0e0'}`,
            boxShadow: selected ? '0 8px 28px rgba(88,204,2,0.4)' : 'none',
          }}
          disabled={!selected}
          onClick={onNext}
        >
          {selected ? '✓ Agreed — Start Recording' : 'Select a challenge to continue'}
        </button>
      </div>
    </div>
  )
}

// ===================== WORKOUT RECORDING (light) =====================

const STEP_LABELS = ['Battle', 'Goals', 'Record', 'Result']
const QUALITIES: RepQuality[] = ['green', 'green', 'yellow', 'green', 'red', 'green', 'yellow', 'green', 'green', 'green']

interface Rep { id: number; quality: RepQuality; pts: number }

const Q_COLOR: Record<RepQuality, string> = { red: '#ff4b4b', yellow: '#ffd700', green: '#58cc02' }
// Opponent's recorded/live cadence — quality per completed rep
const OPP_PATTERN: RepQuality[] = ['green', 'yellow', 'green', 'green', 'red', 'green', 'green', 'yellow', 'green', 'green', 'green', 'yellow', 'green']

interface OppSeg { start: number; end: number; quality: RepQuality }

// Fitness-competition progress bar.
//   Base – solid light track container
//   Opponent – segmented quality blocks (same block logic as the user) at 30% opacity
//   User – segmented quality blocks per completed rep, full opacity
function CompetitionProgressBar({
  userReps = [],
  running,
}: { userReps?: Rep[]; running: boolean }) {
  const TARGET = OPP_PATTERN.length
  const [oppSegs, setOppSegs] = useState<OppSeg[]>([])
  const idxRef = useRef(0)

  useEffect(() => {
    if (!running) { setOppSegs([]); idxRef.current = 0; return }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const step = () => {
      if (cancelled || idxRef.current >= TARGET) return
      const start = idxRef.current / TARGET
      const end   = (idxRef.current + 1) / TARGET
      const quality = OPP_PATTERN[idxRef.current]
      idxRef.current += 1
      setOppSegs(s => [...s, { start, end, quality }])
      // human-paced squat timing: varied, not robotic
      timer = setTimeout(step, 1500 + Math.random() * 1000)
    }
    timer = setTimeout(step, 800)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [running])

  // User blocks share the exact same logic as the opponent
  const userSegs: OppSeg[] = userReps.slice(0, TARGET).map((r, i) => ({
    start: i / TARGET,
    end: (i + 1) / TARGET,
    quality: r.quality,
  }))

  const renderBlocks = (segs: OppSeg[], opacity: number) =>
    segs.map((s, i) => (
      <div
        key={i}
        className="absolute top-0 h-full"
        style={{
          left: `${s.start * 100}%`,
          width: `${(s.end - s.start) * 100}%`,
          background: Q_COLOR[s.quality],
          opacity,
          borderRight: '1px solid rgba(255,255,255,0.5)',
        }}
      />
    ))

  return (
    <div className="relative w-full rounded-full overflow-hidden"
      style={{ height: 24, background: '#e8edf5', border: '2px solid #c8d0e0' }}>
      {/* Opponent blocks — same logic, 30% opacity */}
      {renderBlocks(oppSegs, 0.3)}
      {/* User blocks — full opacity, foreground */}
      {renderBlocks(userSegs, 1)}
    </div>
  )
}

function WorkoutRecording({ isSolo, onNext, onExit }: { isSolo: boolean; onNext: () => void; onExit: () => void }) {
  const [reps, setReps] = useState<Rep[]>([])
  const [currentQuality, setCurrentQuality] = useState<RepQuality>('green')
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [done, setDone] = useState(false)
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const repIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const repIndexRef    = useRef(0)

  const totalBP = reps.filter(r => r.quality === 'green').length * 2
    + reps.filter(r => r.quality === 'yellow').length

  const start = () => {
    setIsRunning(true); setReps([]); setTimeLeft(30); repIndexRef.current = 0

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!); clearInterval(repIntervalRef.current!)
          setIsRunning(false); setDone(true); return 0
        }
        return t - 1
      })
    }, 1000)

    repIntervalRef.current = setInterval(() => {
      const q = QUALITIES[repIndexRef.current % QUALITIES.length]
      repIndexRef.current += 1
      setCurrentQuality(q)
      setReps(prev => [...prev, { id: Date.now(), quality: q, pts: q === 'green' ? 2 : q === 'yellow' ? 1 : 0 }])
    }, 2200)
  }

  const qCfg = QUALITY_CFG[currentQuality]

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute z-20 flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ top: 16, right: 16, width: 34, height: 34, background: '#f5f7fb', border: '2px solid #c8d0e0' }}
        aria-label="Exit workout"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="#7a8ba8" strokeWidth="2.4" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Top: steps + timer — pushed down 20px, reduced height */}
      <div className="flex-shrink-0 px-4 pb-3" style={{ paddingTop: 68 }}>
        <div className="flex items-center justify-between mb-3">
          <StepIndicator steps={STEP_LABELS} current={isSolo ? 0 : 2}/>
          <div
            className="font-game font-black text-2xl"
            style={{ color: timeLeft <= 10 ? '#ff4b4b' : '#1a2b4a', minWidth: 48, textAlign: 'right' }}
          >
            {timeLeft}s
          </div>
        </div>

        {/* Progress bar — layered user-vs-opponent competition track */}
        <CompetitionProgressBar userReps={reps} running={isRunning}/>

        {isRunning && (
          <div className="flex items-center justify-between mt-2">
            <span className="font-game font-bold text-sm" style={{ color: qCfg.color }}>{qCfg.emoji} {qCfg.label}</span>
            <span className="font-game font-bold text-sm" style={{ color: qCfg.color }}>{qCfg.pts}</span>
          </div>
        )}
      </div>

      {/* Camera / skeleton area */}
      <div className="flex-1 relative mx-4 rounded-2xl overflow-hidden" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
        <CameraFeed/>

        {!isRunning && !done && (
          <div className="absolute left-3 right-16 bottom-3 px-3 py-2 rounded-xl pointer-events-none" style={{ background: '#ffffffee', border: '2px solid #c8d0e0' }}>
            <p className="font-game font-bold text-xs" style={{ color: '#7a8ba8' }}>
              Set your phone down to capture your workout. Tap Start when ready.
            </p>
          </div>
        )}

        {isRunning && (
          <>
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl" style={{ background: '#ffffffee', border: '2px solid #c8d0e0' }}>
              <span className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>{reps.length}</span>
              <span className="font-game font-bold text-sm ml-1" style={{ color: '#7a8ba8' }}>reps</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: '#fffbebee', border: '2px solid #fde68a' }}>
              <span style={{ color: '#f59e0b' }}>◆</span>
              <span className="font-game font-black text-lg" style={{ color: '#b45309' }}>{totalBP}</span>
              <span className="font-game text-xs" style={{ color: '#d97706' }}>BP</span>
            </div>
          </>
        )}
      </div>

      {/* Bottom */}
      {done ? (
        <div className="flex-shrink-0 px-4 py-4">
          <div className="rounded-2xl p-4 mb-3" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
            <div className="font-game font-black text-base mb-3 text-center" style={{ color: '#1a2b4a' }}>Session Complete! 🎉</div>
            <div className="grid grid-cols-3 gap-3">
              {([
                ['Reps', reps.length, '#1a2b4a'],
                ['BP Earned', totalBP, '#f59e0b'],
                ['Great Reps', reps.filter(r => r.quality === 'green').length, '#58cc02'],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="font-game font-black text-xl" style={{ color }}>{val}</div>
                  <div className="text-[10px] font-game text-center" style={{ color: '#7a8ba8' }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Quality strip */}
            <div className="mt-3 flex rounded-full h-3 overflow-hidden gap-px">
              {reps.length > 0
                ? reps.map((r, i) => (
                    <div key={i} className="flex-1" style={{ background: r.quality === 'green' ? '#58cc02' : r.quality === 'yellow' ? '#ffd700' : '#ff4b4b' }}/>
                  ))
                : <div className="flex-1" style={{ background: '#c8d0e0' }}/>
              }
            </div>
          </div>
          <button
            className="w-full py-4 rounded-2xl font-game font-black text-white text-base active:scale-95"
            style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 28px rgba(88,204,2,0.4)' }}
            onClick={onNext}
          >
            {isSolo ? '✓ Finish Workout' : '⚔ View Battle Result →'}
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 py-4">
          <button
            className="w-full py-4 rounded-2xl font-game font-black text-white text-xl active:scale-95"
            style={{
              background: isRunning
                ? 'linear-gradient(135deg,#ff4b4b,#c0392b)'
                : 'linear-gradient(135deg,#58cc02,#3d9100)',
              boxShadow: `0 8px 28px ${isRunning ? 'rgba(255,75,75,0.4)' : 'rgba(88,204,2,0.4)'}`,
            }}
            onClick={isRunning ? undefined : start}
            disabled={isRunning}
          >
            {isRunning ? '● Recording...' : '▶ Start Recording'}
          </button>
        </div>
      )}
    </div>
  )
}

// ===================== POST-BATTLE RESULT (light) =====================

function PostBattleResult({ me, opponent, onExit }: { me: Player; opponent: Player | null; onExit: () => void }) {
  const winnerColor = ACCENT
  const opColor     = opponent ? ACCENT : '#c8d0e0'
  const opBg        = opponent ? ACCENT_BG : '#f5f7fb'
  const meBg        = ACCENT_BG

  return (
    <div className="absolute inset-0 flex flex-col items-center" style={{ background: '#ffffff' }}>
      {/* Victory confetti — bursts from the ceiling, scatters down, fades after 2s */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => {
          const palette = ['#58cc02', '#ff9600', '#4a90e2', '#a855f7', '#ffd700', '#ff4b4b']
          const c = palette[i % palette.length]
          const left = (i * 37 + 7) % 100
          const round = i % 2 === 0
          const drift = ((i * 53) % 120) - 60
          const rotStart = (i * 47) % 360
          const rotEnd = rotStart + 360 + ((i * 90) % 360)
          const fall = 620 + ((i * 29) % 220)
          const delay = ((i * 60) % 500) / 1000
          const duration = 1.6 + ((i * 13) % 40) / 100
          return (
            <div
              key={i}
              className="absolute opacity-0"
              style={{
                background: c,
                left: `${left}%`,
                top: -24,
                width: round ? 8 : 8,
                height: round ? 8 : 18,
                borderRadius: round ? '50%' : 2,
                ['--drift' as string]: `${drift}px`,
                ['--fall' as string]: `${fall}px`,
                ['--rot-start' as string]: `${rotStart}deg`,
                ['--rot-end' as string]: `${rotEnd}deg`,
                animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
              }}
            />
          )
        })}
      </div>

      {/* Centered group: victory text + characters + rewards */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
      <div className="flex-shrink-0 text-center px-6">
        <div
          className="font-game font-black text-5xl"
          style={{ color: '#58cc02', WebkitTextStroke: '2px #3d9100', textShadow: `0 4px 20px #58cc0266`, letterSpacing: 4 }}
        >
          VICTORY!
        </div>
        <div className="font-game font-bold text-sm mt-1" style={{ color: '#7a8ba8' }}>
          {opponent ? `You defeated ${opponent.name}` : 'Solo workout complete!'}
        </div>
      </div>

      {/* Characters */}
      <div className="flex items-end justify-center gap-6 mt-6 z-10">
        {/* Winner — charges in from the left, then bumps the opponent */}
        <div className="anim-winner flex flex-col items-center gap-2">
          <div className="w-[120px] h-[120px] rounded-2xl flex items-end justify-center pb-1"
            style={{ background: meBg, border: `2.5px solid ${winnerColor}`, boxShadow: `0 8px 32px ${winnerColor}33` }}>
            <CharacterSprite size="md" {...me.appearance} {...me.equipment}/>
          </div>
          <div className="font-game font-black text-sm px-3 py-1 rounded-full text-white" style={{ background: '#ffd700', color: '#7a4f00' }}>
            👑 WINNER
          </div>
          <div className="font-game font-bold text-xs" style={{ color: '#1a2b4a' }}>{me.name}</div>
        </div>

        {/* Loser — slides in from the right at equal size, then gets knocked down/shrunk */}
        {opponent && (
          <div className="anim-loser flex flex-col items-center gap-2">
            <div className="w-[120px] h-[120px] rounded-2xl flex items-end justify-center pb-1"
              style={{ background: opBg, border: `2.5px solid ${opColor}55` }}>
              <CharacterSprite size="md" flip {...opponent.appearance} {...opponent.equipment}/>
            </div>
            <div className="font-game font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: '#fff0f0', color: '#ff4b4b', border: '2px solid #fecaca' }}>
              Defeated
            </div>
            <div className="font-game text-[10px]" style={{ color: '#7a8ba8' }}>{opponent.name}</div>
          </div>
        )}
      </div>

      {/* Final performance bars — why the user won / opponent lost */}
      <div className="mx-6 mt-6 z-10 w-[calc(100%-48px)] flex flex-col gap-3">
        {([
          [me.name, ['green','green','yellow','green','green','green','yellow','green','green','green','green','yellow','green'] as RepQuality[]],
          ...(opponent ? [[opponent.name, ['green','yellow','green','red','green','yellow','green','red','green','yellow'] as RepQuality[]] as const] : []),
        ] as [string, RepQuality[]][]).map(([name, quals]) => (
          <div key={name}>
            <div className="font-game font-bold text-[11px] mb-1" style={{ color: '#7a8ba8' }}>{name}</div>
            <div className="relative w-full rounded-full overflow-hidden flex" style={{ height: 16, background: '#e8edf5', border: '2px solid #c8d0e0' }}>
              {quals.map((q, i) => (
                <div key={i} className="h-full" style={{ flex: 1, background: Q_COLOR[q], borderRight: '1px solid rgba(255,255,255,0.5)' }}/>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Earnings */}
      <div className="mx-6 mt-6 rounded-2xl p-4 z-10 w-[calc(100%-48px)]"
        style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
        <div className="font-game font-bold text-sm mb-3 text-center" style={{ color: '#7a8ba8' }}>REWARDS EARNED</div>
        <div className="flex flex-col gap-2">
          {([
            ['Workout BP',      '+24 BP', '#f59e0b'],
            ['Victory Bonus',   '+50 BP', '#58cc02'],
            ['Training XP',     '+1 EXP', '#a855f7'],
            ['Total',           '+74 BP', '#f59e0b'],
          ] as [string, string, string][]).map(([label, val, color], i) => (
            <div
              key={label}
              className="flex items-center justify-between"
              style={{ borderTop: i === 3 ? '1.5px solid #c8d0e0' : 'none', paddingTop: i === 3 ? 8 : 0, marginTop: i === 3 ? 4 : 0 }}
            >
              <span className="font-game text-sm" style={{ color: '#7a8ba8' }}>{label}</span>
              <span className="font-game font-black text-sm" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      <div className="flex-shrink-0 px-6 py-6 w-full z-10">
        <button
          className="w-full py-4 rounded-2xl font-game font-black text-white text-lg active:scale-95"
          style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 28px rgba(88,204,2,0.4)' }}
          onClick={onExit}
        >
          ← Return to Map
        </button>
      </div>
    </div>
  )
}

// ===================== MAIN =====================

export default function BattleFlow({ step, setStep, opponent, me, isSolo, onExit }: Props) {
  const advance = () => {
    if (step === 'pre-anim') setStep('goals')
    else if (step === 'goals') setStep('recording')
    else if (step === 'recording') {
      if (isSolo) onExit()
      else setStep('result')
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {step === 'pre-anim'  && opponent && <PreBattleAnim me={me} opponent={opponent} onNext={advance}/>}
      {step === 'goals'     && <BattleGoals me={me} opponent={opponent} onNext={advance}/>}
      {step === 'recording' && <WorkoutRecording isSolo={isSolo} onNext={advance} onExit={onExit}/>}
      {step === 'result'    && <PostBattleResult me={me} opponent={opponent} onExit={onExit}/>}
    </div>
  )
}
