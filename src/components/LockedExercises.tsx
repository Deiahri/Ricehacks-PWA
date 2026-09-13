import { useState, type ReactNode } from 'react'
import type { LockedExerciseId } from '../game/types'

// Placeholder art for moves that aren't in the game yet: simple stick figures on a 48×48 grid.
const FIGURES: Record<LockedExerciseId, ReactNode> = {
  // Arms up, legs wide.
  jumping_jack: (
    <>
      <circle cx="24" cy="9" r="4.5"/>
      <path d="M24 13.5V29M24 17L13 7M24 17l11-10M24 29l-10 14M24 29l10 14"/>
    </>
  ),
  // Side-on forearm plank over the floor.
  plank: (
    <>
      <circle cx="40" cy="20" r="4.5"/>
      <path d="M35 24L6 34M34 24.5V35h7"/>
      <path d="M3 38.5h42" strokeWidth="2" strokeDasharray="3 3"/>
    </>
  ),
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 11V7.5a4 4 0 018 0V11" stroke="#9aaac4" strokeWidth="2.6"/>
      <rect x="4" y="11" width="16" height="11" rx="2.5" fill="#9aaac4"/>
    </svg>
  )
}

/** A move that's coming later: greyed, padlocked, and only wiggles when tapped. */
export function LockedExerciseCard({ id, label }: { id: LockedExerciseId; label: string }) {
  const [shaking, setShaking] = useState(false)
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label}: coming soon`}
      onClick={() => setShaking(true)}
      onAnimationEnd={() => setShaking(false)}
      className={`relative flex flex-col items-center gap-1 pt-3 pb-2.5 px-1 rounded-2xl ${shaking ? 'anim-shake' : ''}`}
      style={{ background: '#f5f7fb', border: '2.5px dashed #c8d0e0' }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#9aaac4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: 0.75 }} aria-hidden="true">
        {FIGURES[id]}
      </svg>
      <span className="font-game font-black text-[12px] leading-tight text-center" style={{ color: '#7a8ba8' }}>{label}</span>
      <span className="font-game font-bold text-[9px] uppercase tracking-wide" style={{ color: '#9aaac4' }}>Coming Soon</span>
      <span className="absolute -top-2 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: '#ffffff', border: '2px solid #c8d0e0' }}>
        <LockIcon/>
      </span>
    </button>
  )
}
