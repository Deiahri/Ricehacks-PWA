import React, { useEffect, useState } from 'react'
import MapScreen, { toPlayer } from './components/MapScreen'
import CalendarScreen from './components/CalendarScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import NotificationsScreen from './components/NotificationsScreen'
import ProfileScreen from './components/ProfileScreen'
import BattleFlow from './components/BattleFlow'
import InstallHint from './components/InstallHint'
import UsernamePicker from './components/UsernamePicker'
import { IncomingChallengeModal, OutgoingChallengeCard, Toast } from './components/ChallengeOverlays'
import type { Equipped } from './config/cosmetics'
import { useChallenge, type EndStatus } from './game/useChallenge'
import { LiveProvider, useSocket } from './live/LiveProvider'
import { ProfileProvider, useProfile, type Friend } from './live/ProfileProvider'
import { IDENTITY } from './live/usePresence'

export type Tab = 'calendar' | 'leaderboard' | 'map' | 'notifications' | 'profile'
export type BattleStep = 'pre-anim' | 'pick' | 'recording' | 'result'

export interface Appearance {
  skin: string
  skinOutline: string
  eye: string
  shirt: string
}

// Worn cosmetics by slot (head / offhand / mainhand); art and placement are in src/config/cosmetics.ts.
export type Equipment = Equipped

export interface Player {
  id: number
  /** Presence connection id, for live players on the map (the challenge target). */
  remoteId?: string
  name: string
  /** Account username, once they've picked one (friend requests go to this). */
  username?: string | null
  level: number
  power: number
  speed: number
  evasion: number
  bp: number
  wins: number
  losses: number
  x: number
  y: number
  appearance: Appearance
  equipment: Equipment
}

// A saturated brand accent used for UI chrome now that archetypes are gone.
// Per-player differentiation comes from each avatar's shirt colour.
export const ACCENT = '#4a90e2'
export const ACCENT_BG = '#eff5ff'

/** Me before my account loads; Game() fills in name, level, BP, record and gear from the server. */
export const ME: Player = {
  id: 0,
  name: 'You',
  level: 1,
  power: 68,
  speed: 74,
  evasion: 82,
  bp: 0,
  wins: 0,
  losses: 0,
  x: 50,
  y: 65,
  appearance: { skin: '#f0c68d', skinOutline: '#be8d4b', eye: '#874c24', shirt: '#c3a0e6' },
  equipment: {},
}

// ── Dumbbell icon for the map/workout CTA ──
function DumbbellIcon({ color = '#fff' }: { color?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {/* left plate stack */}
      <rect x="1" y="9"  width="4" height="10" rx="2" fill={color}/>
      <rect x="4" y="7"  width="3" height="14" rx="1.5" fill={color}/>
      {/* bar */}
      <rect x="7" y="12.5" width="14" height="3" rx="1.5" fill={color}/>
      {/* right plate stack */}
      <rect x="21" y="7"  width="3" height="14" rx="1.5" fill={color}/>
      <rect x="23" y="9"  width="4" height="10" rx="2" fill={color}/>
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke={active ? '#58cc02' : '#9aaac4'} strokeWidth="2.2"/>
      <path d="M3 9h18" stroke={active ? '#58cc02' : '#9aaac4'} strokeWidth="2.2"/>
      <path d="M8 2v4M16 2v4" stroke={active ? '#58cc02' : '#9aaac4'} strokeWidth="2.2" strokeLinecap="round"/>
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill={active ? '#58cc02' : '#9aaac4'}/>
      <rect x="14" y="13" width="3" height="3" rx="0.5" fill={active ? '#58cc02' : '#9aaac4'}/>
    </svg>
  )
}

function MapNavIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={active ? '#fff' : '#9aaac4'}/>
      <circle cx="12" cy="9" r="2.5" fill={active ? '#ff4b4b' : '#e8edf5'}/>
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={active ? '#58cc02' : '#9aaac4'} strokeWidth="2.2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#58cc02' : '#9aaac4'} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}

function LeaderboardIcon({ active }: { active: boolean }) {
  const c = active ? '#58cc02' : '#9aaac4'
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1.5" fill={c}/>
      <rect x="10" y="7" width="4" height="14" rx="1.5" fill={c}/>
      <rect x="17" y="4" width="4" height="17" rx="1.5" fill={c}/>
    </svg>
  )
}

function BellIcon({ active, badge }: { active: boolean; badge?: number }) {
  const c = active ? '#58cc02' : '#9aaac4'
  return (
    <div className="relative">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M18 8a6 6 0 10-12 0c0 4-2 6-2 6h16s-2-2-2-6z" stroke={c} strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
      {badge != null && badge > 0 && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-game font-black"
          style={{ background: '#ff4b4b', fontSize: 9, color: '#fff', lineHeight: 1 }}
        >
          {badge}
        </div>
      )}
    </div>
  )
}

function BottomNav({
  tab,
  setTab,
  onWorkoutTap,
  notificationCount,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  onWorkoutTap: () => void
  notificationCount: number
}) {
  const isMapTab = tab === 'map'

  const navBtn = (target: Tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTab(target)}
      className="flex flex-col items-center gap-0.5 pb-1 transition-transform active:scale-90 flex-1"
    >
      {icon}
      <span className="text-[9px] font-game font-bold" style={{ color: tab === target ? '#58cc02' : '#9aaac4' }}>
        {label}
      </span>
    </button>
  )

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2"
      style={{
        // Grow by the iOS home-indicator inset so the buttons clear it.
        height: 'calc(80px + env(safe-area-inset-bottom))',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        background: '#ffffff',
        borderTop: '2.5px solid #c8d0e0',
      }}
    >
      {navBtn('calendar', <CalendarIcon active={tab === 'calendar'}/>, 'Progress')}
      {navBtn('leaderboard', <LeaderboardIcon active={tab === 'leaderboard'}/>, 'Ranks')}

      {/* Centre: Map / Workout CTA */}
      <button
        onClick={() => {
          if (isMapTab) {
            onWorkoutTap()
          } else {
            setTab('map')
          }
        }}
        className="flex flex-col items-center gap-0.5 transition-transform active:scale-90 flex-1"
        style={{ marginTop: isMapTab ? -24 : -20 }}
      >
        <div
          style={{
            width:  isMapTab ? 64 : 52,
            height: isMapTab ? 64 : 52,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isMapTab
              ? 'linear-gradient(145deg, #ff6b6b, #ff4b4b)'
              : '#f5f7fb',
            border: isMapTab ? '3px solid #ff9090' : '2.5px solid #c8d0e0',
            boxShadow: isMapTab
              ? '0 6px 24px rgba(255,75,75,0.45)'
              : '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {isMapTab
            ? <DumbbellIcon color="#fff"/>
            : <MapNavIcon active={false}/>
          }
        </div>
        <span
          className="text-[9px] font-game font-bold"
          style={{ color: isMapTab ? '#ff4b4b' : '#9aaac4' }}
        >
          {isMapTab ? 'Workout' : 'Map'}
        </span>
      </button>

      {navBtn('notifications', <BellIcon active={tab === 'notifications'} badge={notificationCount}/>, 'Alerts')}
      {navBtn('profile', <ProfileIcon active={tab === 'profile'}/>, 'Profile')}
    </div>
  )
}

function endMessage(status: EndStatus | null, name: string): string {
  switch (status) {
    case 'declined':     return `${name} declined your battle request`
    case 'cancelled':    return `${name} cancelled the battle`
    case 'timeout':      return 'The battle request timed out'
    case 'busy':         return `${name} is busy right now`
    case 'offline':      return `${name} is no longer online`
    case 'left':         return `${name} left the battle`
    case 'disconnected': return 'Connection lost. The battle ended.'
    default:             return 'The battle ended'
  }
}

function Game() {
  const [tab, setTab] = useState<Tab>('map')
  const [battleStep, setBattleStep] = useState<BattleStep | null>(null)
  const [isSoloWorkout, setIsSoloWorkout] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const challenge = useChallenge()
  const { state: cs, respond: respondChallenge, reset: resetChallenge, cancel: cancelChallenge } = challenge
  const { connected, send } = useSocket()
  const account = useProfile()
  const { profile } = account
  // No username yet: pick one first. While the server can't be reached, a cached name is enough to play.
  const [skipName, setSkipName] = useState(false)
  const needsName = !skipName && (account.status === 'ready' ? !profile?.username : account.status !== 'no-db' && !account.username)

  const me: Player = {
    ...ME,
    name: account.username ?? IDENTITY.name,
    username: account.username,
    level: profile?.level ?? ME.level,
    bp: profile?.bp ?? ME.bp,
    wins: profile?.wins ?? ME.wins,
    losses: profile?.losses ?? ME.losses,
    appearance: { ...ME.appearance, shirt: IDENTITY.shirt },
    equipment: profile?.equipped ?? {},
  }
  const opponent = cs.opponent ? toPlayer(cs.opponent, me) : null
  const soloActive = battleStep !== null && isSoloWorkout

  // Accepted, on either phone: into the battle flow.
  useEffect(() => {
    if (cs.phase !== 'picking') return
    setIsSoloWorkout(false)
    setBattleStep(step => step ?? 'pre-anim')
  }, [cs.phase])

  // Declined / timed out / opponent left before the set: back out and say why.
  useEffect(() => {
    if (cs.phase !== 'ended') return
    setToast(endMessage(cs.ended, cs.opponent?.name ?? 'Your opponent'))
    if (!isSoloWorkout) setBattleStep(null)
    resetChallenge()
  }, [cs.phase, cs.ended, cs.opponent, isSoloWorkout, resetChallenge])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // In a solo set the server refuses challenges for us; this catches one that raced the status update.
  useEffect(() => {
    if (connected) send({ type: 'status', busy: soloActive })
  }, [connected, soloActive, send])
  useEffect(() => {
    if (soloActive && cs.phase === 'incoming') respondChallenge(false)
  }, [soloActive, cs.phase, respondChallenge])

  const startBattle = (player: Player) => {
    if (!player.remoteId) return
    if (!connected) {
      setToast('Not connected yet. Try again in a moment.')
      return
    }
    challenge.request({ id: player.remoteId, name: player.name, shirt: player.appearance.shirt, equipped: player.equipment })
  }

  const challengeFriend = (f: Friend) => {
    if (!f.presenceId) return
    startBattle(toPlayer({ id: f.presenceId, name: f.username, username: f.username, shirt: f.shirt ?? ME.appearance.shirt, equipped: f.equipped }, me))
  }

  const startSoloWorkout = () => {
    if (cs.phase === 'outgoing') cancelChallenge()
    setIsSoloWorkout(true)
    setBattleStep('pick')
  }

  const exitBattle = () => {
    if (!isSoloWorkout) cancelChallenge() // forfeits if the set is live; a no-op once there's a result
    setBattleStep(null)
    setIsSoloWorkout(false)
  }

  if (needsName) return <UsernamePicker mode="first" onSkip={() => setSkipName(true)}/>

  return (
    <>
      {battleStep ? (
        <BattleFlow
          step={battleStep}
          setStep={setBattleStep}
          opponent={opponent}
          me={me}
          isSolo={isSoloWorkout}
          challenge={challenge}
          onExit={exitBattle}
        />
      ) : (
        <>
          {tab === 'map'           && <MapScreen me={me} onStartBattle={startBattle}/>}
          {tab === 'map'           && <InstallHint/>}
          {tab === 'calendar'      && <CalendarScreen/>}
          {tab === 'leaderboard'   && <LeaderboardScreen onChallenge={challengeFriend}/>}
          {tab === 'notifications' && <NotificationsScreen/>}
          {tab === 'profile'       && <ProfileScreen me={me}/>}

          <BottomNav tab={tab} setTab={setTab} onWorkoutTap={startSoloWorkout} notificationCount={2}/>
        </>
      )}

      {cs.phase === 'outgoing' && !battleStep && opponent && <OutgoingChallengeCard to={opponent} onCancel={cancelChallenge}/>}
      {cs.phase === 'incoming' && !soloActive && opponent && <IncomingChallengeModal from={opponent} onAnswer={respondChallenge}/>}
      {toast && <Toast text={toast}/>}
    </>
  )
}

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-dvh" style={{ background: '#e8edf5' }}>
      {/* Phone shell: fills the screen on phones, framed 390×844 "phone" on wider screens */}
      <div
        className="relative overflow-hidden bg-white w-screen h-dvh min-[501px]:w-[390px] min-[501px]:h-[844px] min-[501px]:rounded-[44px] min-[501px]:shadow-[0_32px_80px_rgba(0,0,0,0.22),0_0_0_2.5px_#c8d0e0]"
      >
        {/* App-level so the socket (and any challenge) survives tab switches and the battle flow */}
        <LiveProvider>
          <ProfileProvider>
            <Game/>
          </ProfileProvider>
        </LiveProvider>
      </div>
    </div>
  )
}
