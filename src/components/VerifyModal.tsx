import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Client as PersonaClient } from 'persona'
import { ShieldIcon } from './UnverifiedTag'
import { ACCENT, ACCENT_BG } from '../theme'
import { api, ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'

// Persona's embedded flow (ID + selfie in its own overlay). The server hands out the reference id (my account) and,
// once the flow completes, checks the inquiry with Persona itself before marking me verified.
const TEMPLATE_ID = import.meta.env.VITE_PERSONA_TEMPLATE_ID || null
const ENVIRONMENT_ID = import.meta.env.VITE_PERSONA_ENVIRONMENT_ID || null

const ERRORS: Record<string, string> = {
  'persona-not-configured': "Verification isn't set up on this server yet.",
  'not-passed': "Persona couldn't confirm your identity. You can try again.",
  'not-yours': 'That verification belongs to a different account.',
  'inquiry-used': 'That verification was already used by another account.',
  'no-inquiry': "Persona couldn't find that verification. Try again.",
  'persona-unavailable': "Couldn't reach Persona. Try again in a moment.",
  offline: "Can't reach the server. Try again.",
}

type Phase = 'intro' | 'loading' | 'open' | 'checking' | 'done' | 'error'

function Perk({ icon, bg, title, text }: { icon: ReactNode; bg: string; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#f5f7fb', border: '2px solid #e3e8f1' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: bg }}>{icon}</div>
      <div className="min-w-0">
        <p className="font-game font-black text-sm leading-tight" style={{ color: '#1a2b4a' }}>{title}</p>
        <p className="font-game text-[11px] leading-snug" style={{ color: '#7a8ba8' }}>{text}</p>
      </div>
    </div>
  )
}

/** "Verify your identity" sheet: what verifying gets you, then Persona's flow. */
export default function VerifyModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useProfile()
  const [phase, setPhase] = useState<Phase>('intro')
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<PersonaClient | null>(null)
  useEffect(() => () => clientRef.current?.destroy(), [])

  const busy = phase === 'loading' || phase === 'open' || phase === 'checking'
  const fail = (code: string) => {
    setError(ERRORS[code] ?? 'Something went wrong. Try again.')
    setPhase('error')
  }

  const finish = async (inquiryId: string) => {
    setPhase('checking')
    try {
      await api('POST', '/api/verify', { inquiryId })
      refresh()
      setPhase('done')
    } catch (e) {
      fail(e instanceof ApiError ? e.code : '')
    }
  }

  const start = async () => {
    if (busy) return
    if (!TEMPLATE_ID || !ENVIRONMENT_ID) return fail('persona-not-configured')
    setPhase('loading')
    setError(null)
    try {
      const { referenceId } = await api<{ referenceId: string }>('GET', '/api/verify/start')
      const { Client } = await import('persona') // only people who verify download the SDK
      clientRef.current?.destroy()
      const client = new Client({
        templateId: TEMPLATE_ID,
        environmentId: ENVIRONMENT_ID,
        referenceId,
        onReady: () => {
          setPhase('open')
          client.open()
        },
        onComplete: ({ inquiryId }) => void finish(inquiryId),
        onCancel: () => setPhase('intro'),
        onError: () => fail('persona-unavailable'),
      })
      clientRef.current = client
    } catch (e) {
      fail(e instanceof ApiError ? e.code : 'persona-unavailable')
    }
  }

  const label = {
    intro: 'Start Verification',
    error: 'Try Again',
    loading: 'Opening Persona…',
    open: 'Finish In The Persona Window…',
    checking: 'Checking…',
    done: 'Nice!',
  }[phase]

  return (
    <div className="absolute inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={busy ? undefined : onClose}>
      <div
        className="anim-fade-up w-full rounded-t-3xl px-5 pt-3"
        style={{ background: '#ffffff', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 w-10 h-1.5 rounded-full" style={{ background: '#e0e6f0' }}/>

        {phase === 'done' ? (
          <div className="flex flex-col items-center text-center gap-2 pb-2">
            <div className="w-20 h-20 rounded-full flex items-center justify-center anim-pop-in" style={{ background: '#effbe6', border: '3px solid #58cc02' }}>
              <ShieldIcon size={44} color="#58cc02" check/>
            </div>
            <h2 className="font-game font-black text-2xl mt-2" style={{ color: '#1a2b4a' }}>You're Verified!</h2>
            <p className="font-game text-sm" style={{ color: '#7a8ba8' }}>You're on the global leaderboard now, and the Unverified tag is gone.</p>
            <button
              onClick={onClose}
              className="w-full mt-4 py-4 rounded-2xl font-game font-black text-lg text-white transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 24px rgba(88,204,2,0.35)' }}
            >
              {label}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: ACCENT_BG, border: `3px solid ${ACCENT}` }}>
                <ShieldIcon size={34} color={ACCENT} check/>
              </div>
              <h2 className="font-game font-black text-2xl mt-1" style={{ color: '#1a2b4a' }}>Verify Your Identity</h2>
              <p className="font-game text-[13px] leading-snug" style={{ color: '#7a8ba8', maxWidth: 300 }}>
                A quick ID check keeps rankings fair: one real person, one spot on the board.
              </p>
            </div>

            <p className="font-game font-black text-xs uppercase tracking-wider mt-5 mb-2" style={{ color: '#9aaac4' }}>What You Get</p>
            <div className="flex flex-col gap-2">
              <Perk icon="🏆" bg="#fff4cc" title="Global Ranking" text="Appear on the worldwide leaderboard and see your #rank."/>
              <Perk icon={<ShieldIcon size={22} color="#58cc02" check/>} bg="#effbe6" title="No More Unverified Tag"
                text="Friends and players on the map stop seeing the Unverified tag."/>
            </div>

            {error && <p className="font-game font-bold text-xs text-center mt-4" style={{ color: '#ff4b4b' }}>{error}</p>}

            <button
              onClick={() => void start()}
              disabled={busy}
              className="w-full mt-5 py-4 rounded-2xl font-game font-black text-lg text-white transition-transform active:scale-95 disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #3576c4)`, boxShadow: `0 8px 24px ${ACCENT}55` }}
            >
              {label}
            </button>
            <p className="font-game text-[11px] text-center mt-2" style={{ color: '#9aaac4' }}>
              Powered by Persona · takes about 2 minutes · have your ID ready
            </p>
            <button onClick={onClose} disabled={busy} className="w-full mt-2 py-2 font-game font-bold text-sm disabled:opacity-40" style={{ color: '#7a8ba8' }}>
              Not Now
            </button>
          </>
        )}
      </div>
    </div>
  )
}
