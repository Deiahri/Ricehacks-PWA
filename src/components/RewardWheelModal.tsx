import { useState } from 'react'
import { ACCENT, ACCENT_BG } from '../App'
import { cosmetic, cosmeticUrl } from '../config/cosmetics'
import { WHEEL, wedgeArc } from '../game/xp'
import { ApiError } from '../live/api'
import { useProfile, type WheelReward } from '../live/ProfileProvider'

const SIZE = 240
const R = SIZE / 2
const TURNS = 5 // full spins before settling on the wedge

/** SVG path of the wedge from `a0` to `a1` degrees, clockwise from the top. */
function wedgePath(a0: number, a1: number) {
  const pt = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${R + R * Math.cos(rad)} ${R + R * Math.sin(rad)}`
  }
  return `M ${R} ${R} L ${pt(a0)} A ${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1)} Z`
}

function rewardText(r: WheelReward) {
  if (r.kind === 'saver') return { title: `${r.days}-day streak saver 🛟`, text: `Miss a week's goal and it stays open ${r.days} more ${r.days === 1 ? 'day' : 'days'}.` }
  if (r.kind === 'bp') return { title: `+${r.bp} BP ◆`, text: 'Spend it in the shop.' }
  const c = cosmetic(r.itemId)
  return { title: `You won the ${c?.name ?? 'shop item'}! 🎁`, text: c ? `It's already equipped. ${c.effect}` : 'Check your inventory.' }
}

/**
 * The spin owed for a met week: the server picks and pays the reward (POST /api/reward/spin), then the wheel turns
 * to it. `level` is the level just reached.
 */
export default function RewardWheelModal({ level, onClose, onLater }: { level: number; onClose: () => void; onLater: () => void }) {
  const { spinWheel } = useProfile()
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'won'>('idle')
  const [reward, setReward] = useState<WheelReward | null>(null)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const spin = async () => {
    if (phase !== 'idle') return
    setPhase('spinning')
    setError(null)
    try {
      const r = await spinWheel()
      setReward(r)
      // Bring the wedge's centre under the pointer at the top, after a few full turns.
      const [a0, a1] = wedgeArc(r.id)
      setRotation(TURNS * 360 + (360 - (a0 + a1) / 2))
    } catch (e) {
      const code = e instanceof ApiError ? e.code : ''
      setError(code === 'no-reward' ? 'This spin was already used.' : code === 'offline' ? "Can't reach the server." : 'Something went wrong. Try again.')
      setPhase('idle')
    }
  }

  const won = reward && phase === 'won' ? rewardText(reward) : null
  const item = reward?.kind === 'item' ? cosmetic(reward.itemId) : undefined

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        role="dialog"
        aria-label="Level up reward"
        className="anim-pop-in w-full max-w-[340px] rounded-3xl overflow-hidden"
        style={{ background: '#ffffff', border: '2.5px solid #c8d0e0', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div className="px-5 pt-5 pb-3 text-center" style={{ background: '#fff8ec' }}>
          <div className="font-game font-black text-[11px]" style={{ color: '#ff9600', letterSpacing: '0.12em' }}>⭐ WEEKLY GOAL REACHED</div>
          <div className="font-game font-black text-2xl leading-tight" style={{ color: '#1a2b4a' }}>Level {level}!</div>
          <div className="text-xs font-game mt-0.5" style={{ color: '#7a8ba8' }}>Spin the wheel for your reward</div>
        </div>

        <div className="relative mx-auto my-4" style={{ width: SIZE, height: SIZE }}>
          {/* Pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -6 }}>
            <svg width="26" height="30" viewBox="0 0 26 30"><path d="M13 30 L1 4 Q13 -4 25 4 Z" fill="#1a2b4a" stroke="#ffffff" strokeWidth="2.5"/></svg>
          </div>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: rotation ? 'transform 3.4s cubic-bezier(.17,.67,.12,1)' : undefined,
              borderRadius: '50%',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              border: '4px solid #ffffff',
              background: '#fff',
            }}
            onTransitionEnd={() => setPhase(p => (p === 'spinning' ? 'won' : p))}
          >
            {WHEEL.map(w => {
              const [a0, a1] = wedgeArc(w.id)
              const mid = ((a0 + a1) / 2 - 90) * (Math.PI / 180)
              const lx = R + R * 0.66 * Math.cos(mid)
              const ly = R + R * 0.66 * Math.sin(mid)
              return (
                <g key={w.id}>
                  <path d={wedgePath(a0, a1)} fill={w.color} stroke="#ffffff" strokeWidth="2"/>
                  <text
                    x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${(a0 + a1) / 2} ${lx} ${ly})`}
                    style={{ fontFamily: 'Nunito Variable, sans-serif', fontWeight: 900, fontSize: a1 - a0 < 20 ? 10 : 13, fill: '#ffffff' }}
                  >
                    {w.short}
                  </text>
                </g>
              )
            })}
            <circle cx={R} cy={R} r={22} fill="#ffffff" stroke="#c8d0e0" strokeWidth="3"/>
            <text x={R} y={R + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 18 }}>⭐</text>
          </svg>
        </div>

        <div className="px-5 pb-5 text-center">
          {won ? (
            <div className="anim-pop-in">
              {item && (
                <img src={cosmeticUrl(item)} alt="" className="mx-auto mb-1" style={{ width: 64, height: 64, objectFit: 'contain' }}/>
              )}
              <div className="font-game font-black text-xl" style={{ color: '#1a2b4a' }}>{won.title}</div>
              <div className="text-xs font-game mt-1 mb-3" style={{ color: '#7a8ba8' }}>{won.text}</div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl font-game font-black text-base text-white active:scale-95"
                style={{ background: 'linear-gradient(135deg,#58cc02,#3d9100)', boxShadow: '0 6px 20px rgba(88,204,2,0.4)' }}
              >
                Claim
              </button>
            </div>
          ) : (
            <>
              {error && <p className="text-xs font-game font-bold mb-2" style={{ color: '#ff4b4b' }}>{error}</p>}
              <button
                onClick={() => void spin()}
                disabled={phase !== 'idle'}
                className="w-full py-3 rounded-2xl font-game font-black text-base text-white active:scale-95 disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, boxShadow: `0 6px 20px ${ACCENT}55` }}
              >
                {phase === 'spinning' ? 'Spinning…' : 'SPIN 🎡'}
              </button>
              <button
                onClick={onLater}
                disabled={phase !== 'idle'}
                className="mt-2 px-3 py-1.5 rounded-full font-game font-bold text-xs disabled:opacity-50"
                style={{ background: ACCENT_BG, color: '#7a8ba8' }}
              >
                Later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
