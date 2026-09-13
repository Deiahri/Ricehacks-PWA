import svgPaths from '../imports/GameAppDesignOverview/svg-8d6d6pxw63'
import CharacterSprite from './CharacterSprite'
import shieldPng from '../imports/Low_Tier_shield-1.png'
import wandPng from '../imports/magic_wand-1.png'
import gauntletPng from '../imports/Gauntlet-1.png'
import hatPng from '../imports/warlock_hat-1.png'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'

interface Props { me: Player }

// ─── Pen icon ────────────────────────────────────────────────────
function Pen() {
  return (
    <div className="overflow-clip relative size-[17px]">
      <div className="absolute inset-[7.49%_7.62%_4.37%_4.17%]">
        <div className="absolute inset-[0_0_1.13%_1.13%]">
          <svg className="block size-full" fill="none" height="14.8127" preserveAspectRatio="none" viewBox="0 0 14.8271 14.8127" width="14.8271">
            <path clipRule="evenodd" d={svgPaths.pf6ff5c0} fill="white" fillRule="evenodd" />
            <path d={svgPaths.p6233c00} fill="white" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── Shop items ───────────────────────────────────────────────────
interface ShopItem { id: number; name: string; cost: number; img: string; owned: boolean; description: string; tint: string; glowColor: string }

const SHOP_ITEMS: ShopItem[] = [
  { id: 1, name: 'Low Tier Shield', cost: 150, img: shieldPng,   owned: false,
    description: 'Absorbs up to 30% of incoming BP damage when an opponent attacks you in battle.',
    tint: 'linear-gradient(145deg, #dff4ff 0%, #b8e0f7 100%)', glowColor: '#4a90e2' },
  { id: 2, name: 'Magic Wand',      cost: 300, img: wandPng,     owned: false,
    description: 'Land 5 perfect reps in a row to trigger a +50 BP surge that lasts the entire round.',
    tint: 'linear-gradient(145deg, #fff0fb 0%, #f7c8f0 100%)', glowColor: '#c026d3' },
  { id: 3, name: 'Iron Gauntlet',   cost: 350, img: gauntletPng, owned: false,
    description: 'Applies a 1.5× multiplier to your active BP while you are in a live battle.',
    tint: 'linear-gradient(145deg, #f0f4ff 0%, #c8d4f7 100%)', glowColor: '#6366f1' },
  { id: 4, name: 'Warlock Hat',     cost: 400, img: hatPng,      owned: false,
    description: "Curses your foe — every missed rep they make costs double BP for the next round.",
    tint: 'linear-gradient(145deg, #f7f0ff 0%, #dfc8ff 100%)', glowColor: '#9333ea' },
]

const CARD_TILTS = ['rotate(-4deg)', 'rotate(4deg)', 'rotate(3deg)', 'rotate(-3deg)']

function ShopItemCard({ item, canAfford }: { item: ShopItem; canAfford: boolean }) {
  const tilt = CARD_TILTS[(item.id - 1) % CARD_TILTS.length]
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[20px]"
      style={{ background: item.tint, border: `2.028px solid ${item.glowColor}44`, boxShadow: `0 6px 20px ${item.glowColor}22`, minHeight: 210 }}>
      {/* Icon — large, tilted PNG */}
      <div className="flex items-center justify-center w-full" style={{ height: 90, overflow: 'visible' }}>
        <img
          src={item.img}
          alt={item.name}
          style={{ maxHeight: 86, maxWidth: '100%', objectFit: 'contain', transform: tilt, filter: `drop-shadow(0 4px 10px ${item.glowColor}66)` }}
        />
      </div>
      {/* Name */}
      <p style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 13, lineHeight: '16px', color: '#1a2b4a' }}>{item.name}</p>
      {/* Description */}
      <p style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 10, lineHeight: '14px', color: '#4a6080', flexGrow: 1 }}>{item.description}</p>
      {/* Price badge */}
      <div className="flex items-center justify-center gap-1 py-2 rounded-[12px] w-full"
        style={{ background: canAfford ? '#fffbeb' : 'rgba(255,255,255,0.6)', border: `1.5px solid ${canAfford ? '#fde68a' : '#c8d0e0'}` }}>
        <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 13, color: canAfford ? '#b45309' : '#7a8ba8' }}>◆</span>
        <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 13, color: canAfford ? '#b45309' : '#7a8ba8' }}>{item.cost} BP</span>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────
export default function ProfileScreen({ me }: Props) {
  const color   = ACCENT
  const wins    = me.wins
  const losses  = me.losses
  const winRate = Math.round((wins / (wins + losses)) * 100)
  const rank    = 9

  return (
    <div className="absolute inset-0 overflow-y-auto" style={{ background: '#ffffff' }}>

      {/* ── Hero section ── */}
      <div className="relative w-full" style={{ background: ACCENT_BG, borderBottom: '2.028px solid #c8d0e0', paddingTop: 'var(--top-gap)', paddingBottom: 24 }}>

        {/* Rank line — compact, centered, just above the content */}
        <p className="text-center mb-4 whitespace-nowrap"
          style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
          <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900 }}>#{rank}</span>
          <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400 }}> in Dallas</span>
        </p>

        {/* Avatar + info row */}
        <div className="flex items-start gap-4 px-5">

          {/* Avatar box — isolation contains the scaled sprite within this stacking context */}
          <div className="relative flex-shrink-0 rounded-[16px] overflow-visible"
            style={{ width: 160, height: 200, background: '#fff', border: `2.028px solid ${color}`, boxShadow: `0 6px 12px ${color}33`, isolation: 'isolate', zIndex: 1 }}>
            <div className="absolute inset-0 flex items-end justify-center overflow-visible">
              <div style={{ transform: 'scale(1.25)', transformOrigin: 'bottom center' }}>
                <CharacterSprite size="lg" animate {...me.appearance} {...me.equipment}/>
              </div>
            </div>
            {/* Edit button */}
            <div className="absolute flex items-center justify-center rounded-full"
              style={{ background: color, boxShadow: `0 2px 5px ${color}66`, width: 28, height: 28, right: -14, bottom: -14, zIndex: 10 }}>
              <Pen/>
            </div>
          </div>

          {/* Name / handle / level / BP */}
          <div className="flex flex-col items-center justify-center text-center gap-2 pt-2 flex-1 min-w-0" style={{ position: 'relative', zIndex: 2 }}>
            <p className="whitespace-nowrap" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
              {me.name}
            </p>
            <p style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '15px', color: '#7a8ba8', marginTop: -4 }}>
              @{me.name.replace(' ', '').toLowerCase()}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center px-3 py-1 rounded-full" style={{ background: color }}>
                <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 14, lineHeight: '20px', color: '#fff' }}>Lvl {me.level}</span>
              </div>
            </div>
            {/* BP */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-[16px] mt-1"
              style={{ background: '#fffbeb', border: '2.028px solid #fde68a' }}>
              <span style={{ fontFamily: "'Inter:Regular',sans-serif", fontWeight: 400, fontSize: 20, lineHeight: '28px', color: '#f59e0b' }}>◆</span>
              <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 18, lineHeight: '24px', color: '#b45309' }}>{me.bp}</span>
              <span style={{ fontFamily: "'Nunito:Bold',sans-serif", fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#d97706' }}>BP</span>
            </div>
          </div>
        </div>

        {/* W / L / Win-rate — centered at bottom, full width */}
        <div className="flex items-center justify-center mt-8 px-5">
          <div className="flex items-center" style={{ gap: 0 }}>
            {([
              [wins,       '#58cc02', 'WINS'],
              [losses,     '#ff4b4b', 'LOSSES'],
              [`${winRate}%`, '#4a90e2', 'WIN RATE'],
            ] as [string | number, string, string][]).map(([val, c, label], i) => (
              <div key={label} className="flex items-center">
                {i > 0 && <div style={{ width: 1, height: 47, background: '#c8d0e0', margin: '0 20px' }}/>}
                <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
                  <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 24, lineHeight: '32px', color: c }}>{val}</span>
                  <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 10, lineHeight: '15px', color: '#7a8ba8' }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Shop section ── */}
      <div className="relative w-full px-5 pt-5 pb-6">
        <div className="flex items-center justify-center mb-3">
          <p style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 20, lineHeight: '28px', color: '#1a2b4a', textAlign: 'center' }}>Item Shop</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SHOP_ITEMS.map(item => (
            <ShopItemCard key={item.id} item={item} canAfford={me.bp >= item.cost}/>
          ))}
        </div>
      </div>

      <div style={{ height: 80 }}/>
    </div>
  )
}
