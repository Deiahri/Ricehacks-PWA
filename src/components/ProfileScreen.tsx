import { useEffect, useState } from 'react'
import svgPaths from '../imports/GameAppDesignOverview/svg-8d6d6pxw63'
import CharacterSprite from './CharacterSprite'
import UsernamePicker from './UsernamePicker'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import { COSMETICS, cosmeticUrl, type Cosmetic } from '../config/cosmetics'
import { api, ApiError } from '../live/api'
import { useProfile } from '../live/ProfileProvider'

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

// ─── Shop items (src/config/cosmetics.ts) ─────────────────────────
type CardState = 'equipped' | 'owned' | 'buy' | 'poor' | 'offline'

const SHOP_ERRORS: Record<string, string> = {
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

// ─── Main ─────────────────────────────────────────────────────────
export default function ProfileScreen({ me }: Props) {
  const { profile, buy, equip } = useProfile()
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const color   = ACCENT
  const wins    = me.wins
  const losses  = me.losses
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0
  const rank    = 9

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
                <CharacterSprite size="lg" animate {...me.appearance} equipped={me.equipment}/>
              </div>
            </div>
            {/* Edit button: change username */}
            <button
              onClick={() => setRenaming(true)}
              disabled={!profile}
              aria-label="Change username"
              className="absolute flex items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ background: color, boxShadow: `0 2px 5px ${color}66`, width: 28, height: 28, right: -14, bottom: -14, zIndex: 10 }}>
              <Pen/>
            </button>
          </div>

          {/* Name / handle / level / BP */}
          <div className="flex flex-col items-center justify-center text-center gap-2 pt-2 flex-1 min-w-0" style={{ position: 'relative', zIndex: 2 }}>
            <p className="whitespace-nowrap truncate max-w-full" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
              {me.name}
            </p>
            <p style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '15px', color: '#7a8ba8', marginTop: -4 }}>
              {me.username ? `@${me.username}` : 'No username yet'}
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
        <div className="flex flex-col items-center mb-3">
          <p style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 20, lineHeight: '28px', color: '#1a2b4a', textAlign: 'center' }}>Item Shop</p>
          <p className="font-game text-xs text-center" style={{ color: '#7a8ba8' }}>
            Earn BP from workouts and battles. Everyone sees what you wear.
          </p>
        </div>
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

      <div style={{ height: 80 }}/>
      {renaming && <UsernamePicker mode="rename" onClose={() => setRenaming(false)}/>}
    </div>
  )
}
