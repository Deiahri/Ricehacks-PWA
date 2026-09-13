import { useRef, useState } from 'react'
import CharacterSprite from './CharacterSprite'
import { ACCENT } from '../App'
import { DEFAULT_SHIRT, DEFAULT_SKIN, SKIN_TONES, skinColors } from '../config/appearance'
import { ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'
import { IDENTITY } from '../live/usePresence'

// ─── Colour maths (HSV: hue 0–360, saturation and value 0–1) ──────
interface Hsv { h: number; s: number; v: number }

function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (k: number) => {
    const x = (k + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(x, 4 - x, 1))
  }
  return '#' + [f(5), f(3), f(1)].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

const HEX = /^#[0-9a-f]{6}$/i
const WHEEL = 196 // px
const MIN_SHADE = 0.3 // darkest the shade slider goes

/**
 * Rainbow colour wheel: angle = hue, distance from the centre = saturation, plus a shade slider for brightness.
 * The disc is a conic gradient starting at 3 o'clock (red) going clockwise, so hue = atan2(dy, dx) in screen space.
 */
function ColorWheel({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState<Hsv>(() => {
    const c = hexToHsv(HEX.test(value) ? value : DEFAULT_SHIRT)
    return { ...c, v: Math.max(MIN_SHADE, c.v) }
  })
  const disc = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const update = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }
  const pick = (e: React.PointerEvent) => {
    const box = disc.current!.getBoundingClientRect()
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height / 2)
    const h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    update({ ...hsv, h, s: Math.min(1, Math.hypot(dx, dy) / (box.width / 2)) })
  }

  const r = (hsv.s * WHEEL) / 2
  const rad = (hsv.h * Math.PI) / 180
  const pure = hsvToHex({ ...hsv, v: 1 })

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        ref={disc}
        role="slider"
        aria-label="Shirt colour"
        aria-valuetext={hsvToHex(hsv)}
        className="relative rounded-full flex-shrink-0"
        style={{
          width: WHEEL, height: WHEEL, touchAction: 'none', cursor: 'crosshair',
          background: 'radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), '
            + 'conic-gradient(from 90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          boxShadow: '0 4px 14px rgba(26,43,74,0.18), inset 0 0 0 2px rgba(255,255,255,0.7)',
        }}
        onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={e => { if (dragging.current) pick(e) }}
        onPointerUp={() => { dragging.current = false }}
        onPointerCancel={() => { dragging.current = false }}
      >
        {/* Shade: darken the whole disc to match the slider */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: '#000', opacity: 1 - hsv.v }}/>
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 26, height: 26,
            left: WHEEL / 2 + Math.cos(rad) * r - 13,
            top: WHEEL / 2 + Math.sin(rad) * r - 13,
            background: hsvToHex(hsv),
            border: '3px solid #fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
        />
      </div>
      <label className="w-full flex items-center gap-3">
        <span className="font-game font-bold text-xs flex-shrink-0" style={{ color: '#7a8ba8' }}>Shade</span>
        <input
          type="range"
          min={MIN_SHADE * 100}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={e => update({ ...hsv, v: Number(e.target.value) / 100 })}
          className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, ${hsvToHex({ ...hsv, v: MIN_SHADE })}, ${pure})`, accentColor: pure }}
        />
      </label>
    </div>
  )
}

const ERRORS: Record<string, string> = {
  offline: "Can't reach the server. Try again.",
  'no-db': "The server isn't storing accounts right now.",
}

/** Bottom sheet: pick a skin tone and a shirt colour. Free, saved to the account, and everyone on the map sees it. */
export default function AvatarEditor({ onClose }: { onClose: () => void }) {
  const { profile, setAppearance } = useProfile()
  const [skin, setSkin] = useState(profile?.skin ?? DEFAULT_SKIN)
  const [shirt, setShirt] = useState(profile?.shirt ?? IDENTITY.shirt)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unchanged = skin === (profile?.skin ?? DEFAULT_SKIN) && shirt === (profile?.shirt ?? IDENTITY.shirt)

  const save = async () => {
    if (busy || unchanged) return onClose()
    setBusy(true)
    setError(null)
    try {
      await setAppearance({ skin, shirt })
      onClose()
    } catch (e) {
      setError(ERRORS[e instanceof ApiError ? e.code : ''] ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div
        className="anim-fade-up w-full rounded-t-3xl px-5 pt-5 max-h-full overflow-y-auto"
        style={{ background: '#ffffff', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-game font-black text-xl mb-3" style={{ color: '#1a2b4a' }}>Edit avatar</h2>

        <div className="flex items-end justify-center mx-auto mb-4 rounded-3xl pb-2"
          style={{ width: 120, height: 140, background: '#eff5ff', border: `2.5px solid ${ACCENT}` }}>
          <CharacterSprite size="md" animate {...skinColors(skin)} shirt={shirt} equipped={profile?.equipped}/>
        </div>

        <p className="font-game font-black text-sm mb-2" style={{ color: '#1a2b4a' }}>Skin tone</p>
        <div className="grid grid-cols-8 gap-2 mb-5">
          {SKIN_TONES.map(t => (
            <button
              key={t.id}
              onClick={() => setSkin(t.id)}
              aria-label={`Skin tone ${t.id.slice(1)}`}
              aria-pressed={skin === t.id}
              className="aspect-square rounded-full transition-transform active:scale-90"
              style={{
                background: t.fill,
                border: `3px solid ${t.outline}`,
                boxShadow: skin === t.id ? `0 0 0 3px #fff, 0 0 0 5.5px ${ACCENT}` : 'none',
              }}
            />
          ))}
        </div>

        <p className="font-game font-black text-sm mb-3" style={{ color: '#1a2b4a' }}>Shirt colour</p>
        <ColorWheel value={shirt} onChange={setShirt}/>

        {error && <p className="font-game font-bold text-xs mt-3" style={{ color: '#ff4b4b' }}>{error}</p>}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-game font-bold text-sm active:scale-95"
            style={{ background: '#f5f7fb', color: '#7a8ba8', border: '2.5px solid #c8d0e0' }}
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || !profile}
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
