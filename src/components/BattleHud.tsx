import { useEffect, useState } from 'react'
import type { DuelEvent, DuelView, Loadout } from '../game/types'

// The HP duel on screen: live bars during a battle, event toasts, and the breakdown on the result / replay screens.
// Rules live on the server (battle-effects.mjs); these only draw what it sends.

const ITEM_CHIPS: [keyof Loadout, string, string][] = [
  ['shield', '🛡', 'Shield: blocks 30% of incoming damage'],
  ['gauntlet', '🥊', 'Iron gauntlet: 1.5× damage'],
  ['hat', '🎩', "Warlock hat: the foe's red reps can backfire"],
  ['wand', '🪄', 'Magic wand: 5 perfect reps in a row = +50 BP'],
]

const fmt = (v: number) => String(Math.round(v * 10) / 10)
const hpColor = (frac: number) => (frac > 0.5 ? '#58cc02' : frac > 0.25 ? '#f59e0b' : '#ff4b4b')

function ItemChips({ loadout, streak, surge }: { loadout?: Loadout; streak: number; surge: boolean }) {
  if (!loadout) return null
  return (
    <>
      {ITEM_CHIPS.filter(([k]) => loadout[k]).map(([k, emoji, title]) => (
        <span key={k} title={title} className="flex-shrink-0 px-1 rounded-md text-[11px] leading-4" style={{ background: '#ffffff', border: '1px solid #e2e8f2' }}>
          {emoji}
          {k === 'wand' && <span className="font-game font-black text-[9px] ml-0.5" style={{ color: '#c026d3' }}>{surge ? '✨' : `${Math.min(streak, 5)}/5`}</span>}
        </span>
      ))}
    </>
  )
}

function HpBar({ label, hp, hpMax, dealt, loadout, streak, surge }: {
  label: string
  hp: number
  hpMax: number
  dealt: number
  loadout?: Loadout
  streak: number
  surge: boolean
}) {
  const frac = hpMax ? Math.max(0, Math.min(1, hp / hpMax)) : 0
  const ko = hp <= 0
  return (
    <div>
      <div className="flex items-center justify-between gap-2 font-game font-bold text-xs">
        <span className="flex items-center gap-1 min-w-0">
          <span className="truncate" style={{ color: '#1a2b4a' }}>{label}</span>
          <ItemChips loadout={loadout} streak={streak} surge={surge}/>
        </span>
        <span className="flex-shrink-0" style={{ color: ko ? '#ff4b4b' : '#7a8ba8' }}>
          ⚔ {fmt(dealt)} · {ko ? 'K.O.' : `${Math.ceil(hp)}/${hpMax} HP`}
        </span>
      </div>
      <div className="relative w-full rounded-full overflow-hidden mt-1" style={{ height: 10, background: '#e8edf5', border: '1.5px solid #c8d0e0' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${frac * 100}%`, background: hpColor(frac), transition: 'width 0.35s ease, background-color 0.35s' }}
        />
      </div>
    </div>
  )
}

/** Live HP bars for both fighters. Before the first rep lands, both are full. */
export function HpDuel({ duel, hpMax, mine, theirs, opponentName }: {
  duel: DuelView | null
  hpMax: number
  mine?: Loadout
  theirs?: Loadout
  opponentName: string
}) {
  const you = duel?.you, opp = duel?.opponent
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      <HpBar label="You" hp={you?.hp ?? hpMax} hpMax={hpMax} dealt={you?.dealt ?? 0} loadout={you?.loadout ?? mine}
        streak={you?.streak ?? 0} surge={you?.surge ?? false}/>
      <HpBar label={opponentName} hp={opp?.hp ?? hpMax} hpMax={hpMax} dealt={opp?.dealt ?? 0} loadout={opp?.loadout ?? theirs}
        streak={opp?.streak ?? 0} surge={opp?.surge ?? false}/>
    </div>
  )
}

/** A curse or wand surge just happened. Mount with a fresh key per event; it fades itself out. */
export function DuelToast({ event, opponentName }: { event: DuelEvent; opponentName: string }) {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2200)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  const text =
    event.kind === 'curse'
      ? event.by === 'you' ? `🎩 Cursed! ${opponentName}'s rep backfired −1` : `🎩 ${opponentName}'s hat cursed your rep −1`
      : event.who === 'you' ? '🪄 Wand surge charged! +50 BP' : `🪄 ${opponentName} charged a wand surge`
  return (
    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10" style={{ top: 56 }}>
      <div className="anim-slam px-3 py-1.5 rounded-xl font-game font-black text-sm whitespace-nowrap"
        style={{ background: '#f7f0ff', border: '2px solid #c4a5f5', color: '#7c3aed' }}>
        {text}
      </div>
    </div>
  )
}

/** How the duel was won: final HP and what each item did. */
export function BattleBreakdown({ battle, opponentName }: { battle: DuelView; opponentName: string }) {
  const { you, opponent: opp, hpMax } = battle
  const rows: [string, string, string][] = [['⚔ Damage dealt', `${fmt(you.dealt)} vs ${fmt(opp.dealt)}`, '#1a2b4a']]
  if (you.loadout.shield) rows.push(['🛡 Your shield blocked', fmt(you.absorbed), '#4a90e2'])
  if (opp.loadout.shield) rows.push([`🛡 ${opponentName}'s shield blocked`, fmt(opp.absorbed), '#7a8ba8'])
  if (you.loadout.gauntlet) rows.push(['🥊 Gauntlet bonus damage', `+${fmt(you.gauntletBonus)}`, '#6366f1'])
  if (opp.loadout.gauntlet) rows.push([`🥊 ${opponentName}'s gauntlet bonus`, `+${fmt(opp.gauntletBonus)}`, '#7a8ba8'])
  if (you.loadout.hat) rows.push(['🎩 Reps you cursed', String(you.cursesCast), '#9333ea'])
  if (opp.loadout.hat) rows.push([`🎩 Your reps ${opponentName} cursed`, String(you.cursesSuffered), '#7a8ba8'])
  if (you.loadout.wand) rows.push(['🪄 Wand surge', you.surge ? '+50 BP' : `best streak ${you.bestStreak}/5`, you.surge ? '#c026d3' : '#7a8ba8'])
  if (opp.loadout.wand && opp.surge) rows.push([`🪄 ${opponentName}'s wand surge`, '+50 BP', '#7a8ba8'])
  const noGear = !Object.values(you.loadout).some(Boolean) && !Object.values(opp.loadout).some(Boolean)

  return (
    <div className="rounded-2xl p-4" style={{ background: '#faf7ff', border: '2.5px solid #dfc8ff' }}>
      <div className="font-game font-bold text-sm mb-3 text-center" style={{ color: '#7a8ba8' }}>HP DUEL</div>
      <div className="flex flex-col gap-2 mb-3">
        <HpBar label="You" hp={you.hp} hpMax={hpMax} dealt={you.dealt} loadout={you.loadout} streak={you.bestStreak} surge={you.surge}/>
        <HpBar label={opponentName} hp={opp.hp} hpMax={hpMax} dealt={opp.dealt} loadout={opp.loadout} streak={opp.bestStreak} surge={opp.surge}/>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(([label, value, color]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="font-game text-sm truncate" style={{ color: '#7a8ba8' }}>{label}</span>
            <span className="font-game font-black text-sm flex-shrink-0" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
      {noGear && (
        <p className="text-[11px] font-game text-center mt-2" style={{ color: '#9aaac4' }}>
          No battle gear this time. Items from the shop change the fight.
        </p>
      )}
    </div>
  )
}
