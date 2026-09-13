import { useState } from 'react'
import { ACCENT, ACCENT_BG } from '../theme'
import { COSMETICS, cosmeticUrl, type Cosmetic, type Slot } from '../config/cosmetics'
import { ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'
import { SHOP_ERRORS } from './ShopScreen'

const SLOTS: { slot: Slot; label: string; note?: string }[] = [
  { slot: 'head', label: 'Head' },
  { slot: 'mainhand', label: 'Main Hand', note: 'One at a time' },
  { slot: 'offhand', label: 'Off Hand' },
]

function BackpackIcon({ size = 22, color = ACCENT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 5V4a3 3 0 0 1 6 0v1" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <rect x="4.5" y="5" width="15" height="16" rx="4" stroke={color} strokeWidth="2.2"/>
      <path d="M8 13h8v4H8z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M4.5 11h15" stroke={color} strokeWidth="2"/>
    </svg>
  )
}

function ItemRow({ item, worn, busy, onTap }: { item: Cosmetic; worn: boolean; busy: boolean; onTap: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl"
      style={{ background: '#ffffff', border: `2.5px solid ${worn ? '#58cc02' : '#c8d0e0'}` }}>
      <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 56, height: 56, background: item.tint }}>
        <img src={cosmeticUrl(item)} alt="" style={{ maxWidth: 42, maxHeight: 42, objectFit: 'contain', filter: `drop-shadow(0 2px 5px ${item.glowColor}66)` }}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-game font-black text-sm truncate" style={{ color: '#1a2b4a' }}>{item.name}</span>
          {worn && (
            <span className="font-game font-black text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#58cc02', color: '#fff' }}>
              ✓ Wearing
            </span>
          )}
        </div>
        <p className="font-game font-bold text-[10.5px] leading-snug" style={{ color: item.glowColor }}>⚔ {item.effect}</p>
      </div>
      <button
        onClick={onTap}
        disabled={busy}
        className="px-3 py-2 rounded-xl font-game font-black text-xs flex-shrink-0 transition-transform active:scale-95"
        style={worn
          ? { background: '#ffffff', color: '#7a8ba8', border: '2px solid #c8d0e0', opacity: busy ? 0.6 : 1 }
          : { background: ACCENT, color: '#ffffff', border: `2px solid ${ACCENT}`, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? '…' : worn ? 'Take Off' : 'Equip'}
      </button>
    </div>
  )
}

/** Everything you own, by slot, right on the Profile (the avatar above is the preview). */
export default function Inventory({ onOpenShop }: { onOpenShop: () => void }) {
  const { profile, equip } = useProfile()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const owned = COSMETICS.filter(c => profile?.owned.includes(c.id))
  const isWorn = (c: Cosmetic) => profile?.equipped[c.slot] === c.id

  const tapItem = async (c: Cosmetic) => {
    if (busyId || !profile) return
    setBusyId(c.id)
    setMessage(null)
    try {
      await equip(c.slot, isWorn(c) ? null : c.id)
    } catch (e) {
      setMessage(SHOP_ERRORS[e instanceof ApiError ? e.code : ''] ?? 'Something went wrong. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 30, height: 30, background: ACCENT_BG }}>
          <BackpackIcon size={17}/>
        </span>
        <h2 className="font-game font-black text-lg flex-1" style={{ color: '#1a2b4a' }}>Inventory</h2>
        <span className="font-game font-bold text-xs" style={{ color: '#7a8ba8' }}>
          {owned.length} item{owned.length === 1 ? '' : 's'}
        </span>
      </div>

      {message && <p className="font-game font-bold text-xs text-center" style={{ color: '#ff4b4b' }}>{message}</p>}

      {owned.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-1.5 py-5 rounded-2xl"
          style={{ background: '#f5f7fb', border: '2.5px dashed #c8d0e0' }}>
          <BackpackIcon size={32} color="#c8d0e0"/>
          <p className="font-game font-black text-sm" style={{ color: '#1a2b4a' }}>Your bag is empty</p>
          <p className="font-game text-xs px-4" style={{ color: '#7a8ba8' }}>Earn BP from workouts and battles, then pick up some gear.</p>
          <button onClick={onOpenShop} className="mt-1 font-game font-black text-xs active:scale-95" style={{ color: '#8a5a2b' }}>
            Visit the Shop →
          </button>
        </div>
      ) : (
        SLOTS.map(({ slot, label, note }) => {
          const items = owned.filter(c => c.slot === slot)
          if (!items.length) return null
          return (
            <div key={slot} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="font-game font-black text-xs uppercase tracking-wide" style={{ color: '#7a8ba8' }}>{label}</h3>
                {note && items.length > 1 && <span className="font-game text-[11px]" style={{ color: '#7a8ba8' }}>{note}</span>}
              </div>
              {items.map(item => (
                <ItemRow key={item.id} item={item} worn={isWorn(item)} busy={busyId === item.id} onTap={() => void tapItem(item)}/>
              ))}
            </div>
          )
        })
      )}
    </section>
  )
}
