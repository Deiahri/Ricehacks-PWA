import { useEffect, useRef, useState } from 'react'
import CharacterSprite from './CharacterSprite'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'

const ANSWER_WINDOW_MS = 30_000 // matches the server's request timeout

function SpriteTile({ player }: { player: Player }) {
  return (
    <div
      className="w-[64px] h-[64px] rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${ACCENT}22`, border: `2px solid ${ACCENT}44` }}
    >
      <CharacterSprite size="sm" {...player.appearance} {...player.equipment}/>
    </div>
  )
}

/** Shown on any tab when someone challenges us. */
export function IncomingChallengeModal({ from, onAnswer }: { from: Player; onAnswer: (accept: boolean) => void }) {
  const [accepting, setAccepting] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // Draining bar = time left to answer.
  useEffect(() => {
    const anim = barRef.current?.animate(
      [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
      { duration: ANSWER_WINDOW_MS, easing: 'linear', fill: 'forwards' },
    )
    return () => anim?.cancel()
  }, [])

  return (
    <div
      className="absolute inset-0 z-[60] flex items-end justify-center px-4"
      style={{ paddingBottom: 'calc(112px + env(safe-area-inset-bottom))', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(1px)' }}
    >
      <div
        role="alertdialog"
        aria-label={`Battle request from ${from.name}`}
        className="anim-pop-in w-full max-w-[340px] rounded-3xl overflow-hidden"
        style={{ background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 20px 60px rgba(0,0,0,0.16)' }}
      >
        <div className="flex items-center gap-4 p-4 pb-3" style={{ background: ACCENT_BG }}>
          <SpriteTile player={from}/>
          <div className="flex-1 min-w-0">
            <div className="font-game font-black text-[11px]" style={{ color: '#ff4b4b', letterSpacing: '0.12em' }}>⚔ BATTLE REQUEST</div>
            <div className="font-game font-black text-lg leading-tight truncate" style={{ color: '#1a2b4a' }}>{from.name}</div>
            <div className="text-[11px] font-game" style={{ color: '#7a8ba8' }}>wants to battle you</div>
          </div>
        </div>
        <div className="h-1" style={{ background: '#e8edf5' }}>
          <div ref={barRef} className="h-full" style={{ background: ACCENT, transformOrigin: 'left' }}/>
        </div>
        <div className="flex gap-3 p-4">
          <button
            disabled={accepting}
            onClick={() => onAnswer(false)}
            className="flex-1 py-3 rounded-2xl text-sm font-game font-bold transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
          >
            Decline
          </button>
          <button
            disabled={accepting}
            onClick={() => { setAccepting(true); onAnswer(true) }}
            className="flex-1 py-3 rounded-2xl text-sm font-game font-black text-white transition-transform active:scale-95 disabled:opacity-70"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, boxShadow: `0 4px 16px ${ACCENT}44` }}
          >
            {accepting ? 'Joining…' : '⚔ Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Our request is pending on the other phone. */
export function OutgoingChallengeCard({ to, onCancel }: { to: Player; onCancel: () => void }) {
  return (
    <div
      className="absolute inset-x-6 z-[55] flex flex-col items-center gap-3 rounded-3xl p-5 text-center anim-pop-in"
      style={{ top: '38%', background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 20px 60px rgba(0,0,0,0.16)' }}
    >
      <SpriteTile player={to}/>
      <span className="font-game font-black text-lg" style={{ color: '#1a2b4a' }}>Waiting for {to.name}…</span>
      <span className="font-game text-xs" style={{ color: '#7a8ba8' }}>They have 30 seconds to accept your battle request.</span>
      <div
        className="w-6 h-6 rounded-full"
        style={{ border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT, animation: 'spin 0.9s linear infinite' }}
      />
      <button
        onClick={onCancel}
        className="rounded-2xl px-5 py-2.5 font-game font-bold text-sm transition-transform active:scale-95"
        style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
      >
        Cancel
      </button>
    </div>
  )
}

export function Toast({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="absolute left-4 right-4 z-[70] flex justify-center pointer-events-none"
      style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
    >
      <div
        className="anim-fade-up rounded-2xl px-4 py-2.5 font-game font-bold text-sm text-center"
        style={{ background: '#1a2b4a', color: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
      >
        {text}
      </div>
    </div>
  )
}
