// The shop's entrance on the Profile screen: a wooden plank button with SHOP carved into it and a chevron to tap.
// The plank (gradient, outline, bevel) is CSS so its corners don't stretch; the grain is an SVG that may.

const CARVED = '0 1.5px 0 rgba(242,211,163,0.55), 0 -1px 0 rgba(46,25,5,0.35)'

export default function ShopSign({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Open the item shop" className="wood-btn relative w-full h-16 overflow-hidden">
      {/* Grain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 64" preserveAspectRatio="none">
        <g fill="none" stroke="#6b4220" strokeLinecap="round" opacity="0.35">
          <path d="M0 14 C 70 8, 120 20, 180 12 S 280 8, 320 16" strokeWidth="1.4"/>
          <path d="M0 30 C 60 26, 110 36, 170 30 S 270 24, 320 32" strokeWidth="1.1"/>
          <path d="M0 46 C 80 40, 130 52, 200 46 S 290 42, 320 48" strokeWidth="1.4"/>
          <ellipse cx="226" cy="31" rx="10" ry="3.5" strokeWidth="1.2"/>
          <ellipse cx="226" cy="31" rx="4.5" ry="1.4" strokeWidth="1"/>
        </g>
      </svg>

      <span className="relative flex items-center h-full pl-5 pr-3 gap-3">
        {/* Carved shopping bag */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1.5px 0 rgba(242,211,163,0.55))' }}>
          <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z" fill="#4a2a0e"/>
          <path d="M9 10V7a3 3 0 0 1 6 0v3" stroke="#4a2a0e" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
        <span className="flex-1 text-left font-game font-black text-[28px] leading-none"
          style={{ color: '#4a2a0e', letterSpacing: '0.18em', textShadow: CARVED }}>
          SHOP
        </span>
        {/* Recessed chevron: tap me */}
        <span className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 38, height: 38, background: 'rgba(60,34,12,0.28)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.18)' }}>
          <svg className="anim-nudge-x" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="#fbe6c4" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </span>
    </button>
  )
}
