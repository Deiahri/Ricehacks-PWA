import { useState } from 'react'
import { isIOS, isStandalone, storage } from '../platform'

/** iOS has no install prompt API, so tell Safari users how to add the app to the home screen. */
export default function InstallHint() {
  const [show, setShow] = useState(() => isIOS() && !isStandalone() && storage.get('installHintDismissed') !== '1')
  if (!show) return null
  return (
    <div
      className="absolute left-3 right-3 z-30 flex items-center gap-3 rounded-2xl px-4 py-3 anim-fade-up"
      style={{ top: 12, background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
    >
      <span className="flex-1 font-game font-bold text-sm" style={{ color: '#1a2b4a' }}>
        Install: tap <b>Share</b> then <b>Add to Home Screen</b>.
      </span>
      <button
        className="flex items-center justify-center rounded-full font-game font-black transition-transform active:scale-90"
        style={{ width: 28, height: 28, background: '#f5f7fb', border: '2px solid #c8d0e0', color: '#7a8ba8' }}
        aria-label="Dismiss"
        onClick={() => {
          storage.set('installHintDismissed', '1')
          setShow(false)
        }}
      >
        ×
      </button>
    </div>
  )
}
