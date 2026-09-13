import { useState } from 'react'
import CharacterSprite from './CharacterSprite'
import GoalPicker from './GoalPicker'
import UnverifiedTag from './UnverifiedTag'
import WorkoutDetail from './WorkoutDetail'
import { ACCENT, ACCENT_BG } from '../theme'
import { skinColors } from '../config/appearance'
import type { Equipped } from '../config/cosmetics'
import { EXERCISE_OPTIONS } from '../game/types'
import { goalPct } from '../game/xp'
import { ApiError } from '../live/api'
import { useProgress, type ProgressDay, type ProgressWeek } from '../live/useProgress'
import { useWorkoutHistory, type WorkoutEntry } from '../live/useWorkoutHistory'
import { useRecap, type Trend } from '../live/useWorkoutInsights'
import { useProfile, type Friend } from '../live/ProfileProvider'

type DayState = 'trained' | 'rest' | 'missed' | 'future'

interface DayData {
  date: string
  /** Day of the month. */
  num: number
  xp: number
  state: DayState
}

/** A day's state from its XP and the week it belongs to: rest days only count as missed once the week is lost. */
function dayState(d: ProgressDay, week: ProgressWeek, today: string): DayState {
  if (d.date > today) return 'future'
  if (d.xp > 0) return 'trained'
  return week.status === 'missed' ? 'missed' : 'rest'
}

const dayOfMonth = (iso: string) => Number(iso.slice(8, 10))
const monthOf = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })

function FlameIcon({ filled = true, size = 18 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-4-3-8-3-8s0 4-3 4c0-2 1-6-2-8z"
        fill={filled ? '#ff9600' : 'transparent'}
        stroke={filled ? '#c97200' : '#c8d0e0'}
        strokeWidth="1.8"
      />
    </svg>
  )
}

function DayCell({ day, isToday }: { day: DayData; isToday: boolean }) {
  const bg: Record<DayState, string> = {
    trained: '#f0fff0',
    missed:  '#fff0f0',
    rest:    '#f5f7fb',
    future:  'transparent',
  }
  const border: Record<DayState, string> = {
    trained: '#58cc02',
    missed:  '#ff4b4b',
    rest:    '#c8d0e0',
    future:  'transparent',
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-1.5 gap-0.5"
      title={day.xp ? `${day.xp} XP` : undefined}
      style={{
        background: isToday ? '#eff5ff' : bg[day.state],
        border: `2px solid ${isToday ? '#4a90e2' : border[day.state]}`,
        minHeight: 52,
      }}
    >
      <span
        className="font-game font-bold text-xs leading-none"
        style={{ color: isToday ? '#4a90e2' : day.state === 'future' ? '#c8d0e0' : '#1a2b4a' }}
      >
        {day.num}
      </span>
      {day.state === 'trained' && (
        <span className="flex items-center gap-0.5">
          <FlameIcon filled size={14}/>
          <span className="font-game font-black text-[10px] leading-none" style={{ color: '#3d9100' }}>{day.xp}</span>
        </span>
      )}
      {day.state === 'missed' && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2L2 12" stroke="#ff4b4b" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {day.state === 'rest' && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#c8d0e0' }}/>
      )}
    </div>
  )
}

/** The week's total against its goal: ✓ met (🛟 when a saver helped), ✗ missed, or how far along it is. */
function WeekCell({ week }: { week: ProgressWeek }) {
  const met = week.status === 'met'
  const missed = week.status === 'missed'
  const color = met ? '#3d9100' : missed ? '#ff4b4b' : week.current ? ACCENT : '#2f6fc0'
  const bg = met ? '#f0fff0' : missed ? '#fff0f0' : ACCENT_BG
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-1 gap-0.5"
      title={`${week.xp} of ${week.goal} XP`}
      style={{ background: bg, border: `2px solid ${color}55`, minHeight: 52 }}
    >
      <span className="font-game font-black text-[11px] leading-none" style={{ color }}>
        {met ? `${week.xp} ✓` : missed ? `${week.xp} ✗` : `${week.xp}/${week.goal}`}
      </span>
      <span className="text-[10px] leading-none" style={{ color }}>
        {week.extraDays > 0 ? '🛟' : met ? '⭐' : missed ? '' : week.current ? 'now' : ''}
      </span>
    </div>
  )
}

/** The bar every screen uses for "this week's XP against the goal". */
export function GoalBar({ xp, goal, height = 10 }: { xp: number; goal: number | null; height?: number }) {
  const pct = goalPct(xp, goal)
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: '#dcebff', height }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#58cc02' : '#ffc300', transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }}/>
    </div>
  )
}

const WEEKS_SHOWN = 6

function CalendarView() {
  const { profile } = useProfile()
  const { data, failed } = useProgress()
  const [editingGoal, setEditingGoal] = useState(false)
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const goal = profile?.weeklyGoal ?? data?.goal ?? null
  const weekXp = profile?.weekXp ?? 0
  const ext = profile?.extension ?? null
  const weeks = data?.weeks.slice(-WEEKS_SHOWN) ?? []
  const note = (text: string) => <p className="text-xs font-game text-center py-6" style={{ color: '#7a8ba8' }}>{text}</p>

  return (
    <div className="px-4">
      {/* This week */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: profile?.weekMet ? '#f0fff0' : ACCENT_BG, border: `2px solid ${profile?.weekMet ? '#58cc02' : '#b8d4f5'}` }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="font-game font-black text-lg leading-tight" style={{ color: '#1a2b4a' }}>
              {goal === null ? 'No weekly goal yet' : profile?.weekMet ? 'Goal reached! ⭐' : `${weekXp} / ${goal} XP`}
            </div>
            <div className="font-game text-[11px]" style={{ color: '#7a8ba8' }}>
              {goal === null ? 'Set one to start a streak' : profile?.weekMet ? `${weekXp} XP this week · level ${profile?.level ?? data?.level ?? 1}` : `${goal - weekXp} more by Sunday · any way you like`}
            </div>
          </div>
          <button
            onClick={() => setEditingGoal(true)}
            disabled={!profile}
            className="flex-shrink-0 px-3 py-1.5 rounded-full font-game font-black text-xs text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: ACCENT, boxShadow: `0 2px 6px ${ACCENT}55` }}
          >
            {goal === null ? 'Set goal' : 'Change'}
          </button>
        </div>
        <GoalBar xp={weekXp} goal={goal}/>
        {ext && (
          <div className="mt-2 font-game font-bold text-[11px]" style={{ color: '#2f6fc0' }}>
            🛟 Last week is still open: {ext.xp} / {ext.goal} XP with {ext.daysLeft} more {ext.daysLeft === 1 ? 'day' : 'days'} to reach it
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="font-game font-black text-xl" style={{ color: '#1a2b4a' }}>Weekly streak</span>
        <div className="flex items-center gap-2">
          {(data?.saverDays ?? profile?.saverDays ?? 0) > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-game font-black text-xs" style={{ background: ACCENT_BG, border: `2px solid #b8d4f5`, color: '#2f6fc0' }}>
              🛟 ×{data?.saverDays ?? profile?.saverDays}
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: '#fff8ec', border: '2px solid #ffd093' }}
          >
            <div className={data && data.streak > 0 ? 'anim-flame' : ''}><FlameIcon size={16} filled={!!data && data.streak > 0}/></div>
            <span className="font-game font-black text-sm" style={{ color: '#ff9600' }}>
              {data ? `${data.streak} Week Streak` : '…'}
            </span>
          </div>
        </div>
      </div>

      {failed ? note("Couldn't load your progress.")
        : !data ? note('Loading…')
        : goal === null ? note('Your weeks show up here once you set a goal.')
        : weeks.length === 0 ? note('Your first week starts now. Finish a set and it lights up.')
        : (
          <>
            <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr) 52px' }}>
              {weekDays.map(d => (
                <div key={d} className="text-center text-[10px] font-game font-bold py-1" style={{ color: '#7a8ba8' }}>{d}</div>
              ))}
              <div className="text-center text-[10px] font-game font-bold py-1" style={{ color: '#7a8ba8' }}>Week</div>
            </div>
            <div className="flex flex-col gap-1">
              {weeks.map(week => (
                <div key={week.start}>
                  {(week === weeks[0] || dayOfMonth(week.start) <= 7) && (
                    <div className="font-game font-bold text-[10px] pl-1 mb-0.5" style={{ color: '#9aaac4' }}>{monthOf(week.start)}</div>
                  )}
                  <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr) 52px' }}>
                    {week.days.map(d => (
                      <DayCell key={d.date} isToday={d.date === data.today}
                        day={{ date: d.date, num: dayOfMonth(d.date), xp: d.xp, state: dayState(d, week, data.today) }}/>
                    ))}
                    <WeekCell week={week}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center flex-wrap">
              {([
                ['#58cc02', 'Trained'],
                ['#ff4b4b', 'Missed'],
                ['#c8d0e0', 'Rest'],
                ['#2f6fc0', '🛟 Saver used'],
              ] as [string, string][]).map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }}/>
                  <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

      {editingGoal && <GoalPicker mode="edit" onClose={() => setEditingGoal(false)}/>}
    </div>
  )
}

// ─── Recent workouts ──────────────────────────────────────────────
const RESULT_PILL: Record<'win' | 'loss' | 'draw', { label: string; color: string }> = {
  win:  { label: 'WIN',  color: '#58cc02' },
  loss: { label: 'LOSS', color: '#ff4b4b' },
  draw: { label: 'DRAW', color: '#9aaac4' },
}

const setLength = (s: number) => (s < 60 ? `${s}s` : `${s / 60}m`)

function dayLabel(iso: string) {
  const d = new Date(iso)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function WorkoutRow({ w, onOpen }: { w: WorkoutEntry; onOpen: () => void }) {
  const ex = EXERCISE_OPTIONS.find(o => o.id === w.exercise)
  const pill = w.result && RESULT_PILL[w.result]
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left w-full transition-transform active:scale-[0.98]"
      style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
    >
      <div className="relative flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
        <span className="text-xl leading-none">{ex?.icon ?? '🏃'}</span>
        <span className="text-[10px] font-game font-bold mt-1" style={{ color: '#7a8ba8' }}>{setLength(w.durationS)}</span>
        {w.hasReplay && (
          <span aria-label="Has a replay" className="absolute -top-1 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] text-white"
            style={{ background: '#4a90e2' }}>▶</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-game font-bold text-sm truncate" style={{ color: '#1a2b4a' }}>
            {ex?.label ?? w.exercise} · {w.opponent ? `vs @${w.opponent.name}` : 'Solo'}
          </span>
          {pill && (
            <span className="px-1.5 rounded-full text-[9px] font-game font-black text-white flex-shrink-0" style={{ background: pill.color }}>
              {pill.label}
            </span>
          )}
        </div>
        <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>
          {dayLabel(w.createdAt)}
          {w.opponent && w.opponent.score !== null && ` · ${w.score ?? 0}–${w.opponent.score}`}
          {w.forfeit && ' · forfeit'}
        </span>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-game font-black text-lg leading-tight" style={{ color: '#1a2b4a' }}>{w.score ?? '–'}</div>
        <div className="text-[10px] font-game" style={{ color: '#7a8ba8' }}>
          {w.reps ?? 0} reps
          {w.bp > 0 && <span className="font-bold" style={{ color: '#f59e0b' }}> · +{w.bp} BP</span>}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 -ml-1">
        <path d="M9 5l7 7-7 7" stroke="#c8d0e0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

// ─── AI recap: how I've been doing lately ─────────────────────────
const TREND_LOOK: Record<Trend, { emoji: string; bg: string; border: string; color: string }> = {
  improving: { emoji: '📈', bg: '#f0fff0', border: '#9be36a', color: '#3d9100' },
  steady:    { emoji: '➖', bg: ACCENT_BG, border: '#bcd6f5', color: ACCENT },
  slipping:  { emoji: '📉', bg: '#fff8ec', border: '#ffd093', color: '#c97200' },
  slacking:  { emoji: '💤', bg: '#fff0f0', border: '#fecaca', color: '#ff4b4b' },
  new:       { emoji: '🌱', bg: '#f0fff0', border: '#9be36a', color: '#3d9100' },
}

/** Written by the server on first view and kept until my next workout (latestId changes = refetch). */
function RecapCard({ latestId }: { latestId: string }) {
  const { data, failed } = useRecap(latestId)
  if (failed || data?.source === 'none') return null
  const look = TREND_LOOK[data?.trend ?? 'steady']
  return (
    <div className="rounded-2xl p-3 mb-3" style={{ background: look.bg, border: `2.5px solid ${look.border}` }}>
      {!data ? (
        <div className="flex flex-col gap-2 py-1">
          <p className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>Looking over your recent sets…</p>
          <div className="anim-skeleton h-3 rounded-full" style={{ background: '#dfe6f1', width: '85%' }}/>
          <div className="anim-skeleton h-3 rounded-full" style={{ background: '#dfe6f1', width: '60%' }}/>
        </div>
      ) : (
        <div className="anim-fade-up flex gap-2.5">
          <span className="text-2xl leading-none mt-0.5">{look.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-game font-black text-sm" style={{ color: look.color }}>{data.headline}</span>
              {data.source === 'gemini' && <span className="text-[9px] font-game font-black flex-shrink-0" style={{ color: '#9aaac4' }}>✨ AI</span>}
            </div>
            <p className="text-[13px] font-game mt-0.5" style={{ color: '#1a2b4a' }}>{data.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function RecentWorkouts() {
  const { items, failed } = useWorkoutHistory()
  const [open, setOpen] = useState<WorkoutEntry | null>(null)
  const note = (text: string) => (
    <p className="text-xs font-game text-center py-4" style={{ color: '#7a8ba8' }}>{text}</p>
  )
  return (
    <div className="px-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Recent Workouts</h3>
        {items && items.length > 0 && (
          <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>Tap for replay & tips</span>
        )}
      </div>
      {items && items.length > 0 && <RecapCard latestId={items[0].id}/>}
      {failed ? note("Couldn't load your workouts.")
        : !items ? note('Loading…')
        : items.length === 0 ? note("No workouts yet. Finish a set and it'll show up here.")
        : (
          <div className="flex flex-col gap-2">
            {items.map(w => <WorkoutRow key={w.id} w={w} onOpen={() => setOpen(w)}/>)}
          </div>
        )}
      {open && <WorkoutDetail entry={open} onClose={() => setOpen(null)}/>}
    </div>
  )
}

// ─── Friends / requests ───────────────────────────────────────────
export interface Person { name: string; shirt: string; skin?: string | null; level: number; equipped?: Equipped }

// Full-screen friend profile — mirrors the stats layout on the user's own profile
function FriendProfile({ friend, rank, onClose, onChallenge }: {
  friend: Friend
  rank: number
  onClose: () => void
  onChallenge: (f: Friend) => void
}) {
  const color   = ACCENT
  const bg      = ACCENT_BG
  const played  = friend.wins + friend.losses
  const winRate = played ? Math.round((friend.wins / played) * 100) : 0
  const canBattle = !!friend.online && !friend.busy && !!friend.presenceId

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto anim-slide-in-right" style={{ background: '#ffffff' }}>
      {/* Hero */}
      <div className="relative w-full" style={{ background: bg, borderBottom: '2.028px solid #c8d0e0', paddingTop: 'var(--top-gap)', paddingBottom: 24 }}>
        {/* Back button */}
        <button
          onClick={onClose}
          aria-label="Back"
          className="absolute flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ top: 'var(--top-gap)', left: 16, width: 34, height: 34, background: '#ffffffcc', border: '2px solid #c8d0e0' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="#1a2b4a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="text-center mb-4 whitespace-nowrap" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
          <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900 }}>#{rank}</span>
          <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400 }}> among friends</span>
        </p>

        <div className="flex items-start gap-4 px-5">
          <div className="relative flex-shrink-0 rounded-[16px] overflow-visible"
            style={{ width: 160, height: 200, background: '#fff', border: `2.028px solid ${color}`, boxShadow: `0 6px 12px ${color}33`, isolation: 'isolate', zIndex: 1 }}>
            <div className="absolute inset-0 flex items-end justify-center overflow-visible">
              <div style={{ transform: 'scale(1.25)', transformOrigin: 'bottom center' }}>
                <CharacterSprite size="lg" animate {...skinColors(friend.skin)} shirt={friend.shirt ?? undefined} equipped={friend.equipped}/>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 pt-2 flex-1 min-w-0">
            <p className="whitespace-nowrap truncate max-w-full" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>{friend.username}</p>
            <UnverifiedTag verified={friend.verified}/>
            <p style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '15px', color: friend.online ? '#58cc02' : '#7a8ba8', marginTop: -4 }}>
              {friend.online ? '● Online' : '○ Offline'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center px-3 py-1 rounded-full" style={{ background: color }}>
                <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 14, lineHeight: '20px', color: '#fff' }}>Lvl {friend.level}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-[16px] mt-1" style={{ background: '#fffbeb', border: '2.028px solid #fde68a' }}>
              <span style={{ fontFamily: "'Inter:Regular',sans-serif", fontWeight: 400, fontSize: 20, lineHeight: '28px', color: '#f59e0b' }}>◆</span>
              <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 18, lineHeight: '24px', color: '#b45309' }}>{friend.bp}</span>
              <span style={{ fontFamily: "'Nunito:Bold',sans-serif", fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#d97706' }}>BP</span>
            </div>
          </div>
        </div>

        {/* W / L / Win-rate */}
        <div className="flex items-center justify-center mt-8 px-5">
          <div className="flex items-center" style={{ gap: 0 }}>
            {([
              [friend.wins,    '#58cc02', 'WINS'],
              [friend.losses,  '#ff4b4b', 'LOSSES'],
              [`${winRate}%`,  '#4a90e2', 'WIN RATE'],
            ] as [string | number, string, string][]).map(([val, c, label], i) => (
              <div key={label} className="flex items-center">
                {i > 0 && <div style={{ width: 1, height: 47, background: '#c8d0e0', margin: '0 20px' }}/>}
                <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
                  <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 24, lineHeight: '32px', color: c }}>{val}</span>
                  <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 10, lineHeight: '15px', color: '#7a8ba8' }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Challenge to battle — live battles need them online and not already in a set */}
      <div className="px-5 pt-6">
        <button
          onClick={() => { onChallenge(friend); onClose() }}
          disabled={!canBattle}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-game font-black text-base text-white transition-transform active:scale-95"
          style={{
            background: canBattle ? 'linear-gradient(145deg, #ff6b6b, #ff4b4b)' : '#9aaac4',
            boxShadow: canBattle ? '0 6px 18px rgba(255,75,75,0.4)' : 'none',
          }}
        >
          ⚔️ Challenge to Battle
        </button>
        <p className="text-center text-xs font-game mt-2" style={{ color: '#7a8ba8' }}>
          {canBattle ? `${friend.username} is online. They'll get your request right away.`
            : friend.busy ? `${friend.username} is in a workout right now.`
            : `${friend.username} is offline. Battles need you both online.`}
        </p>
      </div>
      <div style={{ height: 40 }}/>
    </div>
  )
}

export function Avatar({ shirt, skin, equipped }: { shirt: string; skin?: string | null; equipped?: Equipped }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ background: ACCENT_BG, border: `2px solid ${ACCENT}` }}
    >
      <CharacterSprite size="xs" {...skinColors(skin)} shirt={shirt} equipped={equipped}/>
    </div>
  )
}

export function PersonRow({
  person,
  right,
}: {
  person: Person
  right: React.ReactNode
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
      style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
    >
      <Avatar shirt={person.shirt} skin={person.skin} equipped={person.equipped}/>
      <div className="flex-1 min-w-0">
        <span className="font-game font-bold text-sm truncate block" style={{ color: '#1a2b4a' }}>{person.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-game font-bold" style={{ color: ACCENT }}>Lvl {person.level}</span>
        </div>
      </div>
      {right}
    </div>
  )
}

function FriendRow({ friend, rank, onOpen }: { friend: Friend; rank: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-transform active:scale-[0.98] w-full"
      style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
    >
      <RankBadge rank={rank}/>
      <div className="relative flex-shrink-0">
        <Avatar shirt={friend.shirt ?? '#7fb0e0'} skin={friend.skin} equipped={friend.equipped}/>
        <span
          aria-label={friend.online ? 'Online' : 'Offline'}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
          style={{ background: friend.online ? '#58cc02' : '#c8d0e0', border: '2.5px solid #f5f7fb' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-game font-bold text-sm truncate" style={{ color: '#1a2b4a' }}>{friend.username}</span>
          <UnverifiedTag verified={friend.verified}/>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-game font-bold" style={{ color: ACCENT }}>Lvl {friend.level}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-game font-black text-sm" style={{ color: '#f59e0b' }}>{friend.bp.toLocaleString()}</div>
        <div className="text-[9px] font-game" style={{ color: '#7a8ba8' }}>BP</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M9 5l7 7-7 7" stroke="#c8d0e0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

const REQUEST_ERRORS: Record<string, (name: string) => string> = {
  'not-found': n => `No player called @${n}.`,
  'already-friends': n => `You and @${n} are already friends.`,
  self: () => "That's you!",
  'no-username': () => 'Pick a username first.',
  offline: () => "Can't reach the server. Try again.",
  'no-db': () => "The server isn't storing accounts right now.",
}

function FriendsSection({ onChallenge }: { onChallenge: (f: Friend) => void }) {
  const { friends, sendRequest: requestFriend } = useProfile()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null)
  const [openName, setOpenName] = useState<string | null>(null)

  // Looked up by name on every render so the online dot stays live while the profile is open.
  const rankedFriends = [...friends.friends].sort((a, b) => b.bp - a.bp)
  const openIndex = rankedFriends.findIndex(f => f.username === openName)
  const openFriend = openIndex >= 0 ? rankedFriends[openIndex] : null
  const openRank = openIndex + 1

  const sendRequest = async () => {
    const name = query.trim().replace(/^@/, '')
    if (!name || busy) return
    setBusy(true)
    setNote(null)
    try {
      const status = await requestFriend(name)
      setQuery('')
      setNote({ ok: true, text: status === 'accepted' ? `You and @${name} are now friends!` : `Friend request sent to @${name}!` })
    } catch (e) {
      const reason = REQUEST_ERRORS[e instanceof ApiError ? e.code : '']
      setNote({ ok: false, text: reason ? reason(name) : 'Something went wrong. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Friends leaderboard — tap a profile to view stats / challenge */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Friends Leaderboard</h3>
          <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>Tap to view profile</span>
        </div>

        {/* Add a Friend — below title, above the list */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-2xl"
              style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#9aaac4" strokeWidth="2.4"/>
                <path d="M20 20l-3.5-3.5" stroke="#9aaac4" strokeWidth="2.4" strokeLinecap="round"/>
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void sendRequest() }}
                placeholder="Add a friend by username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 bg-transparent outline-none font-game text-sm"
                style={{ color: '#1a2b4a' }}
              />
            </div>
            <button
              onClick={() => void sendRequest()}
              disabled={busy}
              className="px-4 py-2.5 rounded-2xl font-game font-bold text-sm text-white transition-transform active:scale-95 flex-shrink-0 disabled:opacity-60"
              style={{ background: '#58cc02', boxShadow: '0 2px 10px rgba(88,204,2,0.35)' }}
            >
              {busy ? '…' : 'Send'}
            </button>
          </div>
          {note && (
            <p className="text-[11px] font-game font-bold mt-2" style={{ color: note.ok ? '#58cc02' : '#ff4b4b' }}>{note.text}</p>
          )}
          {friends.outgoing.length > 0 && (
            <p className="text-[11px] font-game mt-2" style={{ color: '#7a8ba8' }}>
              Waiting on: {friends.outgoing.map(f => `@${f.username}`).join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {rankedFriends.length === 0 && (
            <p className="text-xs font-game text-center py-4" style={{ color: '#7a8ba8' }}>
              No friends yet. Add someone by username, or tap a player on the map.
            </p>
          )}
          {rankedFriends.map((f, i) => (
            <FriendRow key={f.username} friend={f} rank={i + 1} onOpen={() => setOpenName(f.username)}/>
          ))}
        </div>
      </div>

      {openFriend && (
        <FriendProfile friend={openFriend} rank={openRank} onClose={() => setOpenName(null)} onChallenge={onChallenge}/>
      )}
    </div>
  )
}

export function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, { bg: string; text: string }> = {
    1: { bg: '#ffd700', text: '#7a5900' },
    2: { bg: '#c0c0c0', text: '#444' },
    3: { bg: '#cd7f32', text: '#5a2a00' },
  }
  const m = medals[rank]
  if (m) return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center font-game font-black text-xs" style={{ background: m.bg, color: m.text }}>
      {rank}
    </div>
  )
  return (
    <div className="w-7 h-7 flex items-center justify-center font-game font-bold text-xs" style={{ color: '#7a8ba8' }}>{rank}</div>
  )
}

// Full-screen expanded list, reused by both leaderboards
function ExpandedList({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
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
        <div>
          <h2 className="font-game font-black text-xl leading-tight" style={{ color: '#1a2b4a' }}>{title}</h2>
          <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>{subtitle}</p>
        </div>
      </div>
      <div className="px-4 pb-10 flex flex-col gap-2">{children}</div>
    </div>
  )
}

function SeeMoreButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-game font-bold text-sm transition-transform active:scale-[0.98]"
      style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0', color: '#4a90e2' }}
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="#4a90e2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

export default function CalendarScreen() {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-(--top-gap) pb-3 flex-shrink-0">
        <h1 className="font-game font-black text-2xl mb-1" style={{ color: '#1a2b4a' }}>Progress</h1>
      </div>
      <div className="flex-1 overflow-y-auto pb-24">
        <CalendarView/>
        <RecentWorkouts/>
      </div>
    </div>
  )
}

export { FriendsSection }
