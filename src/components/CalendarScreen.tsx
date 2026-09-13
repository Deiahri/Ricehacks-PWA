import { useState } from 'react'
import CharacterSprite from './CharacterSprite'
import { ACCENT, ACCENT_BG } from '../App'
import type { Equipped } from '../config/cosmetics'
import { ApiError } from '../live/api'
import { useProfile, type Friend } from '../live/ProfileProvider'

type DayState = 'trained' | 'rest' | 'missed' | 'future'

interface DayData {
  date: number
  state: DayState
}

function buildMonth(): DayData[] {
  const days: DayData[] = []
  const offset = 2 // Sept 2026 starts Tuesday
  for (let i = 0; i < offset; i++) days.push({ date: 0, state: 'future' })
  const trained = [1, 2, 4, 5, 7, 8, 9, 11]
  const missed  = [3, 6, 10]
  for (let d = 1; d <= 30; d++) {
    if (d > 12)             days.push({ date: d, state: 'future' })
    else if (trained.includes(d)) days.push({ date: d, state: 'trained' })
    else if (missed.includes(d))  days.push({ date: d, state: 'missed' })
    else                    days.push({ date: d, state: 'rest' })
  }
  return days
}

const MONTH_DAYS = buildMonth()

// `shirt` is the avatar shirt colour — the only per-person differentiator now
interface LeaderboardEntry {
  rank: number
  name: string
  shirt: string
  level: number
  score: number
  isMe?: boolean
}

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,  name: 'Casey L.',  shirt: '#c3a0e6', level: 15, score: 4820 },
  { rank: 2,  name: 'Morgan W.', shirt: '#9abae0', level: 14, score: 4310 },
  { rank: 3,  name: 'Jordan K.', shirt: '#e98a8a', level: 12, score: 3990 },
  { rank: 4,  name: 'Quinn B.',  shirt: '#f2b366', level: 11, score: 3540 },
  { rank: 5,  name: 'Taylor P.', shirt: '#8fd6b0', level: 11, score: 3200 },
  { rank: 6,  name: 'Drew T.',   shirt: '#9abae0', level: 10, score: 2980 },
  { rank: 7,  name: 'Sam R.',    shirt: '#7fb0e0', level: 8,  score: 2550 },
  { rank: 8,  name: 'Riley M.', shirt: '#e98a8a', level: 6,  score: 1840 },
  { rank: 9,  name: 'Alex Chen', shirt: '#c3a0e6', level: 9,  score: 2285, isMe: true },
  { rank: 10, name: 'Jamie S.',  shirt: '#f2c94c', level: 5,  score: 1200 },
]

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

function DayCell({ day }: { day: DayData }) {
  if (day.date === 0) return <div/>
  const isToday = day.date === 12

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
        {day.date}
      </span>
      {day.state === 'trained' && <FlameIcon filled size={14}/>}
      {day.state === 'missed' && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2L2 12" stroke="#ff4b4b" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {day.state === 'rest' && day.date <= 12 && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#c8d0e0' }}/>
      )}
    </div>
  )
}

function CalendarView() {
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-game font-black text-xl" style={{ color: '#1a2b4a' }}>September 2026</span>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: '#fff8ec', border: '2px solid #ffd093' }}
        >
          <div className="anim-flame"><FlameIcon size={16}/></div>
          <span className="font-game font-black text-sm" style={{ color: '#ff9600' }}>4 Day Streak</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-game font-bold py-1" style={{ color: '#7a8ba8' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {MONTH_DAYS.map((day, i) => <DayCell key={i} day={day}/>)}
      </div>

      <div className="flex items-center gap-5 mt-4 justify-center">
        {([
          ['#58cc02', 'Trained'],
          ['#ff4b4b', 'Missed'],
          ['#c8d0e0', 'Rest'],
        ] as [string, string][]).map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }}/>
            <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>{label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── Workout performance over time ────────────────────────────────
// Each series is a recurring weekly goal; points are how well each
// recording session scored (0–100) week over week.
interface Series { label: string; color: string; values: number[] }

const PROGRESS_WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5']
const PROGRESS_SERIES: Series[] = [
  { label: 'Strength', color: '#58cc02', values: [55, 62, 70, 68, 82] },
  { label: 'Cardio',   color: '#4a90e2', values: [40, 58, 52, 71, 78] },
  { label: 'Mobility', color: '#a855f7', values: [65, 60, 74, 80, 88] },
]

function WorkoutProgressChart() {
  // viewBox geometry
  const W = 320, H = 172
  const padL = 30, padR = 12, padT = 14, padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const maxY = 100
  const cols = PROGRESS_WEEKS.length

  const x = (i: number) => padL + (cols === 1 ? plotW / 2 : (plotW * i) / (cols - 1))
  const y = (v: number) => padT + plotH - (v / maxY) * plotH

  const gridLines = [0, 25, 50, 75, 100]

  return (
    <div className="mt-6 rounded-2xl p-4" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Session Progress</h3>
        <span className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>Score per week</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {/* horizontal gridlines + y labels */}
        {gridLines.map(g => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#e2e8f2" strokeWidth={1}/>
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fontFamily="'Nunito:Bold',sans-serif" fill="#9aaac4">{g}</text>
          </g>
        ))}

        {/* x labels */}
        {PROGRESS_WEEKS.map((w, i) => (
          <text key={w} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fontFamily="'Nunito:Bold',sans-serif" fill="#9aaac4">{w}</text>
        ))}

        {/* series lines + points */}
        {PROGRESS_SERIES.map(s => {
          const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/>
              {s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3.4} fill="#fff" stroke={s.color} strokeWidth={2.4}/>
              ))}
            </g>
          )
        })}
      </svg>

      {/* legend */}
      <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
        {PROGRESS_SERIES.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-full" style={{ background: s.color }}/>
            <span className="text-[11px] font-game font-bold" style={{ color: '#7a8ba8' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Friends / requests ───────────────────────────────────────────
export interface Person { name: string; shirt: string; level: number; equipped?: Equipped }

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
    <div className="absolute inset-0 z-30 overflow-y-auto anim-fade-up" style={{ background: '#ffffff' }}>
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
                <CharacterSprite size="lg" animate shirt={friend.shirt ?? undefined} equipped={friend.equipped}/>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-2 pt-2 flex-1 min-w-0">
            <p className="whitespace-nowrap truncate max-w-full" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>{friend.username}</p>
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

export function Avatar({ shirt, equipped }: { shirt: string; equipped?: Equipped }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ background: ACCENT_BG, border: `2px solid ${ACCENT}` }}
    >
      <CharacterSprite size="xs" shirt={shirt} equipped={equipped}/>
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
      <Avatar shirt={person.shirt} equipped={person.equipped}/>
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
        <Avatar shirt={friend.shirt ?? '#7fb0e0'} equipped={friend.equipped}/>
        <span
          aria-label={friend.online ? 'Online' : 'Offline'}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
          style={{ background: friend.online ? '#58cc02' : '#c8d0e0', border: '2.5px solid #f5f7fb' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-game font-bold text-sm truncate block" style={{ color: '#1a2b4a' }}>{friend.username}</span>
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

function RankBadge({ rank }: { rank: number }) {
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

function LocalRow({ entry }: { entry: LeaderboardEntry & { rank: number } }) {
  const color = ACCENT
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
      style={{
        background: entry.isMe ? '#eff5ff' : '#f5f7fb',
        border: `2.5px solid ${entry.isMe ? '#4a90e2' : '#c8d0e0'}`,
      }}
    >
      <RankBadge rank={entry.rank}/>
      <Avatar shirt={entry.shirt}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-game font-bold text-sm truncate" style={{ color: '#1a2b4a' }}>{entry.name}</span>
          {entry.isMe && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-game font-bold text-white" style={{ background: '#4a90e2' }}>YOU</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-game font-bold" style={{ color }}>Lvl {entry.level}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-game font-black text-sm" style={{ color: '#f59e0b' }}>{entry.score.toLocaleString()}</div>
        <div className="text-[9px] font-game" style={{ color: '#7a8ba8' }}>BP</div>
      </div>
    </div>
  )
}

// Full-screen expanded list, reused by both leaderboards
function ExpandedList({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto anim-fade-up" style={{ background: '#ffffff' }}>
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

function LocalLeaderboard({
  sorted,
  me,
}: {
  sorted: (LeaderboardEntry & { rank: number })[]
  me?: LeaderboardEntry & { rank: number }
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-game font-black text-xl leading-tight" style={{ color: '#1a2b4a' }}>Dallas Leaderboard</h2>
          <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>Top athletes near you</p>
        </div>
        {me && (
          <div className="text-right">
            <div className="font-game font-black text-base" style={{ color: '#f59e0b' }}>#{me.rank}</div>
            <div className="text-[10px] font-game" style={{ color: '#7a8ba8' }}>Your rank</div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map(entry => <LocalRow key={entry.name} entry={entry}/>)}
      </div>
    </div>
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
      </div>
    </div>
  )
}

export { LocalLeaderboard, FriendsSection, LEADERBOARD }
