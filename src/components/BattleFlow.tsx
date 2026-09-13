import { useCallback, useEffect, useRef, useState } from 'react'
import CharacterSprite from './CharacterSprite'
import CameraFeed from './CameraFeed'
import type { Player, BattleStep } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import type { CameraPhase } from '../camera/usePoseCamera'
import type { ChallengeHandle, Resolution } from '../game/useChallenge'
import { useRepSession } from '../game/useRepSession'
import { avgForm, formatClock, formatDuration, repQuality, totalScore, type RepQuality } from '../game/scoring'
import {
  COUNTDOWN_MS, DURATIONS, EXERCISE_OPTIONS,
  type ChallengeResult, type DurationS, type SessionConfig, type SideResult,
} from '../game/types'
import { useSocket } from '../live/LiveProvider'
import { IDENTITY } from '../live/usePresence'
import type { ExerciseName, RepResult } from '../logic/exercises'

interface Props {
  step: BattleStep
  setStep: (s: BattleStep) => void
  opponent: Player | null
  me: Player
  isSolo: boolean
  challenge: ChallengeHandle
  onExit: () => void
}

const QUALITY_CFG: Record<RepQuality, { label: string; color: string; emoji: string }> = {
  red:    { label: 'Poor Form', color: '#ff4b4b', emoji: '🔴' },
  yellow: { label: 'Good',      color: '#f59e0b', emoji: '🟡' },
  green:  { label: 'Great!',    color: '#58cc02', emoji: '🟢' },
}

const Q_COLOR: Record<RepQuality, string> = { red: '#ff4b4b', yellow: '#ffd700', green: '#58cc02' }

const exerciseOption = (id: ExerciseName) => EXERCISE_OPTIONS.find(o => o.id === id)!
const describe = (c: SessionConfig) => `${exerciseOption(c.exercise).label} · ${formatDuration(c.durationS)}`

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

function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute z-20 flex items-center justify-center rounded-full transition-transform active:scale-90"
      style={{ top: 16, right: 16, width: 34, height: 34, background: '#f5f7fb', border: '2px solid #c8d0e0' }}
      aria-label="Exit"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 4l8 8M12 4l-8 8" stroke="#7a8ba8" strokeWidth="2.4" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

/** Re-renders every 100 ms while active; performance.now() clock (same as pose timestamps). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!active) return
    setNow(performance.now())
    const t = setInterval(() => setNow(performance.now()), 100)
    return () => clearInterval(t)
  }, [active])
  return now
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
          Vote on the Challenge →
        </button>
      </div>
    </div>
  )
}

// ===================== PICK EXERCISE + DURATION (light) =====================

function RevealPanel({ resolution, oppName }: { resolution: Resolution; oppName: string }) {
  const mine = resolution.picks[IDENTITY.id]
  const theirs = Object.entries(resolution.picks).find(([id]) => id !== IDENTITY.id)?.[1]
  const { config, coinFlips } = resolution
  const opt = exerciseOption(config.exercise)
  const flipped = [coinFlips.exercise && 'exercise', coinFlips.duration && 'time limit'].filter(Boolean).join(' and ')
  const votes: [string, SessionConfig | undefined][] = [['You', mine], [oppName, theirs]]

  return (
    <div className="flex flex-col gap-3">
      {votes.map(([who, pick], i) => pick && (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
          <span className="font-game font-bold text-sm truncate" style={{ color: '#7a8ba8' }}>{who} voted</span>
          <span className="font-game font-black text-sm flex-shrink-0" style={{ color: '#1a2b4a' }}>{describe(pick)}</span>
        </div>
      ))}

      <div className="anim-slam text-center font-game font-black text-base mt-2" style={{ color: flipped ? '#ff9600' : '#58cc02' }}>
        {flipped ? `🪙 Coin flip decided the ${flipped}!` : '✓ You both agreed'}
      </div>

      <div
        className="anim-pop-in flex flex-col items-center gap-1 p-5 rounded-3xl"
        style={{ background: ACCENT_BG, border: `2.5px solid ${ACCENT}`, animationDelay: '0.4s' }}
      >
        <span className="text-5xl">{opt.icon}</span>
        <span className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>{opt.label}</span>
        <span className="font-game font-bold text-sm" style={{ color: ACCENT }}>{formatDuration(config.durationS)} · most points wins</span>
        <span className="font-game text-xs text-center" style={{ color: '#7a8ba8' }}>{opt.hint}</span>
      </div>
    </div>
  )
}

function SessionPicker({ isSolo, opponent, challenge, onStart, onExit }: {
  isSolo: boolean
  opponent: Player | null
  challenge: ChallengeHandle
  onStart: (config: SessionConfig) => void
  onExit: () => void
}) {
  const [exercise, setExercise] = useState<ExerciseName | null>(null)
  const [durationS, setDurationS] = useState<DurationS>(30)
  const resolution = isSolo ? null : challenge.state.resolution
  const locked = !isSolo && challenge.state.myPick !== null
  const oppName = opponent?.name ?? 'your opponent'
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart

  // Both voted: show the reveal, then continue on our own so neither player stalls the other.
  useEffect(() => {
    if (!resolution) return
    const t = setTimeout(() => onStartRef.current(resolution.config), 4000)
    return () => clearTimeout(t)
  }, [resolution])

  const submit = () => {
    if (resolution) return onStart(resolution.config)
    if (!exercise || locked) return
    if (isSolo) onStart({ exercise, durationS })
    else challenge.pick({ exercise, durationS })
  }

  const button =
    resolution ? { label: "Let's go →", enabled: true }
    : locked ? { label: `Waiting for ${oppName}'s vote…`, enabled: false }
    : !exercise ? { label: 'Pick an exercise', enabled: false }
    : isSolo ? { label: '▶ Start Workout', enabled: true }
    : { label: '🔒 Lock In My Vote', enabled: true }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <ExitButton onClick={onExit}/>

      <div className="flex-shrink-0 pt-14 px-6 pb-4">
        <div className="font-game font-bold text-sm mb-1" style={{ color: '#7a8ba8' }}>{isSolo ? 'SOLO WORKOUT' : 'STEP 2 OF 4'}</div>
        <h1 className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>{isSolo ? 'Pick a Workout' : 'Vote on the Challenge'}</h1>
        {!isSolo && (
          <p className="text-sm font-game mt-1" style={{ color: '#7a8ba8' }}>
            You & {oppName} each vote. If you disagree, a coin flip decides.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        {resolution ? (
          <RevealPanel resolution={resolution} oppName={oppName}/>
        ) : (
          <div className="flex flex-col gap-3" style={{ opacity: locked ? 0.6 : 1 }}>
            {EXERCISE_OPTIONS.map(opt => {
              const isSelected = exercise === opt.id
              return (
                <button
                  key={opt.id}
                  disabled={locked}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-98"
                  style={{
                    background: isSelected ? '#eff5ff' : '#f5f7fb',
                    border: `2.5px solid ${isSelected ? '#4a90e2' : '#c8d0e0'}`,
                    boxShadow: isSelected ? '0 4px 16px rgba(74,144,226,0.18)' : 'none',
                  }}
                  onClick={() => setExercise(opt.id)}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Most {opt.label}</div>
                    <div className="font-game font-bold text-sm" style={{ color: '#7a8ba8' }}>{opt.hint}</div>
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

            <div className="font-game font-black text-sm mt-3" style={{ color: '#1a2b4a' }}>Time limit</div>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map(d => {
                const isSelected = durationS === d
                return (
                  <button
                    key={d}
                    disabled={locked}
                    onClick={() => setDurationS(d)}
                    className="py-3 rounded-2xl font-game font-black text-base transition-all active:scale-95"
                    style={{
                      background: isSelected ? '#4a90e2' : '#f5f7fb',
                      color: isSelected ? '#fff' : '#1a2b4a',
                      border: `2.5px solid ${isSelected ? '#4a90e2' : '#c8d0e0'}`,
                    }}
                  >
                    {formatDuration(d)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-6 py-6">
        <button
          className="w-full py-4 rounded-2xl font-game font-black text-lg transition-all active:scale-95"
          style={{
            background: button.enabled ? 'linear-gradient(135deg,#58cc02,#3d9100)' : '#e8edf5',
            color: button.enabled ? '#fff' : '#7a8ba8',
            border: `2.5px solid ${button.enabled ? 'transparent' : '#c8d0e0'}`,
            boxShadow: button.enabled ? '0 8px 28px rgba(88,204,2,0.4)' : 'none',
          }}
          disabled={!button.enabled}
          onClick={submit}
        >
          {button.label}
        </button>
      </div>
    </div>
  )
}

// ===================== WORKOUT RECORDING (light) =====================

// Fitness-competition progress bar: one block per rep, coloured by form.
//   Opponent – live blocks at 30% opacity underneath
//   User – blocks at full opacity on top
// The scale grows once either side passes 10 reps.
function CompetitionProgressBar({ user, opp }: { user: RepQuality[]; opp?: RepQuality[] }) {
  const target = Math.max(10, user.length, opp?.length ?? 0)

  const renderBlocks = (qs: RepQuality[], opacity: number) =>
    qs.map((q, i) => (
      <div
        key={i}
        className="absolute top-0 h-full"
        style={{
          left: `${(i / target) * 100}%`,
          width: `${100 / target}%`,
          background: Q_COLOR[q],
          opacity,
          borderRight: '1px solid rgba(255,255,255,0.5)',
        }}
      />
    ))

  return (
    <div className="relative w-full rounded-full overflow-hidden"
      style={{ height: 24, background: '#e8edf5', border: '2px solid #c8d0e0' }}>
      {opp && renderBlocks(opp, 0.3)}
      {renderBlocks(user, 1)}
    </div>
  )
}

function QualityStrip({ scores, reps, height }: { scores: number[]; reps: number; height: number }) {
  return (
    <div className="relative w-full rounded-full overflow-hidden flex gap-px" style={{ height, background: '#e8edf5', border: '2px solid #c8d0e0' }}>
      {scores.length > 0
        ? scores.map((s, i) => <div key={i} className="h-full flex-1" style={{ background: Q_COLOR[repQuality(s)] }}/>)
        : Array.from({ length: reps }, (_, i) => <div key={i} className="h-full flex-1" style={{ background: '#c8d0e0' }}/>)}
    </div>
  )
}

type RecPhase = 'waiting' | 'countdown' | 'counting' | 'done'
type SaveState = 'idle' | 'saving' | 'saved' | 'no-db' | 'failed' | 'offline'

const SAVE_TEXT: Record<Exclude<SaveState, 'idle'>, [string, string]> = {
  saving:  ['Saving…', '#7a8ba8'],
  saved:   ['✓ Saved to your history', '#58cc02'],
  'no-db': ['Not saved: the server has no database configured', '#f59e0b'],
  failed:  ["Couldn't save this workout", '#ff4b4b'],
  offline: ['Not saved: you are offline', '#ff4b4b'],
}

function WorkoutRecording({ isSolo, config, opponentName, challenge, onNext, onExit }: {
  isSolo: boolean
  config: SessionConfig
  opponentName: string
  challenge: ChallengeHandle
  onNext: () => void
  onExit: () => void
}) {
  const cs = challenge.state
  const { rep: sendRep, ready: sendReady, final: sendFinal } = challenge
  const { send, subscribe } = useSocket()

  const onRep = useCallback((rep: RepResult, all: RepResult[]) => {
    if (!isSolo) sendRep(all.length, totalScore(all.map(r => r.score)), repQuality(rep.score))
  }, [isSolo, sendRep])
  const session = useRepSession(config.exercise, onRep)
  const { arm } = session

  // Solo: count down as soon as the camera is up. Challenge: tell the server; it starts both phones together.
  const [cameraReady, setCameraReady] = useState(false)
  const onPhase = useCallback((p: CameraPhase) => { if (p === 'running') setCameraReady(true) }, [])
  const [soloGoAt, setSoloGoAt] = useState<number | null>(null)
  useEffect(() => {
    if (!cameraReady) return
    if (isSolo) setSoloGoAt(t => t ?? performance.now())
    else sendReady()
  }, [cameraReady, isSolo, sendReady])

  const goAt = isSolo ? soloGoAt : cs.goAt
  const countStart = goAt === null ? null : goAt + (isSolo ? COUNTDOWN_MS : cs.countdownMs)
  const end = countStart === null ? null : countStart + config.durationS * 1000
  useEffect(() => { if (countStart !== null && end !== null) arm(countStart, end) }, [countStart, end, arm])

  const [done, setDone] = useState(false)
  const now = useNow(goAt !== null && !done)
  let phase: RecPhase
  if (done) phase = 'done'
  else if (countStart === null || end === null) phase = 'waiting'
  else if (now < countStart) phase = 'countdown'
  else if (now < end) phase = 'counting'
  else phase = 'done'

  // Time's up, or the server already settled the challenge (the opponent left).
  const timeUp = phase === 'done' || (!isSolo && cs.phase === 'result')
  useEffect(() => { if (timeUp && !done) setDone(true) }, [timeUp, done])

  const [saveState, setSaveState] = useState<SaveState>('idle')
  useEffect(() => subscribe(msg => {
    if (msg.type === 'saved') setSaveState(msg.ok ? 'saved' : msg.reason === 'no-db' ? 'no-db' : 'failed')
  }), [subscribe])

  const [finalReps, setFinalReps] = useState<RepResult[] | null>(null)
  const repsRef = useRef(session.reps)
  repsRef.current = session.reps
  useEffect(() => {
    if (!done) return
    // Let the last in-flight frame land, then freeze the set and report it.
    const t = setTimeout(() => {
      const reps = repsRef.current
      setFinalReps(reps)
      const repScores = reps.map(r => r.score)
      if (!isSolo) sendFinal(repScores)
      else setSaveState(send({ type: 'solo_result', exercise: config.exercise, durationS: config.durationS, repScores }) ? 'saving' : 'offline')
    }, 400)
    return () => clearTimeout(t)
  }, [done, isSolo, sendFinal, send, config.exercise, config.durationS])

  const reps = finalReps ?? session.reps
  const scores = reps.map(r => r.score)
  const score = totalScore(scores)
  const last = reps.length ? reps[reps.length - 1] : null
  const lastQ = last ? QUALITY_CFG[repQuality(last.score)] : null
  const remainingS = phase === 'counting' ? (end! - now) / 1000 : phase === 'done' ? 0 : config.durationS
  const countdownN = phase === 'countdown' ? Math.min(10, Math.max(1, Math.ceil((countStart! - now) / 1000))) : 0
  const showGo = phase === 'counting' && now - countStart! < 900
  const coach = session.status || session.notice || (last ? last.cues[0] : '')
  const opponentLeft = !isSolo && cs.result?.forfeit === true && cs.result.winnerId === cs.result.you.id

  const exit = () => {
    const live = phase === 'countdown' || phase === 'counting'
    if (!isSolo && live && !window.confirm(`Leave the battle? ${opponentName} wins by forfeit.`)) return
    onExit()
  }

  const statusLabel =
    phase === 'waiting' ? (cameraReady && !isSolo ? `Waiting for ${opponentName}…` : 'Starting camera…')
    : phase === 'countdown' ? 'Get ready…'
    : '● Recording…'

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <ExitButton onClick={exit}/>

      {/* Top: steps + timer */}
      <div className="flex-shrink-0 px-4 pb-3" style={{ paddingTop: 68 }}>
        <div className="flex items-center justify-between mb-3">
          {isSolo
            ? <StepIndicator steps={['Pick', 'Record', 'Done']} current={phase === 'done' ? 2 : 1}/>
            : <StepIndicator steps={['Battle', 'Vote', 'Record', 'Result']} current={2}/>}
          <div
            className="font-game font-black text-2xl"
            style={{ color: phase === 'counting' && remainingS <= 10 ? '#ff4b4b' : '#1a2b4a', minWidth: 64, textAlign: 'right' }}
          >
            {formatClock(remainingS)}
          </div>
        </div>

        <CompetitionProgressBar user={reps.map(r => repQuality(r.score))} opp={isSolo ? undefined : cs.opp.qualities}/>

        {!isSolo && (
          <div className="flex items-center justify-between mt-2 font-game font-bold text-xs">
            <span style={{ color: '#1a2b4a' }}>You · {score} pts</span>
            <span className="truncate ml-3" style={{ color: '#7a8ba8' }}>{opponentName} · {cs.opp.score} pts</span>
          </div>
        )}

        {phase === 'counting' && last && lastQ && (
          <div className="flex items-center justify-between mt-2">
            <span className="font-game font-bold text-sm" style={{ color: lastQ.color }}>{lastQ.emoji} {lastQ.label}</span>
            <span className="font-game font-bold text-sm" style={{ color: lastQ.color }}>+{(last.score / 10).toFixed(1)} pts</span>
          </div>
        )}
      </div>

      {/* Camera / skeleton area */}
      <div className="flex-1 relative mx-4 rounded-2xl overflow-hidden" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
        <CameraFeed onPose={session.onPose} onPhase={onPhase}/>

        {phase === 'waiting' && cameraReady && !isSolo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-xl font-game font-bold text-sm" style={{ background: '#ffffffee', border: '2px solid #c8d0e0', color: '#7a8ba8' }}>
              Waiting for {opponentName}'s camera…
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 pointer-events-none" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <div key={countdownN} className="anim-slam font-game font-black" style={{ fontSize: 96, lineHeight: 1, color: '#1a2b4a', WebkitTextStroke: '3px #ffffff' }}>
              {countdownN}
            </div>
            <div className="font-game font-black text-base px-3 py-1 rounded-xl" style={{ background: '#ffffffee', color: '#1a2b4a' }}>
              Get in position · {exerciseOption(config.exercise).hint}
            </div>
            <div className="font-game font-bold text-xs px-3 py-1 rounded-xl" style={{ background: '#ffffffee', color: session.status ? '#f59e0b' : '#58cc02' }}>
              {session.status || '✓ You’re in frame'}
            </div>
          </div>
        )}

        {showGo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="anim-slam font-game font-black" style={{ fontSize: 88, color: '#58cc02', WebkitTextStroke: '3px #ffffff' }}>GO!</div>
          </div>
        )}

        {(phase === 'counting' || phase === 'done') && (
          <>
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl" style={{ background: '#ffffffee', border: '2px solid #c8d0e0' }}>
              <span className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>{reps.length}</span>
              <span className="font-game font-bold text-sm ml-1" style={{ color: '#7a8ba8' }}>reps</span>
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: '#fffbebee', border: '2px solid #fde68a' }}>
              <span style={{ color: '#f59e0b' }}>◆</span>
              <span className="font-game font-black text-lg" style={{ color: '#b45309' }}>{score}</span>
              <span className="font-game text-xs" style={{ color: '#d97706' }}>pts</span>
            </div>
          </>
        )}

        {phase === 'counting' && coach && (
          <div className="absolute left-3 right-16 bottom-3 px-3 py-2 rounded-xl pointer-events-none" style={{ background: '#ffffffee', border: '2px solid #c8d0e0' }}>
            <p className="font-game font-bold text-xs" style={{ color: session.status ? '#f59e0b' : '#1a2b4a' }}>{coach}</p>
          </div>
        )}
      </div>

      {/* Bottom */}
      {phase === 'done' ? (
        <div className="flex-shrink-0 px-4 py-4">
          <div className="rounded-2xl p-4 mb-3" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
            <div className="font-game font-black text-base mb-3 text-center" style={{ color: '#1a2b4a' }}>
              {isSolo ? 'Workout Complete! 🎉' : opponentLeft ? `${opponentName} left the battle` : "Time's up! ⏱"}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                ['Reps', String(reps.length), '#1a2b4a'],
                ['Score', `${score} pts`, '#f59e0b'],
                ['Avg Form', `${avgForm(scores)}%`, '#58cc02'],
              ] as [string, string, string][]).map(([label, val, color]) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="font-game font-black text-xl" style={{ color }}>{val}</div>
                  <div className="text-[10px] font-game text-center" style={{ color: '#7a8ba8' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <QualityStrip scores={scores} reps={reps.length} height={12}/>
            </div>
            {isSolo && saveState !== 'idle' && (
              <div className="mt-2 text-center font-game font-bold text-xs" style={{ color: SAVE_TEXT[saveState][1] }}>
                {SAVE_TEXT[saveState][0]}
              </div>
            )}
          </div>
          {isSolo || cs.phase === 'result' ? (
            <button
              className="w-full py-4 rounded-2xl font-game font-black text-white text-base active:scale-95"
              style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 28px rgba(88,204,2,0.4)' }}
              onClick={onNext}
            >
              {isSolo ? '✓ Finish Workout' : '⚔ View Battle Result →'}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 rounded-2xl font-game font-black text-base"
              style={{ background: '#e8edf5', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
            >
              Waiting for {opponentName}'s score…
            </button>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 py-4">
          <button
            disabled
            className="w-full py-4 rounded-2xl font-game font-black text-xl"
            style={phase === 'counting'
              ? { background: 'linear-gradient(135deg,#ff4b4b,#c0392b)', color: '#fff', boxShadow: '0 8px 28px rgba(255,75,75,0.4)' }
              : { background: '#e8edf5', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
          >
            {statusLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ===================== POST-BATTLE RESULT (light) =====================

type Role = 'winner' | 'loser' | 'draw'

function Fighter({ player, flip, role }: { player: Player; flip?: boolean; role: Role }) {
  const anim = role === 'winner' ? 'anim-winner' : role === 'loser' ? 'anim-loser' : 'anim-pop-in'
  return (
    <div className={`${anim} flex flex-col items-center gap-2`}>
      <div
        className="w-[120px] h-[120px] rounded-2xl flex items-end justify-center pb-1"
        style={role === 'loser'
          ? { background: ACCENT_BG, border: `2.5px solid ${ACCENT}55` }
          : { background: ACCENT_BG, border: `2.5px solid ${ACCENT}`, boxShadow: `0 8px 32px ${ACCENT}33` }}
      >
        <CharacterSprite size="md" flip={flip} {...player.appearance} {...player.equipment}/>
      </div>
      {role === 'winner' && (
        <div className="font-game font-black text-sm px-3 py-1 rounded-full" style={{ background: '#ffd700', color: '#7a4f00' }}>👑 WINNER</div>
      )}
      {role === 'loser' && (
        <div className="font-game font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: '#fff0f0', color: '#ff4b4b', border: '2px solid #fecaca' }}>Defeated</div>
      )}
      {role === 'draw' && (
        <div className="font-game font-bold text-xs px-2 py-0.5 rounded-full" style={{ background: ACCENT_BG, color: ACCENT, border: `2px solid ${ACCENT}55` }}>🤝 Draw</div>
      )}
      <div className="font-game font-bold text-xs" style={{ color: '#1a2b4a' }}>{player.name}</div>
    </div>
  )
}

function PostBattleResult({ me, opponent, result, onExit }: { me: Player; opponent: Player; result: ChallengeResult; onExit: () => void }) {
  const outcome = result.winnerId === null ? 'draw' : result.winnerId === result.you.id ? 'win' : 'loss'
  const [title, fill, stroke] = {
    win:  ['VICTORY!', '#58cc02', '#3d9100'],
    loss: ['DEFEAT',   '#ff4b4b', '#c0392b'],
    draw: ['DRAW',     ACCENT,    '#2f6db3'],
  }[outcome]
  const subtitle =
    outcome === 'win' ? (result.forfeit ? `${opponent.name} left the battle` : `You defeated ${opponent.name}`)
    : outcome === 'loss' ? `${opponent.name} won this round`
    : 'Dead even: same score, same reps'
  const sides: [string, SideResult][] = [['You', result.you], [opponent.name, result.opponent]]

  return (
    <div className="absolute inset-0 flex flex-col items-center" style={{ background: '#ffffff' }}>
      {/* Victory confetti — bursts from the ceiling, scatters down, fades after 2s */}
      {outcome === 'win' && (
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
                  width: 8,
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
      )}

      {/* Centered group: result text + characters + scores */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 overflow-y-auto">
        <div className="flex-shrink-0 text-center px-6">
          <div
            className="font-game font-black text-5xl"
            style={{ color: fill, WebkitTextStroke: `2px ${stroke}`, textShadow: `0 4px 20px ${fill}66`, letterSpacing: 4 }}
          >
            {title}
          </div>
          <div className="font-game font-bold text-sm mt-1" style={{ color: '#7a8ba8' }}>{subtitle}</div>
        </div>

        {/* Characters — the winner charges in from the left and bumps the loser */}
        <div className="flex items-end justify-center gap-6 mt-6 z-10">
          {outcome === 'loss' ? (
            <>
              <Fighter player={opponent} role="winner"/>
              <Fighter player={me} flip role="loser"/>
            </>
          ) : (
            <>
              <Fighter player={me} role={outcome === 'win' ? 'winner' : 'draw'}/>
              <Fighter player={opponent} flip role={outcome === 'win' ? 'loser' : 'draw'}/>
            </>
          )}
        </div>

        {/* Final performance bars — one block per rep, coloured by form */}
        <div className="mx-6 mt-6 z-10 w-[calc(100%-48px)] flex flex-col gap-3">
          {sides.map(([name, side], i) => (
            <div key={i}>
              <div className="flex justify-between gap-3 font-game font-bold text-[11px] mb-1" style={{ color: '#7a8ba8' }}>
                <span className="truncate">{name}</span>
                <span className="flex-shrink-0">{side.score} pts · {side.reps} reps</span>
              </div>
              <QualityStrip scores={side.repScores} reps={side.reps} height={16}/>
            </div>
          ))}
        </div>

        <div className="mx-6 mt-6 rounded-2xl p-4 z-10 w-[calc(100%-48px)]" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
          <div className="font-game font-bold text-sm mb-3 text-center" style={{ color: '#7a8ba8' }}>FINAL SCORE</div>
          <div className="flex flex-col gap-2">
            {([
              ['Your score', `${result.you.score} pts`, '#f59e0b'],
              [`${opponent.name}'s score`, `${result.opponent.score} pts`, '#7a8ba8'],
              ['Your avg form', `${avgForm(result.you.repScores)}%`, '#58cc02'],
            ] as [string, string, string][]).map(([label, val, color]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="font-game text-sm truncate" style={{ color: '#7a8ba8' }}>{label}</span>
                <span className="font-game font-black text-sm flex-shrink-0" style={{ color }}>{val}</span>
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

export default function BattleFlow({ step, setStep, opponent, me, isSolo, challenge, onExit }: Props) {
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const startRecording = useCallback((c: SessionConfig) => {
    setConfig(c)
    setStep('recording')
  }, [setStep])
  const result = challenge.state.result

  return (
    <div className="absolute inset-0 overflow-hidden">
      {step === 'pre-anim'  && opponent && <PreBattleAnim me={me} opponent={opponent} onNext={() => setStep('pick')}/>}
      {step === 'pick'      && <SessionPicker isSolo={isSolo} opponent={opponent} challenge={challenge} onStart={startRecording} onExit={onExit}/>}
      {step === 'recording' && config && (
        <WorkoutRecording
          isSolo={isSolo}
          config={config}
          opponentName={opponent?.name ?? 'Opponent'}
          challenge={challenge}
          onNext={isSolo ? onExit : () => setStep('result')}
          onExit={onExit}
        />
      )}
      {step === 'result' && opponent && result && <PostBattleResult me={me} opponent={opponent} result={result} onExit={onExit}/>}
    </div>
  )
}
