import { useState } from 'react'
import { Person, Avatar, PersonRow, INITIAL_INCOMING_REQUESTS } from './CalendarScreen'

const ACCENT = '#4a90e2'

interface Notif {
  id: number
  type: 'battle_result' | 'level_up' | 'streak'
  text: string
  sub: string
  time: string
}

const NOTIFICATIONS: Notif[] = [
  { id: 1, type: 'battle_result', text: 'You beat Jordan K.!', sub: 'You won the battle with 9 reps vs 6', time: '2h ago' },
  { id: 2, type: 'level_up',      text: 'Level up! You reached Lvl 9', sub: 'Keep going — Lvl 10 is close', time: '1d ago' },
  { id: 3, type: 'streak',        text: '4-day streak!', sub: "You've trained 4 days in a row", time: '2d ago' },
]

function NotifIcon({ type }: { type: Notif['type'] }) {
  if (type === 'battle_result') return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fff0f0' }}>
      <span style={{ fontSize: 20 }}>⚔️</span>
    </div>
  )
  if (type === 'level_up') return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fffbe6' }}>
      <span style={{ fontSize: 20 }}>⭐</span>
    </div>
  )
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fff8ec' }}>
      <span style={{ fontSize: 20 }}>🔥</span>
    </div>
  )
}

export default function NotificationsScreen() {
  const [incoming, setIncoming] = useState<Person[]>(INITIAL_INCOMING_REQUESTS)

  const respond = (name: string, accept: boolean) => {
    setIncoming(prev => prev.filter(p => p.name !== name))
    if (accept) { /* accepted friend would be added to friends list */ }
  }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-14 pb-3 flex-shrink-0">
        <h1 className="font-game font-black text-2xl" style={{ color: '#1a2b4a' }}>Notifications</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-4 flex flex-col gap-5">

        {/* Friend Requests */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Friend Requests</h3>
            {incoming.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-game font-black text-white"
                style={{ background: '#ff4b4b' }}
              >
                {incoming.length}
              </span>
            )}
          </div>
          {incoming.length === 0 ? (
            <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>No pending requests.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {incoming.map(p => (
                <PersonRow
                  key={p.name}
                  person={p}
                  right={
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => respond(p.name, true)}
                        aria-label="Accept"
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                        style={{ background: '#58cc02', boxShadow: '0 2px 8px rgba(88,204,2,0.35)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => respond(p.name, false)}
                        aria-label="Decline"
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                        style={{ background: '#fff', border: '2px solid #c8d0e0' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M6 6l12 12M18 6L6 18" stroke="#7a8ba8" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <h3 className="font-game font-black text-base mb-2" style={{ color: '#1a2b4a' }}>Recent Activity</h3>
          <div className="flex flex-col gap-2">
            {NOTIFICATIONS.map(n => (
              <div
                key={n.id}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
              >
                <NotifIcon type={n.type}/>
                <div className="flex-1 min-w-0">
                  <p className="font-game font-bold text-sm leading-tight" style={{ color: '#1a2b4a' }}>{n.text}</p>
                  <p className="text-[11px] font-game mt-0.5" style={{ color: '#7a8ba8' }}>{n.sub}</p>
                </div>
                <span className="text-[10px] font-game flex-shrink-0" style={{ color: '#9aaac4' }}>{n.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
