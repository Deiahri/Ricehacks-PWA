import { useState } from 'react'
import CharacterSprite from './CharacterSprite'
import { ACCENT, ACCENT_BG } from '../App'
import { ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'
import { IDENTITY } from '../live/usePresence'

const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/ // same rule as the server

const ERRORS: Record<string, string> = {
  taken: 'That name is taken. Try another one.',
  invalid: 'Use 3–16 letters, numbers or underscores.',
  offline: "Can't reach the server. Check your connection and try again.",
  'no-db': "The server isn't storing accounts right now.",
}

/**
 * Choose a username. 'first' fills the screen and blocks the app until a name is saved;
 * 'rename' is a sheet over the profile.
 */
export default function UsernamePicker({ mode, onClose, onSkip }: {
  mode: 'first' | 'rename'
  onClose?: () => void
  /** First launch only: play without a name while the server is out of reach. */
  onSkip?: () => void
}) {
  const { status, profile, claimUsername } = useProfile()
  const [name, setName] = useState(mode === 'rename' ? profile?.username ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = USERNAME_RE.test(name)
  const unchanged = mode === 'rename' && name === profile?.username
  const waking = status === 'loading' || status === 'offline'

  const submit = async () => {
    if (!valid || busy || unchanged) return
    setBusy(true)
    setError(null)
    try {
      await claimUsername(name)
      onClose?.()
    } catch (e) {
      setError(ERRORS[e instanceof ApiError ? e.code : ''] ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const form = (
    <>
      <div
        className="flex items-center gap-1 w-full px-4 py-3 rounded-2xl"
        style={{ background: '#f5f7fb', border: `2.5px solid ${error ? '#ff4b4b' : valid ? ACCENT : '#c8d0e0'}` }}
      >
        <span className="font-game font-black text-lg" style={{ color: '#9aaac4' }}>@</span>
        <input
          autoFocus={mode === 'rename'}
          value={name}
          onChange={e => { setName(e.target.value.trim()); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }}
          maxLength={16}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="your_name"
          aria-label="Username"
          className="flex-1 min-w-0 bg-transparent outline-none font-game font-black text-lg"
          style={{ color: '#1a2b4a' }}
        />
      </div>
      <p className="text-xs font-game font-bold mt-2 min-h-4" style={{ color: error ? '#ff4b4b' : '#7a8ba8' }}>
        {error ?? (name && !valid ? ERRORS.invalid : '3–16 letters, numbers or _. You can change it later.')}
      </p>
    </>
  )

  if (mode === 'rename') {
    return (
      <div className="absolute inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
        <div
          className="anim-fade-up w-full rounded-t-3xl px-5 pt-5"
          style={{ background: '#ffffff', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          onClick={e => e.stopPropagation()}
        >
          <h2 className="font-game font-black text-xl mb-3" style={{ color: '#1a2b4a' }}>Change username</h2>
          {form}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl font-game font-bold text-sm active:scale-95"
              style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={!valid || busy || unchanged}
              className="flex-1 py-3 rounded-2xl font-game font-black text-sm text-white active:scale-95 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)` }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[80] flex flex-col" style={{ background: '#ffffff' }}>
      <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center justify-center text-center" style={{ paddingTop: 'var(--top-gap)' }}>
        <div className="rounded-3xl flex items-end justify-center pb-2 mb-5" style={{ width: 140, height: 170, background: ACCENT_BG, border: `2.5px solid ${ACCENT}` }}>
          <CharacterSprite size="md" animate shirt={IDENTITY.shirt}/>
        </div>
        <h1 className="font-game font-black text-3xl" style={{ color: '#1a2b4a' }}>Pick your name</h1>
        <p className="font-game text-sm mt-1 mb-6" style={{ color: '#7a8ba8' }}>
          It's how friends find you and how you show up on the map.
        </p>
        <div className="w-full text-left">{form}</div>
        {waking && (
          <div className="mt-3 px-3 py-1.5 rounded-full font-game font-bold text-xs" style={{ background: '#fffbeb', border: '2px solid #fde68a', color: '#b45309' }}>
            Waking up the server… this can take a minute
          </div>
        )}
      </div>
      <div className="flex-shrink-0 px-6 pt-4 flex flex-col items-center gap-3" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => void submit()}
          disabled={!valid || busy}
          className="w-full py-4 rounded-2xl font-game font-black text-lg text-white active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 8px 28px rgba(88,204,2,0.4)' }}
        >
          {busy ? 'Saving…' : "Let's go →"}
        </button>
        {waking && onSkip && (
          <button onClick={onSkip} className="font-game font-bold text-sm" style={{ color: '#7a8ba8' }}>
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
