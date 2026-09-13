// The shop's entrance on the Profile screen: a wooden plank with SHOP carved into it, hanging from two ropes.

export default function ShopSign({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open the item shop"
      className="w-full max-w-[340px] transition-transform active:scale-95"
      style={{ filter: 'drop-shadow(0 8px 14px rgba(90,58,26,0.28))' }}
    >
      <svg viewBox="0 0 320 104" width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="shop-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c98f53"/>
            <stop offset="0.55" stopColor="#ab733d"/>
            <stop offset="1" stopColor="#8a5a2b"/>
          </linearGradient>
          <linearGradient id="shop-rope" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8c6a3e"/>
            <stop offset="0.5" stopColor="#c9a46a"/>
            <stop offset="1" stopColor="#8c6a3e"/>
          </linearGradient>
          <clipPath id="shop-plank"><rect x="8" y="22" width="304" height="74" rx="14"/></clipPath>
        </defs>

        {/* Ropes */}
        <path d="M58 0 V30 M262 0 V30" stroke="url(#shop-rope)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M56 6 l4 4 M56 14 l4 4 M260 6 l4 4 M260 14 l4 4" stroke="#6e4f28" strokeWidth="1.2" opacity="0.6"/>

        {/* Plank */}
        <rect x="8" y="22" width="304" height="74" rx="14" fill="url(#shop-wood)" stroke="#5e3a18" strokeWidth="3"/>
        <g clipPath="url(#shop-plank)">
          {/* Grain */}
          <g fill="none" stroke="#6b4220" strokeLinecap="round" opacity="0.35">
            <path d="M8 36 C 70 30, 120 42, 180 34 S 280 30, 312 38" strokeWidth="1.6"/>
            <path d="M8 52 C 60 48, 110 58, 170 52 S 270 46, 312 54" strokeWidth="1.2"/>
            <path d="M8 70 C 80 64, 130 76, 200 70 S 290 66, 312 72" strokeWidth="1.6"/>
            <path d="M8 84 C 50 80, 120 90, 190 84 S 280 82, 312 86" strokeWidth="1.1"/>
            <ellipse cx="236" cy="62" rx="10" ry="4" strokeWidth="1.4"/>
            <ellipse cx="236" cy="62" rx="4.5" ry="1.6" strokeWidth="1.1"/>
          </g>
          {/* Bevel: light top edge, dark bottom edge */}
          <rect x="8" y="22" width="304" height="7" fill="#ffffff" opacity="0.18"/>
          <rect x="8" y="86" width="304" height="10" fill="#000000" opacity="0.14"/>
        </g>

        {/* Nails */}
        {[58, 262].map(x => (
          <g key={x}>
            <circle cx={x} cy="34" r="5" fill="#d9c7a3" stroke="#4e3216" strokeWidth="1.5"/>
            <circle cx={x - 1.4} cy="32.6" r="1.5" fill="#ffffff" opacity="0.7"/>
          </g>
        ))}

        {/* Carved lettering: a light lip under dark, recessed letters */}
        <g fontFamily="'Nunito Variable', 'Nunito', sans-serif" fontWeight="900" fontSize="42" letterSpacing="8" textAnchor="middle">
          <text x="164" y="77" fill="#f2d3a3" opacity="0.55">SHOP</text>
          <text x="164" y="75" fill="#4a2a0e">SHOP</text>
          <text x="164" y="74" fill="#2e1905" opacity="0.35">SHOP</text>
        </g>
      </svg>
    </button>
  )
}
