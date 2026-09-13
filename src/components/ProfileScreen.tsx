import { useState } from 'react'
import svgPaths from '../imports/GameAppDesignOverview/svg-8d6d6pxw63'
import AvatarEditor from './AvatarEditor'
import CharacterSprite from './CharacterSprite'
import Inventory from './Inventory'
import ShopScreen from './ShopScreen'
import ShopSign from './ShopSign'
import { ShieldIcon } from './UnverifiedTag'
import UsernamePicker from './UsernamePicker'
import VerifyModal from './VerifyModal'
import type { Player } from '../App'
import { ACCENT, ACCENT_BG } from '../App'
import { canSignOut, signOut } from '../live/credential'
import { useProfile } from '../live/ProfileProvider'
import { useGlobalLeaderboard } from '../live/useLeaderboard'

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

// ─── "You're unverified" warning, top of the profile ──────────────
function UnverifiedBanner({ onVerify }: { onVerify: () => void }) {
  return (
    <div className="mx-4 mb-4 flex items-center gap-3 px-3 py-2.5 rounded-2xl anim-fade-up"
      style={{ background: '#fffbeb', border: '2px solid #fde68a', boxShadow: '0 4px 14px rgba(245,158,11,0.12)' }}>
      <ShieldIcon size={26}/>
      <div className="flex-1 min-w-0">
        <p className="font-game font-black text-[13px] leading-tight" style={{ color: '#b45309' }}>You're Unverified</p>
        <p className="font-game text-[11px] leading-snug" style={{ color: '#b45309cc' }}>
          You won't rank on the global leaderboard, and other players see an Unverified tag.
        </p>
      </div>
      <button
        onClick={onVerify}
        className="px-3 py-2 rounded-xl font-game font-black text-xs text-white flex-shrink-0 transition-transform active:scale-95"
        style={{ background: '#f59e0b', boxShadow: '0 3px 10px rgba(245,158,11,0.4)' }}
      >
        Verify →
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────
export default function ProfileScreen({ me }: Props) {
  const { profile } = useProfile()
  const [renaming, setRenaming] = useState(false)
  const [editingLook, setEditingLook] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const { board } = useGlobalLeaderboard()
  const color   = ACCENT
  const wins    = me.wins
  const losses  = me.losses
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0
  const unverified = profile?.verified === false
  // Global rank by best set score; no sets yet (or unverified) = unranked.
  const rank    = board?.me && board.me.bestScore !== null ? board.me.rank : null

  return (
    // Overlays (shop, sheets) sit outside the scroller, so they cover the screen wherever it's scrolled to.
    <div className="absolute inset-0" style={{ background: '#ffffff' }}>
    <div className="absolute inset-0 overflow-y-auto">

      {/* ── Hero section ── */}
      <div className="relative w-full" style={{ background: ACCENT_BG, borderBottom: '2.028px solid #c8d0e0', paddingTop: 'var(--top-gap)', paddingBottom: 24 }}>

        {unverified && <UnverifiedBanner onVerify={() => setVerifying(true)}/>}

        {/* Rank line — compact, centered, just above the content */}
        <p className="text-center mb-4 whitespace-nowrap"
          style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
          {rank ? (
            <>
              <span style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900 }}>#{rank}</span>
              <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400 }}> worldwide</span>
            </>
          ) : (
            <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, color: '#7a8ba8' }}>
              {unverified ? 'Unranked · verify to rank' : board ? 'Unranked · finish a set to rank' : ' '}
            </span>
          )}
        </p>

        {/* Avatar + info row */}
        <div className="flex items-start gap-4 px-5">

          {/* Avatar box — isolation contains the scaled sprite within this stacking context */}
          {/* Tap the avatar (or its pencil) to change skin tone and shirt colour */}
          <div className="relative flex-shrink-0 rounded-[16px] overflow-visible"
            onClick={() => { if (profile) setEditingLook(true) }}
            style={{ width: 160, height: 200, background: '#fff', border: `3px solid ${color}`, boxShadow: `0 6px 12px ${color}33`, isolation: 'isolate', zIndex: 1, cursor: profile ? 'pointer' : 'default' }}>
            <div className="absolute inset-0 flex items-end justify-center overflow-visible">
              <div style={{ transform: 'scale(1.25)', transformOrigin: 'bottom center' }}>
                <CharacterSprite size="lg" animate {...me.appearance} equipped={me.equipment}/>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setEditingLook(true) }}
              disabled={!profile}
              aria-label="Edit avatar"
              className="absolute flex items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ background: color, boxShadow: `0 2px 5px ${color}66`, width: 28, height: 28, right: -14, bottom: -14, zIndex: 10 }}>
              <Pen/>
            </button>
          </div>

          {/* Name / handle / level / BP */}
          <div className="flex flex-col items-center justify-center text-center gap-2 pt-2 flex-1 min-w-0" style={{ position: 'relative', zIndex: 2 }}>
            {/* Tap the name (or its pencil) to change username */}
            <button
              onClick={() => setRenaming(true)}
              disabled={!profile}
              aria-label="Change username"
              className="flex flex-col items-center gap-2 max-w-full min-w-0 transition-transform active:scale-95"
            >
              <span className="flex items-center gap-1.5 max-w-full min-w-0">
                <span className="whitespace-nowrap truncate min-w-0" style={{ fontFamily: "'Nunito:Black',sans-serif", fontWeight: 900, fontSize: 22, lineHeight: '28px', color: '#1a2b4a' }}>
                  {me.name}
                </span>
                <span className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 24, height: 24, background: color, boxShadow: `0 2px 5px ${color}66` }}>
                  <span style={{ transform: 'scale(0.8)', lineHeight: 0 }}><Pen/></span>
                </span>
              </span>
              <span style={{ fontFamily: "'Nunito:Regular',sans-serif", fontWeight: 400, fontSize: 14, lineHeight: '15px', color: '#7a8ba8', marginTop: -4 }}>
                {me.username ? `@${me.username}` : 'No username yet'}
              </span>
            </button>
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

      {/* ── Shop (wooden button, a fixed 16px under the hero's divider), then your inventory ── */}
      <div className="w-full px-5 pt-4 pb-6 flex flex-col gap-5">
        <ShopSign onClick={() => setShopOpen(true)}/>
        <Inventory onOpenShop={() => setShopOpen(true)}/>
      </div>

      {canSignOut() && (
        <div className="flex justify-center pb-2">
          <button onClick={signOut} className="font-game font-bold text-sm px-4 py-2 rounded-2xl active:scale-95"
            style={{ color: '#7a8ba8', background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
            Sign out
          </button>
        </div>
      )}

      <div style={{ height: 80 }}/>
    </div>
      {shopOpen && <ShopScreen onClose={() => setShopOpen(false)}/>}
      {renaming && <UsernamePicker mode="rename" onClose={() => setRenaming(false)}/>}
      {editingLook && <AvatarEditor onClose={() => setEditingLook(false)}/>}
      {verifying && <VerifyModal onClose={() => setVerifying(false)}/>}
    </div>
  )
}
