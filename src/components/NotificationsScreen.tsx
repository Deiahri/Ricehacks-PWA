import { useEffect, useState } from 'react'
import { Avatar, PersonRow } from './CalendarScreen'
import { DEFAULT_SHIRT } from '../config/appearance'
import { useProfile, type AppNotification } from '../live/ProfileProvider'

/** One line for a notification (also the toast when it arrives live). */
export function notificationText(n: AppNotification): string {
  const who = n.actor?.username ? `@${n.actor.username}` : 'Someone'
  return n.type === 'friend_accepted' ? `🎉 ${who} accepted your friend request!` : `${who} declined your friend request`
}

const SUBTEXT: Record<AppNotification['type'], string> = {
  friend_accepted: "You're friends now. Challenge them from Ranks → Friends.",
  friend_declined: 'No worries, there are plenty of others to battle on the map.',
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86_400)}d ago`
}

export default function NotificationsScreen() {
  const { profile, friends, inbox, markRead, respond: answerRequest } = useProfile()
  const incoming = friends.incoming
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // What was unread when I opened the screen keeps its dot; everything counts as read while I'm looking.
  const [fresh] = useState(() => new Set(inbox.items.filter(n => !n.read).map(n => n.id)))
  useEffect(() => {
    if (inbox.unread > 0) markRead()
  }, [inbox.unread, markRead])

  const respond = async (name: string, accept: boolean) => {
    if (busy) return
    setBusy(name)
    setError(null)
    try {
      await answerRequest(name, accept)
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-(--top-gap) pb-3 flex-shrink-0">
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
          {error && <p className="text-xs font-game font-bold mb-2" style={{ color: '#ff4b4b' }}>{error}</p>}
          {incoming.length === 0 ? (
            <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>
              {profile?.username ? 'No pending requests.' : 'Pick a username so friends can find you.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {incoming.map(p => (
                <PersonRow
                  key={p.username}
                  person={{ name: p.username, shirt: p.shirt ?? '#7fb0e0', skin: p.skin, level: p.level, equipped: p.equipped }}
                  right={
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ opacity: busy === p.username ? 0.5 : 1 }}>
                      <button
                        onClick={() => void respond(p.username, true)}
                        aria-label="Accept"
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                        style={{ background: '#58cc02', boxShadow: '0 2px 8px rgba(88,204,2,0.35)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => void respond(p.username, false)}
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

        {/* Recent activity: what became of requests I sent */}
        <div>
          <h3 className="font-game font-black text-base mb-2" style={{ color: '#1a2b4a' }}>Recent Activity</h3>
          {inbox.items.length === 0 ? (
            <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>
              Nothing yet. When someone answers a friend request you sent, it shows up here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {inbox.items.map(n => (
                <div
                  key={n.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                  style={{
                    background: n.type === 'friend_accepted' ? '#f3fff0' : '#f5f7fb',
                    border: `2.5px solid ${n.type === 'friend_accepted' ? '#b7e88f' : '#c8d0e0'}`,
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar shirt={n.actor?.shirt ?? DEFAULT_SHIRT} skin={n.actor?.skin} equipped={n.actor?.equipped}/>
                    <span className="absolute -bottom-1 -right-1 text-sm leading-none">{n.type === 'friend_accepted' ? '🤝' : '✋'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-game font-bold text-sm leading-tight" style={{ color: '#1a2b4a' }}>{notificationText(n)}</p>
                    <p className="text-[11px] font-game mt-0.5" style={{ color: '#7a8ba8' }}>{SUBTEXT[n.type]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-game" style={{ color: '#9aaac4' }}>{timeAgo(n.createdAt)}</span>
                    {fresh.has(n.id) && <span aria-label="New" className="w-2 h-2 rounded-full" style={{ background: '#4a90e2' }}/>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
