import { useEffect, useState } from 'react'
import { ACCENT } from '../theme'
import { COSMETICS, cosmeticUrl, type Cosmetic } from '../config/cosmetics'
import { api, ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'

// ─── Shop items (src/config/cosmetics.ts) ─────────────────────────
type CardState = 'equipped' | 'owned' | 'buy' | 'poor' | 'offline'

export const SHOP_ERRORS: Record<string, string> = {
  'insufficient-bp': "You don't have enough BP for that yet.",
  owned: 'You already own that item.',
  'not-owned': "You don't own that item.",
  offline: "Can't reach the server. Try again.",
  'no-db': "The server isn't storing accounts right now.",
}

const CARD_TILTS = ['rotate(-4deg)', 'rotate(4deg)', 'rotate(3deg)', 'rotate(-3deg)']

function ShopItemCard({ item, index, cost, state, busy, onTap }: {
  item: Cosmetic
  index: number
  cost: number
  state: CardState
  busy: boolean
  onTap: () => void
}) {
  const tilt = CARD_TILTS[index % CARD_TILTS.length]
  const button = {
    equipped: { label: '✓ Equipped', bg: '#58cc02', fg: '#fff', border: '#58cc02' },
    owned:    { label: 'Equip',      bg: ACCENT,    fg: '#fff', border: ACCENT },
    buy:      { label: `◆ ${cost} BP · Buy`, bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
    poor:     { label: `◆ ${cost} BP`, bg: 'rgba(255,255,255,0.6)', fg: '#7a8ba8', border: '#c8d0e0' },
    offline:  { label: `◆ ${cost} BP`, bg: 'rgba(255,255,255,0.6)', fg: '#7a8ba8', border: '#c8d0e0' },
  }[state]
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[20px]"
      style={{ background: item.tint, border: `2.028px solid ${item.glowColor}44`, boxShadow: `0 6px 20px ${item.glowColor}22`, minHeight: 210 }}>
      {/* Icon — large, tilted */}
      <div className="flex items-center justify-center w-full" style={{ height: 90, overflow: 'visible' }}>
        <img
          src={cosmeticUrl(item)}
          alt={item.name}
          style={{ maxHeight: 86, maxWidth: '100%', objectFit: 'contain', transform: tilt, filter: `drop-shadow(0 4px 10px ${item.glowColor}66)` }}
        />
      </div>
      <p style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 13, lineHeight: '16px', color: '#1a2b4a' }}>{item.name}</p>
      <p style={{ fontFamily: "'Nunito:Bold',sans-serif", fontWeight: 700, fontSize: 10.5, lineHeight: '14px', color: item.glowColor }}>⚔ {item.effect}</p>
      <p style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 10, lineHeight: '14px', color: '#4a6080', flexGrow: 1 }}>{item.description}</p>
      <button
        onClick={onTap}
        disabled={busy || state === 'poor' || state === 'offline'}
        className="flex items-center justify-center py-2 rounded-[12px] w-full transition-transform active:scale-95"
        style={{ background: button.bg, border: `1.5px solid ${button.border}`, opacity: busy ? 0.6 : 1 }}
      >
        <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 13, color: button.fg }}>
          {busy ? '…' : button.label}
        </span>
      </button>
    </div>
  )
}

/** The item shop, opened from the wooden button on the Profile screen (a full-screen page over it). */
export default function ShopScreen({ onClose, onOpenInventory }: { onClose: () => void; onOpenInventory?: () => void }) {
  const { profile, buy, equip } = useProfile()
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // The server owns prices; the config's are a fallback until it answers.
  useEffect(() => {
    api<{ id: string; cost: number }[]>('GET', '/api/shop')
      .then(list => setPrices(Object.fromEntries(list.map(i => [i.id, i.cost]))), () => {})
  }, [])

  const costOf = (c: Cosmetic) => prices[c.id] ?? c.cost
  const stateOf = (c: Cosmetic): CardState =>
    !profile ? 'offline'
    : profile.equipped[c.slot] === c.id ? 'equipped'
    : profile.owned.includes(c.id) ? 'owned'
    : profile.bp >= costOf(c) ? 'buy'
    : 'poor'

  // Buy, equip, or (tapping an equipped item) take it off.
  const tapItem = async (c: Cosmetic) => {
    const state = stateOf(c)
    if (busyId || state === 'poor' || state === 'offline') return
    if (state === 'buy' && !window.confirm(`Buy ${c.name} for ${costOf(c)} BP?`)) return
    setBusyId(c.id)
    setMessage(null)
    try {
      if (state === 'buy') await buy(c.id)
      else await equip(c.slot, state === 'equipped' ? null : c.id)
    } catch (e) {
      setMessage(SHOP_ERRORS[e instanceof ApiError ? e.code : ''] ?? 'Something went wrong. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto anim-slide-in-right" style={{ background: '#ffffff' }}>
      <div className="sticky top-0 z-10 px-4 pt-(--top-gap) pb-3 flex items-center gap-3"
        style={{ background: 'linear-gradient(180deg, #fff6e8, #ffffff)', borderBottom: '2px solid #f0e2c8' }}>
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
          <h2 className="font-game font-black text-xl leading-tight" style={{ color: '#1a2b4a' }}>Item Shop</h2>
          <p className="text-[11px] font-game leading-tight" style={{ color: '#7a8ba8' }}>Earn BP from workouts and battles. Everyone sees what you wear.</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-2xl" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
            <span style={{ color: '#f59e0b', fontSize: 14 }}>◆</span>
            <span className="font-game font-black text-sm" style={{ color: '#b45309' }}>{profile?.bp ?? '—'}</span>
          </div>
          {onOpenInventory && (
            <button onClick={onOpenInventory} className="font-game font-black text-[11px] active:scale-95" style={{ color: ACCENT }}>
              Inventory →
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4" style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
        {message && (
          <p className="font-game font-bold text-xs text-center mb-3" style={{ color: '#ff4b4b' }}>{message}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {COSMETICS.map((item, i) => (
            <ShopItemCard
              key={item.id}
              item={item}
              index={i}
              cost={costOf(item)}
              state={stateOf(item)}
              busy={busyId === item.id}
              onTap={() => void tapItem(item)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
