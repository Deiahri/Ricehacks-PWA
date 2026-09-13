import { ACCENT, ACCENT_BG } from '../theme'
import { cosmetic, cosmeticUrl, type Cosmetic, type Equipped } from '../config/cosmetics'

/** A backpack, for the Inventory entrance and screen. */
export function BackpackIcon({ size = 22, color = ACCENT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 5V4a3 3 0 0 1 6 0v1" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <rect x="4.5" y="5" width="15" height="16" rx="4" stroke={color} strokeWidth="2.2"/>
      <path d="M8 13h8v4H8z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M4.5 11h15" stroke={color} strokeWidth="2"/>
    </svg>
  )
}

/** The Inventory entrance on the Profile screen, under the wooden Shop button: what you own at a glance. */
export default function InventoryButton({ owned, equipped, onClick }: {
  owned: string[]
  equipped: Equipped
  onClick: () => void
}) {
  const items = owned.map(cosmetic).filter((c): c is Cosmetic => c !== undefined)
  const worn = items.filter(c => equipped[c.slot] === c.id).length
  return (
    <button
      onClick={onClick}
      aria-label="Open your inventory"
      className="w-full h-16 flex items-center gap-3 pl-3 pr-3 rounded-2xl text-left transition-transform active:scale-[0.97]"
      style={{ background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 4px 12px rgba(26,43,74,0.06)' }}
    >
      <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: ACCENT_BG }}>
        <BackpackIcon/>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-game font-black text-base leading-tight" style={{ color: '#1a2b4a' }}>Inventory</span>
        <span className="block font-game text-xs leading-tight truncate" style={{ color: '#7a8ba8' }}>
          {items.length ? `${items.length} item${items.length === 1 ? '' : 's'} · ${worn} equipped` : 'Empty · buy gear in the Shop'}
        </span>
      </span>
      {/* Up to three of your items; a green ring = wearing it */}
      <span className="flex items-center -space-x-2 flex-shrink-0">
        {items.slice(0, 3).map(c => (
          <span key={c.id} className="flex items-center justify-center rounded-full"
            style={{ width: 30, height: 30, background: c.tint, border: `2px solid ${equipped[c.slot] === c.id ? '#58cc02' : '#ffffff'}` }}>
            <img src={cosmeticUrl(c)} alt="" style={{ maxWidth: 20, maxHeight: 20, objectFit: 'contain' }}/>
          </span>
        ))}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M9 5l7 7-7 7" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}
