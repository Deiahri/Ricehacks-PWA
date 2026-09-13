import { useState } from 'react'
import { ACCENT } from '../theme'

/** Server-side cap (server.mjs CHAT_MAX); the input stops there too so the counter never lies. */
export const CHAT_MAX = 60

const QUICK = ["Let's go! 💪", 'Nice reps!', 'Challenge me?', '👋']

/** The 💬 button on the map and the sheet it opens. `onSay` sends the message and shows my own bubble. */
export default function ChatComposer({ onSay }: { onSay: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const say = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) return
    onSay(trimmed)
    setText('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Say something"
        className="absolute z-30 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-transform active:scale-90"
        style={{
          right: 16,
          bottom: 'calc(96px + env(safe-area-inset-bottom))',
          background: '#ffffff',
          border: '2.5px solid #c8d0e0',
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        }}
      >
        💬
      </button>
    )
  }

  return (
    <div
      className="absolute inset-0 z-[70] flex items-end"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(1px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Say something"
        className="anim-fade-up w-full rounded-t-3xl px-5 pt-5"
        style={{
          background: '#ffffff',
          borderTop: '2.5px solid #c8d0e0',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="font-game font-black text-lg mb-3" style={{ color: '#1a2b4a' }}>Say something</div>

        {/* One-tap phrases; typing still works for anything else. */}
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK.map(q => (
            <button
              key={q}
              onClick={() => say(q)}
              className="px-3 py-2 rounded-2xl font-game font-bold text-[13px] transition-transform active:scale-95"
              style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0', color: '#1a2b4a' }}
            >
              {q}
            </button>
          ))}
        </div>

        <div
          className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl"
          style={{ background: '#f5f7fb', border: `2.5px solid ${text.trim() ? ACCENT : '#c8d0e0'}` }}
        >
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') say(text) }}
            maxLength={CHAT_MAX}
            placeholder="Type a message…"
            aria-label="Message"
            className="flex-1 min-w-0 bg-transparent outline-none font-game font-black text-base"
            style={{ color: '#1a2b4a' }}
          />
          <span className="font-game font-bold text-[11px] flex-shrink-0" style={{ color: '#9aaac4' }}>
            {text.length}/{CHAT_MAX}
          </span>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-3 rounded-2xl text-sm font-game font-bold transition-transform active:scale-95"
            style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
          >
            Cancel
          </button>
          <button
            disabled={!text.trim()}
            onClick={() => say(text)}
            className="flex-1 py-3 rounded-2xl text-sm font-game font-black text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: ACCENT, boxShadow: `0 4px 16px ${ACCENT}44` }}
          >
            Say it
          </button>
        </div>
      </div>
    </div>
  )
}
