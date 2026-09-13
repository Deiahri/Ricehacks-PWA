import { useEffect, useState } from 'react'
import ImportedFlameIcon from '../imports/FlameIcon/index'
import CharacterSprite from './CharacterSprite'
import ChatComposer from './ChatComposer'
import RewardWheelModal from './RewardWheelModal'
import UnverifiedTag from './UnverifiedTag'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import { skinColors } from '../config/appearance'
import { goalPct } from '../game/xp'
import LiveMap from '../live/LiveMap'
import { useLive, useSocket } from '../live/LiveProvider'
import { sameName, useProfile } from '../live/ProfileProvider'
import type { RemoteBrief } from '../game/types'

interface Props {
  me: Player
  onStartBattle: (player: Player) => void
}

// Live players only have a name/shirt/gear/position; give them placeholder stats so the popover + battle flow work.
export function toPlayer(p: RemoteBrief & { username?: string | null }, me: Player): Player {
  let h = 0
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return {
    id: 1000 + (Math.abs(h) % 1_000_000),
    remoteId: p.id,
    name: p.name,
    username: p.username ?? null,
    level: 1, power: 50, speed: 50, evasion: 50, bp: 100, wins: 0, losses: 0,
    x: 50, y: 50,
    appearance: { ...me.appearance, ...skinColors(p.skin), shirt: p.shirt },
    skinTone: p.skin ?? null,
    equipment: p.equipped ?? {},
    verified: p.verified ?? null,
  }
}

/** Add Friend on the map popover, aware of who's already a friend or has a request pending. */
function AddFriendButton({ username }: { username?: string | null }) {
  const { profile, friends, sendRequest } = useProfile()
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const has = (list: { username: string }[]) => list.some(f => sameName(f.username, username))
  const relation =
    !username || !profile?.username || sameName(username, profile.username) ? 'unavailable'
    : has(friends.friends) ? 'friends'
    : has(friends.outgoing) ? 'requested'
    : has(friends.incoming) ? 'incoming'
    : 'add'
  const canTap = (relation === 'add' || relation === 'incoming') && state !== 'busy'
  const label =
    state === 'busy' ? 'Sending…'
    : state === 'error' ? 'Try again'
    : { unavailable: 'Add Friend', friends: 'Friends ✓', requested: 'Requested', incoming: 'Accept Friend', add: 'Add Friend' }[relation]

  const tap = () => {
    if (!canTap || !username) return
    setState('busy')
    sendRequest(username).then(() => setState('idle'), () => setState('error'))
  }

  return (
    <button
      disabled={!canTap}
      onClick={tap}
      className="flex-1 py-3 rounded-2xl text-sm font-game font-bold transition-transform active:scale-95"
      style={canTap
        ? { background: '#f0fff0', color: '#3d9100', border: '2.5px solid #58cc02' }
        : { background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
    >
      {label}
    </button>
  )
}

// --- Streak flame icon (imported Figma design) ---
function FlameIcon({ filled = true, size = 20 }: { filled?: boolean; size?: number }) {
  if (!filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-4-3-8-3-8s0 4-3 4c0-2 1-6-2-8z"
          fill="none"
          stroke="#c8d0e0"
          strokeWidth="1.5"
        />
      </svg>
    )
  }
  return (
    <div style={{ width: size, height: size }}>
      <ImportedFlameIcon />
    </div>
  )
}

// --- Star icon for the streak end goal ---
function StarIcon({ reached = false, size = 34 }: { reached?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.9 6.26 6.86.72-5.12 4.6 1.44 6.74L12 17.6 5.92 20.32l1.44-6.74L2.24 8.98l6.86-.72z"
        fill={reached ? '#ffd700' : '#dcebff'}
        stroke={reached ? '#e0a800' : ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// --- Lock open icon for the unlock badge ---
function UnlockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="13" rx="3" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5"/>
      <path d="M8 11V7a4 4 0 018 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="12" cy="17" r="1.8" fill="white"/>
    </svg>
  )
}

// --- Player popover (light-themed) ---
interface PopoverProps {
  player: Player
  onClose: () => void
  onBattle: () => void
}

function PlayerPopover({ player, onClose, onBattle }: PopoverProps) {
  const color = ACCENT
  const bg    = ACCENT_BG

  return (
    <div
      className="absolute inset-0 flex items-end justify-center z-50"
      style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom))' }}
      onClick={onClose}
    >
      <div
        className="anim-pop-in w-[340px] rounded-3xl overflow-hidden"
        style={{
          background: '#ffffff',
          border: '2.5px solid #c8d0e0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header band */}
        <div className="flex items-center gap-4 p-4 pb-3" style={{ background: bg }}>
          <div
            className="w-[64px] h-[64px] rounded-2xl flex items-center justify-center"
            style={{ background: `${color}22`, border: `2px solid ${color}44` }}
          >
            <CharacterSprite size="sm" {...player.appearance} equipped={player.equipment}/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-game font-black text-lg leading-tight" style={{ color: '#1a2b4a' }}>{player.name}</span>
              <span className="text-xs font-game font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                Lvl {player.level}
              </span>
              <UnverifiedTag verified={player.verified}/>
            </div>
            <div className="text-[10px] font-game mt-0.5" style={{ color: '#7a8ba8' }}>{player.wins}W – {player.losses}L</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#e8edf5', border: '2px solid #c8d0e0' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 12" stroke="#7a8ba8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* BP row */}
        <div className="flex items-center justify-center gap-2 py-3">
          <span style={{ color: '#f59e0b', fontSize: 16 }}>◆</span>
          <span className="font-game font-bold" style={{ color: '#1a2b4a' }}>{player.bp} BP</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 pt-2">
          <AddFriendButton username={player.username}/>
          <button
            className="flex-1 py-3 rounded-2xl text-sm font-game font-black text-white transition-transform active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              boxShadow: `0 4px 16px ${color}44`,
            }}
            onClick={onBattle}
          >
            ⚔ Battle Request
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Streak strip HUD ---
/** Where the flames sit along the 210 px track, as % of the fill: lit once the week's XP is that far toward the goal. */
const POSTS = [26, 52, 74]

/** This week's XP toward the goal: the bar fills, the flames light on the way, the star turns gold at the goal. */
function StreakStrip({ me, celebrate }: { me: Player; celebrate: boolean }) {
  const { profile } = useProfile()
  if (!me) return null
  const color = ACCENT
  const progress = goalPct(profile?.weekXp ?? 0, profile?.weeklyGoal)
  const reached = profile?.weekMet === true || progress >= 100

  return (
    <div style={{ transform: 'scale(1.2)', transformOrigin: 'top center' }}>
    {/* One blue capsule around the avatar, the track and the star */}
    <div
      className="anim-fade-up relative flex items-center"
      style={{
        animationDelay: '0.1s',
        padding: '4px 30px 4px 4px',
        borderRadius: 999,
        background: ACCENT_BG,
        border: `3px solid ${color}`,
        boxShadow: `0 6px 16px ${color}40`,
      }}
    >
      {/* Player profile circle - fixed to left end of pill, overlapping left edge */}
      <div
        className="relative z-20 flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: ACCENT_BG,
          border: `3px solid ${color}`,
          boxShadow: `0 4px 12px ${color}33`,
        }}
      >
        <div style={{ transform: 'scale(1.25)', transformOrigin: 'top center', marginTop: 6 }}>
          <CharacterSprite size="sm" {...me.appearance} equipped={me.equipment}/>
        </div>
      </div>

      {/* Pill track container */}
      <div
        style={{
          position: 'relative',
          width: 210,
          height: 32,
          borderRadius: 16,
          background: '#dcebff',
          border: '2px solid #b8d4f5',
          backdropFilter: 'blur(10px)',
          marginLeft: -14,
        }}
      >
        {/* Yellow filled portion (a hair of fill even at 0, so the rounded end shows) */}
        <div
          style={{
            position: 'absolute',
            left: -2,
            top: -2,
            width: `calc(${Math.max(progress, 4)}% + 2px)`,
            height: 'calc(100% + 4px)',
            borderRadius: 16,
            background: reached ? '#ffd700' : '#ffc300',
            border: '2px solid #ad6404',
            transition: 'width 900ms cubic-bezier(.2,.8,.2,1)',
          }}
        />

        {/* Goal indicators positioned along centerline of pill */}
        {/* Flame 1 — outer wrapper centers on the pill; inner wrapper animates so the pulse never clobbers the -50% centering */}
        <div
          style={{
            position: 'absolute',
            left: 36,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        >
          <div className={progress >= POSTS[0] ? 'anim-flame' : ''} style={{ lineHeight: 0 }}>
            <FlameIcon filled={progress >= POSTS[0]} size={38} />
          </div>
        </div>

        {/* Flame 2 */}
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        >
          <div className={progress >= POSTS[1] ? 'anim-flame' : ''} style={{ lineHeight: 0, animationDelay: '0.3s' }}>
            <FlameIcon filled={progress >= POSTS[1]} size={38} />
          </div>
        </div>

        {/* Post 3: a circle until the week is three-quarters there, then a flame */}
        {progress >= POSTS[2] ? (
          <div style={{ position: 'absolute', left: 136, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
            <div className="anim-flame" style={{ lineHeight: 0, animationDelay: '0.6s' }}>
              <FlameIcon filled size={38} />
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 144,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              border: '2px solid #9cc2ef',
              zIndex: 10,
            }}
          />
        )}

        {/* Final star at the end overlapping the right edge — grey until the goal, gold (and a spin) once reached */}
        <div
          className={celebrate ? 'anim-star-spin' : ''}
          style={{
            position: 'absolute',
            right: -20.5,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 51,
            height: 51,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StarIcon reached={reached} size={51} />
          <span
            style={{
              position: 'absolute',
              // 1px above the star's lower inner point (y=17.6 of 24 viewBox → 37.4px on the 51px box)
              bottom: 17.6,
              left: '50%',
              transform: 'translateX(calc(-50% - 1px))',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 900,
              fontSize: 16,
              lineHeight: 1,
              color: reached ? '#7a4f00' : ACCENT,
            }}
          >
            {reached ? me.level : me.level + 1}
          </span>
        </div>
      </div>
    </div>
    </div>
  )
}

// --- Profile chip (light card) ---
function ProfileChip({ me }: { me: Player }) {
  if (!me) return null
  const color = ACCENT
  return (
    <div
      className="anim-fade-up flex items-center gap-2 px-2.5 py-2 rounded-2xl"
      style={{
        background: '#ffffffee',
        border: `2.5px solid #c8d0e0`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: ACCENT_BG, border: `2.5px solid ${color}` }}
      >
        <CharacterSprite size="xs" {...me.appearance} equipped={me.equipment}/>
      </div>
      <div className="flex flex-col">
        <span className="font-game font-black text-[13px] leading-tight" style={{ color: '#1a2b4a' }}>{me.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-game font-bold" style={{ color }}>Lvl {me.level}</span>
        </div>
      </div>
    </div>
  )
}

/** Don't nag about an unspun wheel more than once every few minutes after "Later". */
let wheelSnoozedUntil = 0
const WHEEL_SNOOZE_MS = 5 * 60_000
const STAR_SPIN_MS = 1200

/** Matches the server's CHAT_MS, so my own bubble goes at the same moment as everyone else's copy of it. */
const CHAT_MS = 7_000

export default function MapScreen({ me, onStartBattle }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [myChat, setMyChat] = useState<{ text: string; at: number } | null>(null)
  const { location, connected, others } = useLive()
  const { send } = useSocket()
  const { profile } = useProfile()

  const say = (text: string) => {
    if (send({ type: 'chat', text })) setMyChat({ text, at: Date.now() })
  }

  // The server drops everyone else's bubble on its own clock; mine is local, so time it out here.
  useEffect(() => {
    if (!myChat) return
    const timer = setTimeout(() => setMyChat(null), CHAT_MS)
    return () => clearTimeout(timer)
  }, [myChat])

  // A met week owes a spin: the star spins first, then the wheel comes up (unless snoozed). Once up it stays until it
  // closes itself — the spin's own profile push clears pendingReward before the wheel has finished turning.
  const pending = profile?.pendingReward === true
  const [wheelOpen, setWheelOpen] = useState(false)
  useEffect(() => {
    if (!pending || Date.now() < wheelSnoozedUntil) return
    const t = setTimeout(() => setWheelOpen(true), STAR_SPIN_MS)
    return () => clearTimeout(t)
  }, [pending])
  const snooze = () => { wheelSnoozedUntil = Date.now() + WHEEL_SNOOZE_MS; setWheelOpen(false) }

  const statusText =
    location.status !== 'active' ? (location.resuming ? 'Locating…' : 'Location off')
    : !connected ? 'Connecting…'
    : `Live · ${others.length} nearby`
  const statusColor = location.status === 'active' && connected ? '#58cc02' : '#f59e0b'

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LiveMap
        me={me}
        position={location.position}
        heading={location.heading}
        others={others}
        myChat={myChat}
        onSelect={p => setSelectedPlayer(toPlayer(p, me))}
      />

      <ChatComposer onSay={say}/>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center gap-9 px-4 pt-(--top-gap) pointer-events-none">
        <div className="pointer-events-auto"><StreakStrip me={me} celebrate={pending && Date.now() >= wheelSnoozedUntil}/></div>
        <div className="flex items-center gap-2">
          <div
            data-testid="live-status"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 font-game font-bold text-[11px]"
            style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #c8d0e0', color: '#1a2b4a' }}
          >
            <span style={{ color: statusColor }}>●</span>
            {statusText}
            <span style={{ color: '#7a8ba8' }}>· {me.name}{location.heading !== null ? ` · ${location.heading}°` : ''}</span>
          </div>
          {/* iOS compass permission gets its own tap, after Location is granted */}
          {location.status === 'active' && location.compass === 'prompt' && (
            <button
              onClick={() => void location.enableCompass()}
              className="pointer-events-auto rounded-full px-3 py-1 font-game font-black text-[11px] text-white transition-transform active:scale-95"
              style={{ background: ACCENT, border: '2px solid rgba(255,255,255,0.7)', boxShadow: `0 4px 12px ${ACCENT}44` }}
            >
              🧭 Enable compass
            </button>
          )}
        </div>
      </div>

      {/* Share-location prompt: the tap is required for the iOS Location prompt */}
      {location.status !== 'active' && !location.resuming && (
        <div className="absolute inset-x-6 z-30 flex flex-col items-center gap-3 rounded-3xl p-5 text-center anim-fade-up"
          style={{ top: '42%', background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 20px 60px rgba(0,0,0,0.16)' }}>
          <span className="font-game font-black text-lg" style={{ color: '#1a2b4a' }}>See who's nearby</span>
          <span className="font-game text-xs" style={{ color: '#7a8ba8' }}>
            {location.error ?? 'Share your location and compass to appear on the map for other players.'}
          </span>
          <button
            onClick={() => void location.enable()}
            disabled={location.status === 'requesting'}
            className="rounded-2xl px-5 py-3 font-game font-black text-sm text-white transition-transform active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, boxShadow: `0 4px 16px ${ACCENT}44` }}
          >
            {location.status === 'requesting' ? 'Waiting for GPS…' : '📍 Share my location'}
          </button>
        </div>
      )}

      {/* Scrim + Popover */}
      {selectedPlayer && (
        <>
          <div
            className="absolute inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(1px)' }}
            onClick={() => setSelectedPlayer(null)}
          />
          <PlayerPopover
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            onBattle={() => { setSelectedPlayer(null); onStartBattle(selectedPlayer) }}
          />
        </>
      )}

      {wheelOpen && (
        <RewardWheelModal level={me.level} onClose={() => setWheelOpen(false)} onLater={snooze}/>
      )}
    </div>
  )
}
