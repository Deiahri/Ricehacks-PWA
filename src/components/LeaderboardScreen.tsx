import { useState } from 'react'
import { LocalLeaderboard, FriendsSection, LEADERBOARD } from './CalendarScreen'

export default function LeaderboardScreen() {
  const [view, setView] = useState<'local' | 'friends'>('local')

  const sorted = [...LEADERBOARD].sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }))
  const me = sorted.find(e => e.isMe)

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#ffffff' }}>
      <div className="px-4 pt-14 pb-3 flex-shrink-0">
        <h1 className="font-game font-black text-2xl mb-3" style={{ color: '#1a2b4a' }}>Leaderboard</h1>
        <div
          className="flex rounded-2xl p-1"
          style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}
        >
          <button
            className="flex-1 py-2 rounded-xl text-sm font-game font-bold transition-all"
            style={{
              background: view === 'local' ? '#58cc02' : 'transparent',
              color: view === 'local' ? '#fff' : '#7a8ba8',
              boxShadow: view === 'local' ? '0 2px 10px rgba(88,204,2,0.35)' : 'none',
            }}
            onClick={() => setView('local')}
          >
            🏙️ Local
          </button>
          <button
            className="flex-1 py-2 rounded-xl text-sm font-game font-bold transition-all"
            style={{
              background: view === 'friends' ? '#58cc02' : 'transparent',
              color: view === 'friends' ? '#fff' : '#7a8ba8',
              boxShadow: view === 'friends' ? '0 2px 10px rgba(88,204,2,0.35)' : 'none',
            }}
            onClick={() => setView('friends')}
          >
            👥 Friends
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-4">
        {view === 'local'
          ? <LocalLeaderboard sorted={sorted} me={me}/>
          : <FriendsSection/>
        }
      </div>
    </div>
  )
}
