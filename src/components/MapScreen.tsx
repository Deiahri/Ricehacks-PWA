import { useState } from 'react'
import ImportedFlameIcon from '../imports/FlameIcon/index'
import CharacterSprite from './CharacterSprite'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import LiveMap from '../live/LiveMap'
import { useLive } from '../live/LiveProvider'
import { IDENTITY } from '../live/usePresence'
import type { RemoteBrief } from '../game/types'

interface Props {
  me: Player
  onStartBattle: (player: Player) => void
}

// Live players only have a name/shirt/position; give them placeholder stats so the popover + battle flow work.
export function toPlayer(p: RemoteBrief, me: Player): Player {
  let h = 0
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return {
    id: 1000 + (Math.abs(h) % 1_000_000),
    remoteId: p.id,
    name: p.name,
    level: 1, power: 50, speed: 50, evasion: 50, bp: 100, wins: 0, losses: 0,
    x: 50, y: 50,
    appearance: { ...me.appearance, shirt: p.shirt },
    equipment: {},
  }
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
        fill={reached ? '#ffd700' : '#d8dee9'}
        stroke={reached ? '#e0a800' : '#c8d0e0'}
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
            <CharacterSprite size="sm" {...player.appearance} {...player.equipment}/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-game font-black text-lg leading-tight" style={{ color: '#1a2b4a' }}>{player.name}</span>
              <span className="text-xs font-game font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
                Lvl {player.level}
              </span>
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
          <button
            className="flex-1 py-3 rounded-2xl text-sm font-game font-bold"
            style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
          >
            Add Friend
          </button>
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
function StreakStrip({ me }: { me: Player }) {
  if (!me) return null
  const color = ACCENT
  const progress = 55 // % of workout goal progress toward next level
  const reached = progress >= 100

  return (
    <div style={{ transform: 'scale(1.2)', transformOrigin: 'top center' }}>
    <div className="anim-fade-up relative flex items-center" style={{ animationDelay: '0.1s' }}>
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
          <CharacterSprite size="sm" {...me.appearance} {...me.equipment}/>
        </div>
      </div>

      {/* Pill track container */}
      <div
        style={{
          position: 'relative',
          width: 230,
          height: 32,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.92)',
          border: '2px solid #c8d0e0',
          backdropFilter: 'blur(10px)',
          marginLeft: -14,
        }}
      >
        {/* Yellow filled portion */}
        <div
          style={{
            position: 'absolute',
            left: -2,
            top: -2,
            width: `calc(${progress}% + 2px)`,
            height: 'calc(100% + 4px)',
            borderRadius: 16,
            background: '#ffc300',
            border: '2px solid #ad6404',
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
          <div className="anim-flame" style={{ lineHeight: 0 }}>
            <FlameIcon filled size={38} />
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
          <div className="anim-flame" style={{ lineHeight: 0, animationDelay: '0.3s' }}>
            <FlameIcon filled size={38} />
          </div>
        </div>

        {/* Incomplete circle 3 */}
        <div
          style={{
            position: 'absolute',
            left: 144,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)',
            border: '2px solid #c8d0e0',
            zIndex: 10,
          }}
        />

        {/* Final star at the end overlapping the right edge — grey until reached, gold with next level number */}
        <div
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
              color: reached ? '#7a4f00' : '#8a94a6',
            }}
          >
            {me.level + 1}
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
        <CharacterSprite size="xs" {...me.appearance} {...me.equipment}/>
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

export default function MapScreen({ me, onStartBattle }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const { location, connected, others } = useLive()
  const meLive: Player = { ...me, name: IDENTITY.name, appearance: { ...me.appearance, shirt: IDENTITY.shirt } }

  const statusText =
    location.status !== 'active' ? 'Location off'
    : !connected ? 'Connecting…'
    : `Live · ${others.length} nearby`
  const statusColor = location.status === 'active' && connected ? '#58cc02' : '#f59e0b'

  return (
    <div className="absolute inset-0 overflow-hidden">
      <LiveMap
        me={meLive}
        position={location.position}
        heading={location.heading}
        others={others}
        onSelect={p => setSelectedPlayer(toPlayer(p, me))}
      />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center gap-9 px-4 pt-(--top-gap) pointer-events-none">
        <div className="pointer-events-auto"><StreakStrip me={me}/></div>
        <div className="flex items-center gap-2">
          <div
            data-testid="live-status"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 font-game font-bold text-[11px]"
            style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #c8d0e0', color: '#1a2b4a' }}
          >
            <span style={{ color: statusColor }}>●</span>
            {statusText}
            <span style={{ color: '#7a8ba8' }}>· {IDENTITY.name}{location.heading !== null ? ` · ${location.heading}°` : ''}</span>
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
      {location.status !== 'active' && (
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
    </div>
  )
}
