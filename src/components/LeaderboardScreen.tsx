import { useState } from 'react'
import { Avatar, FriendsSection, RankBadge } from './CalendarScreen'
import { ShieldIcon } from './UnverifiedTag'
import VerifyModal from './VerifyModal'
import { ACCENT } from '../App'
import { DEFAULT_SHIRT } from '../config/appearance'
import { formatDuration } from '../game/scoring'
import { EXERCISE_OPTIONS } from '../game/types'
import type { Friend } from '../live/ProfileProvider'
import { useGlobalLeaderboard, type GlobalEntry } from '../live/useLeaderboard'

/** "Push-ups · 30s", the set their best score came from. */
function setLabel(e: GlobalEntry): string {
  if (e.exercise === null || e.durationS === null) return 'No sets yet'
  const exercise = EXERCISE_OPTIONS.find(o => o.id === e.exercise)?.label ?? e.exercise
  return `${exercise} · ${formatDuration(e.durationS)}`
}

function GlobalRow({ entry }: { entry: GlobalEntry }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
      style={{
        background: entry.isMe ? '#eff5ff' : '#f5f7fb',
        border: `2.5px solid ${entry.isMe ? '#4a90e2' : '#c8d0e0'}`,
      }}
    >
      <RankBadge rank={entry.rank}/>
      <Avatar shirt={entry.shirt ?? DEFAULT_SHIRT} skin={entry.skin} equipped={entry.equipped}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-game font-bold text-sm truncate" style={{ color: '#1a2b4a' }}>{entry.username}</span>
          {entry.isMe && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-game font-bold text-white flex-shrink-0" style={{ background: '#4a90e2' }}>YOU</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-game font-bold flex-shrink-0" style={{ color: ACCENT }}>Lvl {entry.level}</span>
          <span className="text-[10px] font-game truncate" style={{ color: '#9aaac4' }}>{setLabel(entry)}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-game font-black text-sm" style={{ color: entry.bestScore === null ? '#c8d0e0' : '#f59e0b' }}>
          {entry.bestScore === null ? '—' : entry.bestScore.toLocaleString()}
        </div>
        <div className="text-[9px] font-game" style={{ color: '#7a8ba8' }}>pts</div>
      </div>
    </div>
  )
}

/** In place of my rank while I'm unverified: why I'm missing, and the way in. */
function VerifyToRankCard({ onVerify }: { onVerify: () => void }) {
  return (
    <button
      onClick={onVerify}
      className="w-full flex items-center gap-3 p-3 mb-4 rounded-2xl text-left transition-transform active:scale-[0.98] anim-fade-up"
      style={{ background: '#fffbeb', border: '2.5px solid #fde68a', boxShadow: '0 4px 14px rgba(245,158,11,0.12)' }}
    >
      <ShieldIcon size={30}/>
      <div className="flex-1 min-w-0">
        <p className="font-game font-black text-sm leading-tight" style={{ color: '#b45309' }}>Verify To Rank Globally</p>
        <p className="font-game text-[11px] leading-snug" style={{ color: '#b45309cc' }}>Only verified players appear on the global board. Takes about 2 minutes.</p>
      </div>
      <span className="px-3 py-2 rounded-xl font-game font-black text-xs text-white flex-shrink-0" style={{ background: '#f59e0b' }}>Verify →</span>
    </button>
  )
}

/** Verified players, ranked by their best single-set score. */
function GlobalLeaderboard({ onVerify }: { onVerify: () => void }) {
  const { board, failed, reload } = useGlobalLeaderboard()
  const me = board?.me
  const unverified = me?.verified === false
  const ranked = me && me.bestScore !== null && me.rank !== null

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2 className="font-game font-black text-xl leading-tight" style={{ color: '#1a2b4a' }}>Global Leaderboard</h2>
          <p className="text-xs font-game" style={{ color: '#7a8ba8' }}>Verified players, ranked by their best set score</p>
        </div>
        {me && (
          <div className="text-right flex-shrink-0">
            <div className="font-game font-black text-base" style={{ color: ranked ? '#f59e0b' : '#9aaac4' }}>{ranked ? `#${me.rank}` : '—'}</div>
            <div className="text-[10px] font-game" style={{ color: '#7a8ba8' }}>{ranked ? 'Your rank' : unverified ? 'Unverified' : 'Finish a set to rank'}</div>
          </div>
        )}
      </div>
      {unverified && <VerifyToRankCard onVerify={onVerify}/>}

      {!board && !failed && (
        <p className="text-xs font-game text-center py-6" style={{ color: '#7a8ba8' }}>Loading the leaderboard…</p>
      )}
      {!board && failed && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-xs font-game text-center" style={{ color: '#7a8ba8' }}>Couldn't reach the server.</p>
          <button onClick={reload} className="px-4 py-2 rounded-2xl font-game font-bold text-sm text-white active:scale-95" style={{ background: ACCENT }}>
            Try again
          </button>
        </div>
      )}
      {board && board.entries.length === 0 && (
        <p className="text-xs font-game text-center py-6" style={{ color: '#7a8ba8' }}>No one's here yet. Finish a set to claim #1!</p>
      )}
      <div className="flex flex-col gap-2">
        {board?.entries.map(entry => <GlobalRow key={entry.username} entry={entry}/>)}
      </div>
    </div>
  )
}

export default function LeaderboardScreen({ onChallenge }: { onChallenge: (f: Friend) => void }) {
  const [view, setView] = useState<'global' | 'friends'>('global')
  const [verifying, setVerifying] = useState(false)

  const tab = (id: 'global' | 'friends', label: string) => (
    <button
      className="flex-1 py-2 rounded-xl text-sm font-game font-bold transition-all"
      style={{
        background: view === id ? '#58cc02' : 'transparent',
        color: view === id ? '#fff' : '#7a8ba8',
        boxShadow: view === id ? '0 2px 10px rgba(88,204,2,0.35)' : 'none',
      }}
      onClick={() => setView(id)}
    >
      {label}
    </button>
  )

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-(--top-gap) pb-3 flex-shrink-0">
        <h1 className="font-game font-black text-2xl mb-3" style={{ color: '#1a2b4a' }}>Leaderboard</h1>
        <div className="flex rounded-2xl p-1" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
          {tab('global', '🌍 Global')}
          {tab('friends', '👥 Friends')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        {view === 'global' ? <GlobalLeaderboard onVerify={() => setVerifying(true)}/> : <FriendsSection onChallenge={onChallenge}/>}
      </div>
      {verifying && <VerifyModal onClose={() => setVerifying(false)}/>}
    </div>
  )
}
