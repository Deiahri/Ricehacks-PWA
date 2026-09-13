import { useState } from 'react'
import { ACCENT, ACCENT_BG } from '../App'
import { DEFAULT_GOAL, GOAL_MAX, GOAL_MIN, GOAL_SLIDER_MAX, GOAL_STEP, clampGoal, goalTier } from '../game/xp'
import { ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'

const ERRORS: Record<string, string> = {
  'bad-goal': `Pick a number from ${GOAL_MIN} to ${GOAL_MAX}.`,
  offline: "Can't reach the server. Check your connection and try again.",
  'no-db': "The server isn't storing accounts right now.",
  'no-route': 'The server needs an update before goals can be saved.',
}

/**
 * Choose the weekly XP goal. 'first' fills the screen right after the username is picked (it's required);
 * 'edit' is a sheet over the profile or the progress tab.
 */
export default function GoalPicker({ mode, onClose }: {
  mode: 'first' | 'edit'
  onClose?: () => void
}) {
  const { status, profile, setWeeklyGoal } = useProfile()
  const [goal, setGoal] = useState(profile?.weeklyGoal ?? DEFAULT_GOAL)
  const [custom, setCustom] = useState(goal > GOAL_SLIDER_MAX)
  const [text, setText] = useState(String(goal))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = goal >= GOAL_MIN && goal <= GOAL_MAX
  const unchanged = mode === 'edit' && goal === profile?.weeklyGoal
  const waking = status === 'loading' || status === 'offline'

  const submit = async () => {
    if (!valid || busy || unchanged) return
    setBusy(true)
    setError(null)
    try {
      await setWeeklyGoal(goal)
      onClose?.()
    } catch (e) {
      const code = e instanceof ApiError ? (e.status === 404 ? 'no-route' : e.code) : ''
      setError(ERRORS[code] ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const pick = (n: number) => { setGoal(n); setText(String(n)); setError(null) }
  const pct = ((Math.min(goal, GOAL_SLIDER_MAX) - GOAL_MIN) / (GOAL_SLIDER_MAX - GOAL_MIN)) * 100

  const form = (
    <div className="w-full flex flex-col items-center">
      {/* The number */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-game font-black leading-none" style={{ fontSize: 56, color: '#1a2b4a' }}>{goal}</span>
        <span className="font-game font-black text-xl" style={{ color: ACCENT }}>XP</span>
      </div>
      <span className="mt-1 px-3 py-1 rounded-full font-game font-black text-xs" style={{ background: ACCENT_BG, color: ACCENT, border: `2px solid ${ACCENT}55` }}>
        {goalTier(goal)} · {Math.ceil(goal / 2)}–{goal} reps a week
      </span>

      {custom ? (
        <div className="w-full mt-5">
          <div
            className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl"
            style={{ background: '#f5f7fb', border: `2.5px solid ${error ? '#ff4b4b' : valid ? ACCENT : '#c8d0e0'}` }}
          >
            <input
              autoFocus
              value={text}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              aria-label="Weekly XP goal"
              onChange={e => {
                const t = e.target.value.replace(/\D/g, '')
                setText(t)
                setError(null)
                if (t) setGoal(Number(t))
              }}
              onBlur={() => { if (text) pick(clampGoal(Number(text))) }}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              className="flex-1 min-w-0 bg-transparent outline-none font-game font-black text-lg"
              style={{ color: '#1a2b4a' }}
            />
            <span className="font-game font-bold text-sm" style={{ color: '#7a8ba8' }}>XP / week</span>
          </div>
          <button
            onClick={() => { setCustom(false); pick(Math.min(goal, GOAL_SLIDER_MAX)) }}
            className="mt-2 font-game font-bold text-xs underline"
            style={{ color: '#7a8ba8' }}
          >
            Back to the slider
          </button>
        </div>
      ) : (
        <div className="w-full mt-5">
          <input
            type="range"
            min={GOAL_MIN}
            max={GOAL_SLIDER_MAX}
            step={GOAL_STEP}
            value={Math.min(goal, GOAL_SLIDER_MAX)}
            onChange={e => pick(Number(e.target.value))}
            aria-label="Weekly XP goal"
            aria-valuetext={`${goal} XP a week`}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${ACCENT} ${pct}%, #dcebff ${pct}%)`, accentColor: ACCENT }}
          />
          <div className="flex justify-between mt-1 font-game font-bold text-[11px]" style={{ color: '#7a8ba8' }}>
            <span>Chill · {GOAL_MIN}</span>
            <span>All in · {GOAL_SLIDER_MAX}</span>
          </div>
          <button
            onClick={() => { setCustom(true); setText(String(goal)) }}
            className="mt-2 font-game font-bold text-xs underline"
            style={{ color: '#7a8ba8' }}
          >
            Want more? Type your own
          </button>
        </div>
      )}

      {/* How points work */}
      <div className="w-full mt-5 rounded-2xl px-4 py-3 text-left" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
        <div className="flex items-center justify-between font-game font-bold text-sm" style={{ color: '#b45309' }}>
          <span>Any rep</span><span>+1 XP</span>
        </div>
        <div className="flex items-center justify-between font-game font-black text-sm mt-1" style={{ color: '#3d9100' }}>
          <span>🟢 Perfect-form rep</span><span>+2 XP</span>
        </div>
      </div>
      <p className="font-game font-bold text-sm mt-4 text-center" style={{ color: '#1a2b4a' }}>
        Hit your goal any way you want across the week — it all adds up by Sunday.
      </p>
      <p className="text-xs font-game font-bold mt-2 min-h-4 text-center" style={{ color: error ? '#ff4b4b' : '#7a8ba8' }}>
        {error ?? (mode === 'first' ? 'You can change it any time from your profile.' : 'Applies to this week too.')}
      </p>
    </div>
  )

  if (mode === 'edit') {
    return (
      <div className="absolute inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
        <div
          className="anim-fade-up w-full rounded-t-3xl px-5 pt-5 max-h-full overflow-y-auto"
          style={{ background: '#ffffff', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          onClick={e => e.stopPropagation()}
        >
          <h2 className="font-game font-black text-xl mb-3" style={{ color: '#1a2b4a' }}>Weekly goal</h2>
          {form}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-game font-bold text-sm active:scale-95"
              style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={!valid || busy || unchanged}
              className="flex-1 py-3 rounded-2xl font-game font-black text-sm text-white active:scale-95 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)` }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[80] flex flex-col" style={{ background: '#ffffff' }}>
      <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center justify-center text-center" style={{ paddingTop: 'var(--top-gap)' }}>
        <div className="text-5xl mb-2">🎯</div>
        <h1 className="font-game font-black text-3xl" style={{ color: '#1a2b4a' }}>How hard do you want to train?</h1>
        <p className="font-game text-sm mt-1 mb-5" style={{ color: '#7a8ba8' }}>
          Set the XP you'll go for each week.
        </p>
        {form}
        {waking && (
          <div className="mt-3 px-3 py-1.5 rounded-full font-game font-bold text-xs" style={{ background: '#fffbeb', border: '2px solid #fde68a', color: '#b45309' }}>
            Waking up the server… this can take a minute
          </div>
        )}
      </div>
      <div className="flex-shrink-0 px-6 pt-4 flex flex-col items-center gap-3" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => void submit()}
          disabled={!valid || busy}
          className="w-full py-4 rounded-2xl font-game font-black text-lg text-white active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 28px rgba(88,204,2,0.4)' }}
        >
          {busy ? 'Saving…' : "Let's go →"}
        </button>
      </div>
    </div>
  )
}
