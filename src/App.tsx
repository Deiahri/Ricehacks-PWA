import React, { useState } from 'react'
import MapScreen from './components/MapScreen'
import CalendarScreen from './components/CalendarScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import NotificationsScreen from './components/NotificationsScreen'
import ProfileScreen from './components/ProfileScreen'
import BattleFlow from './components/BattleFlow'
import InstallHint from './components/InstallHint'

export type Tab = 'calendar' | 'leaderboard' | 'map' | 'notifications' | 'profile'
export type BattleStep = 'pre-anim' | 'goals' | 'recording' | 'result'

export interface Appearance {
  skin: string
  skinOutline: string
  eye: string
  shirt: string
}

// Equippable gear — hat sits on the head, shield in the defence hand,
// weapon (wand or gauntlet) in the handheld slot.
export interface Equipment {
  hat?: boolean
  shield?: boolean
  weapon?: 'wand' | 'gauntlet'
}

// Randomly gear up an NPC with up to 2 distinct-slot items.
function randomEquipment(): Equipment {
  const slots: (keyof Equipment)[] = ['hat', 'shield', 'weapon']
  const shuffled = [...slots].sort(() => Math.random() - 0.5)
  const count = Math.floor(Math.random() * 3) // 0, 1 or 2 items
  const eq: Equipment = {}
  for (const slot of shuffled.slice(0, count)) {
    if (slot === 'weapon') eq.weapon = Math.random() < 0.5 ? 'wand' : 'gauntlet'
    else eq[slot] = true
  }
  return eq
}

export interface Player {
  id: number
  name: string
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

export const ME: Player = {
  id: 0,
  name: 'Alex Chen',
  level: 9,
  power: 68,
  speed: 74,
  evasion: 82,
  bp: 285,
  wins: 14,
  losses: 6,
  x: 50,
  y: 65,
  appearance: { skin: '#f0c68d', skinOutline: '#be8d4b', eye: '#874c24', shirt: '#c3a0e6' },
  equipment: {}, // MC starts with no gear (can afford the Low Tier Shield)
}

export const NEARBY_PLAYERS: Player[] = [
  { id: 1, name: 'Jordan K.', level: 12, power: 78, speed: 85, evasion: 62, bp: 340, wins: 20, losses: 8,  x: 30, y: 40,
    appearance: { skin: '#d9a066', skinOutline: '#a9743f', eye: '#3e6fa3', shirt: '#e98a8a' }, equipment: randomEquipment() },
  { id: 2, name: 'Sam R.',    level: 8,  power: 92, speed: 45, evasion: 38, bp: 210, wins: 11, losses: 9,  x: 70, y: 35,
    appearance: { skin: '#8d5524', skinOutline: '#5e3312', eye: '#2e2a26', shirt: '#7fb0e0' }, equipment: randomEquipment() },
  { id: 4, name: 'Casey L.', level: 15, power: 65, speed: 70, evasion: 88, bp: 520, wins: 30, losses: 12, x: 60, y: 56,
    appearance: { skin: '#c68642', skinOutline: '#8c5a2b', eye: '#3e7d4f', shirt: '#b98be0' }, equipment: randomEquipment() },
]

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

export default function App() {
  const [tab, setTab] = useState<Tab>('map')
  const [battleStep, setBattleStep] = useState<BattleStep | null>(null)
  const [opponent, setOpponent] = useState<Player | null>(null)
  const [isSoloWorkout, setIsSoloWorkout] = useState(false)

  const startBattle = (player: Player) => {
    setOpponent(player)
    setIsSoloWorkout(false)
    setBattleStep('pre-anim')
  }

  const startSoloWorkout = () => {
    setIsSoloWorkout(true)
    setOpponent(null)
    setBattleStep('recording')
  }

  const exitBattle = () => {
    setBattleStep(null)
    setOpponent(null)
    setIsSoloWorkout(false)
  }

  return (
    <div className="flex items-center justify-center min-h-dvh" style={{ background: '#e8edf5' }}>
      {/* Phone shell: fills the screen on phones, framed 390×844 "phone" on wider screens */}
      <div
        className="relative overflow-hidden bg-white w-screen h-dvh min-[501px]:w-[390px] min-[501px]:h-[844px] min-[501px]:rounded-[44px] min-[501px]:shadow-[0_32px_80px_rgba(0,0,0,0.22),0_0_0_2.5px_#c8d0e0]"
      >
        {battleStep ? (
          <BattleFlow
            step={battleStep}
            setStep={setBattleStep}
            opponent={opponent}
            me={ME}
            isSolo={isSoloWorkout}
            onExit={exitBattle}
          />
        ) : (
          <>
            {tab === 'map'           && <MapScreen me={ME} onStartBattle={startBattle}/>}
            {tab === 'map'           && <InstallHint/>}
            {tab === 'calendar'      && <CalendarScreen/>}
            {tab === 'leaderboard'   && <LeaderboardScreen/>}
            {tab === 'notifications' && <NotificationsScreen/>}
            {tab === 'profile'       && <ProfileScreen me={ME}/>}

            <BottomNav tab={tab} setTab={setTab} onWorkoutTap={startSoloWorkout} notificationCount={2}/>
          </>
        )}
      </div>
    </div>
  )
}
