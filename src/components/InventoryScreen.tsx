import { useState } from 'react'
import type { Appearance } from '../App'
import { ACCENT, ACCENT_BG } from '../theme'
import { COSMETICS, cosmeticUrl, type Cosmetic, type Slot } from '../config/cosmetics'
import { ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'
import CharacterSprite from './CharacterSprite'
import { BackpackIcon } from './InventoryButton'
import { SHOP_ERRORS } from './ShopScreen'

const SLOTS: { slot: Slot; label: string; note?: string }[] = [
  { slot: 'head', label: 'Head' },
  { slot: 'mainhand', label: 'Main Hand', note: 'One at a time' },
  { slot: 'offhand', label: 'Off Hand' },
]

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

/** Everything you own, by slot, with a live preview of how it looks on you. A full-screen page over the Profile. */
export default function InventoryScreen({ appearance, onClose, onOpenShop }: {
  appearance: Appearance
  onClose: () => void
  onOpenShop: () => void
}) {
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
    <div className="absolute inset-0 z-30 overflow-y-auto anim-slide-in-right" style={{ background: '#ffffff' }}>
      <div className="sticky top-0 z-10 px-4 pt-(--top-gap) pb-3 flex items-center gap-3"
        style={{ background: `linear-gradient(180deg, ${ACCENT_BG}, #ffffff)`, borderBottom: '2px solid #dbe6f5' }}>
        <button
          onClick={onClose}
          aria-label="Back"
          className="flex items-center justify-center rounded-full transition-transform active:scale-90 flex-shrink-0"
          style={{ width: 34, height: 34, background: '#ffffff', border: '2px solid #c8d0e0' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="#1a2b4a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-game font-black text-xl leading-tight" style={{ color: '#1a2b4a' }}>Inventory</h2>
          <p className="text-[11px] font-game leading-tight" style={{ color: '#7a8ba8' }}>Tap an item to wear it. Everyone sees what you wear.</p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl flex-shrink-0" style={{ background: ACCENT_BG, border: '2px solid #c5daf5' }}>
          <BackpackIcon size={14}/>
          <span className="font-game font-black text-sm" style={{ color: ACCENT }}>{owned.length}</span>
        </div>
      </div>

      <div className="px-5 pt-4" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        {/* Live preview */}
        <div className="flex justify-center items-end rounded-[20px] mb-4"
          style={{ height: 150, background: ACCENT_BG, border: '2px solid #dbe6f5' }}>
          <div className="pb-2"><CharacterSprite size="md" animate {...appearance} equipped={profile?.equipped}/></div>
        </div>

        {message && <p className="font-game font-bold text-xs text-center mb-3" style={{ color: '#ff4b4b' }}>{message}</p>}

        {owned.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <BackpackIcon size={40} color="#c8d0e0"/>
            <p className="font-game font-black text-base" style={{ color: '#1a2b4a' }}>Your bag is empty</p>
            <p className="font-game text-xs" style={{ color: '#7a8ba8' }}>Earn BP from workouts and battles, then pick up some gear.</p>
            <button onClick={onOpenShop}
              className="mt-2 px-4 py-2.5 rounded-2xl font-game font-black text-sm text-white transition-transform active:scale-95"
              style={{ background: '#ab733d', border: '2px solid #5e3a18', boxShadow: '0 3px 0 #5e3a18' }}>
              Visit the Shop →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {SLOTS.map(({ slot, label, note }) => {
              const items = owned.filter(c => c.slot === slot)
              if (!items.length) return null
              return (
                <section key={slot} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-game font-black text-sm" style={{ color: '#1a2b4a' }}>{label}</h3>
                    {note && items.length > 1 && <span className="font-game text-[11px]" style={{ color: '#7a8ba8' }}>{note}</span>}
                  </div>
                  {items.map(item => (
                    <ItemRow key={item.id} item={item} worn={isWorn(item)} busy={busyId === item.id} onTap={() => void tapItem(item)}/>
                  ))}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
