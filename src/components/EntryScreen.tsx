import { useEffect, useState } from 'react'

export const SLOGAN = 'Your Best Rep Is Your Next Rep'

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

/** Sign-in controls, when this build requires signing in. */
export interface EntryAuth {
  /** Clerk has loaded and knows whether we're signed in. */
  ready: boolean
  signedIn: boolean
  /** Start "Continue with Google" (leaves the page and comes back). */
  onGoogle: () => Promise<void>
}

/**
 * Shown on every launch: the NR logo and slogan; tap anywhere to continue. Signed out (when sign-in is required),
 * the tap reveals "Continue with Google" instead.
 */
export default function EntryScreen({ onContinue, auth }: { onContinue: () => void; auth?: EntryAuth }) {
  const [tapped, setTapped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsSignIn = !!auth && auth.ready && !auth.signedIn
  const showSignIn = tapped && needsSignIn

  const tap = () => {
    if (showSignIn) return
    if (auth && !auth.ready) return setTapped(true) // continue once Clerk has loaded (below)
    if (needsSignIn) return setTapped(true)
    onContinue()
  }
  // Tapped while Clerk was still loading: go on as soon as it knows we're signed in.
  const signedInAfterTap = tapped && !!auth?.ready && auth.signedIn
  useEffect(() => { if (signedInAfterTap) onContinue() }, [signedInAfterTap, onContinue])

  const google = async () => {
    if (busy || !auth) return
    setBusy(true)
    setError(null)
    try {
      await auth.onGoogle()
    } catch {
      setError("Couldn't Start Google Sign-In. Check Your Connection And Try Again.")
      setBusy(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-[90] flex flex-col items-center select-none"
      style={{ background: 'linear-gradient(170deg, #ffffff 0%, #eff5ff 55%, #dcebff 100%)', cursor: showSignIn ? 'default' : 'pointer' }}
      onClick={tap}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" style={{ paddingTop: 'var(--top-gap)' }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="NextRep"
          draggable={false}
          className="anim-fade-up"
          style={{ width: 176, maxWidth: '55%', height: 'auto' }}
        />
        <p className="font-game font-black text-2xl leading-tight mt-6 anim-fade-up" style={{ color: '#1a2b4a', maxWidth: 280 }}>
          {SLOGAN}
        </p>
      </div>

      <div className="w-full px-6 flex flex-col items-center gap-3" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))', minHeight: 150 }}>
        {showSignIn ? (
          <div className="w-full flex flex-col items-center gap-3 anim-fade-up" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => void google()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-game font-black text-base transition-transform active:scale-95 disabled:opacity-60"
              style={{ background: '#ffffff', color: '#1a2b4a', border: '2.5px solid #c8d0e0', boxShadow: '0 6px 20px rgba(26,43,74,0.12)' }}
            >
              <GoogleG/>
              {busy ? 'Opening Google…' : 'Continue With Google'}
            </button>
            {error
              ? <p className="font-game font-bold text-xs text-center" style={{ color: '#ff4b4b' }}>{error}</p>
              : <p className="font-game text-xs text-center" style={{ color: '#7a8ba8' }}>Sign In To Keep Your Reps, Friends And BP</p>}
          </div>
        ) : (
          <p className="font-game font-black text-sm tracking-widest uppercase animate-pulse" style={{ color: '#4a90e2' }}>
            {tapped ? 'Loading…' : 'Tap To Continue'}
          </p>
        )}
      </div>
    </div>
  )
}
