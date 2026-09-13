import { useId } from 'react'
import svgPaths from '../imports/AvatarCharacterspriteBase/svg-g0jev4nvz8'
import { cosmeticUrl, wornItems, type Cosmetic, type Equipped } from '../config/cosmetics'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  flip?: boolean
  animate?: boolean
  /** Appearance overrides — players vary skin, eye and shirt */
  skin?: string
  skinOutline?: string
  eye?: string
  shirt?: string
  /** Worn cosmetics; art and placement come from src/config/cosmetics.ts */
  equipped?: Equipped
  /** Extra inline styles applied to the SVG element */
  svgStyle?: React.CSSProperties
}

// Native art canvas is 134 × 232.5 (aspect ≈ 0.576). Sizes defined by height.
const R = 133.999 / 232.5
const SIZES: Record<string, number> = { xs: 40, sm: 56, md: 112, lg: 196 }

function Item({ item }: { item: Cosmetic }) {
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2
  return (
    <image
      href={cosmeticUrl(item)}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      preserveAspectRatio="none"
      transform={item.rotation ? `rotate(${item.rotation} ${cx} ${cy})` : undefined}
    />
  )
}

export default function CharacterSprite({
  size = 'sm',
  flip = false,
  animate = false,
  skin = '#f0c68d',
  skinOutline = '#be8d4b',
  eye = '#874c24',
  shirt,
  equipped,
  svgStyle,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const h = SIZES[size]
  const w = Math.round(h * R)
  const shirtColor = shirt ?? '#c3a0e6'
  const items = wornItems(equipped)

  // Per-instance filter/mask ids so multiple sprites don't collide across SVGs
  const f = (n: number) => `filter${n}_i_${uid}`
  const m1 = `path-1-inside-1_${uid}`
  const m2 = `path-9-inside-2_${uid}`

  return (
    <div style={{ transform: flip ? 'scaleX(-1)' : undefined, lineHeight: 0 }}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 133.999 232.5"
        fill="none"
        className={animate ? 'anim-bobble' : ''}
        style={{ display: 'block', overflow: 'visible', ...svgStyle }}
      >
        {items.filter(i => i.z < 0).map(i => <Item key={i.id} item={i}/>)}

        {/* Body / shirt */}
        <g>
          <mask fill="white" id={m1}>
            <path d={svgPaths.p3953df00} />
          </mask>
          <g filter={`url(#${f(0)})`}>
            <path d={svgPaths.p3953df00} fill={shirtColor} />
          </g>
          <path d={svgPaths.p3e8e9700} fill="#1a2b4a" mask={`url(#${m1})`} />
        </g>

        {/* Head */}
        <g>
          <g filter={`url(#${f(1)})`}>
            <path d={svgPaths.p26e21100} fill={skin} />
          </g>
          <path d={svgPaths.p28024880} stroke={skinOutline} strokeWidth="3" style={{ mixBlendMode: 'multiply' }} />
        </g>

        {/* Shield hand */}
        <g>
          <g filter={`url(#${f(2)})`}>
            <path d={svgPaths.p60d2980} fill={skin} />
          </g>
          <path d={svgPaths.p1fe210f2} stroke={skinOutline} strokeWidth="3" style={{ mixBlendMode: 'multiply' }} />
        </g>

        {/* Eyes */}
        <g>
          <g filter={`url(#${f(3)})`}>
            <line stroke={eye} strokeLinecap="round" strokeWidth="7" x1="56.2221" x2="56.222" y1="92.5" y2="101.5" />
          </g>
          <g filter={`url(#${f(4)})`}>
            <line stroke={eye} strokeLinecap="round" strokeWidth="7" x1="82.2221" x2="82.2221" y1="92.5" y2="101.5" />
          </g>
        </g>

        {/* Weapon hand */}
        <g>
          <mask fill="white" id={m2}>
            <path d={svgPaths.p6720a00} />
          </mask>
          <g filter={`url(#${f(5)})`}>
            <path d={svgPaths.p6720a00} fill={skin} />
          </g>
          <path d={svgPaths.p10f28e00} fill={skinOutline} mask={`url(#${m2})`} style={{ mixBlendMode: 'multiply' }} />
        </g>

        {items.filter(i => i.z >= 0).map(i => <Item key={i.id} item={i}/>)}

        <defs>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="111.5" id={f(0)} width="90.596" x="0" y="121">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dx="6" dy="-12" />
            <feGaussianBlur stdDeviation="0.5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.913725 0 0 0 0 0.117647 0 0 0 0 0.388235 0 0 0 0.12 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="72.5" id={f(1)} width="71.5" x="24.5962" y="56">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-8" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.913725 0 0 0 0 0.117647 0 0 0 0 0.388235 0 0 0 0.15 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="29" id={f(2)} width="29" x="19" y="172">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.913725 0 0 0 0 0.117647 0 0 0 0 0.388235 0 0 0 0.12 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="16" id={f(3)} width="7" x="52.7221" y="89">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.607843 0 0 0 0 0.34902 0 0 0 0 0.713726 0 0 0 1 0" />
            <feBlend in2="shape" mode="multiply" result="effect1_innerShadow" />
          </filter>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="16" id={f(4)} width="7" x="78.7221" y="89">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.607843 0 0 0 0 0.34902 0 0 0 0 0.713726 0 0 0 1 0" />
            <feBlend in2="shape" mode="multiply" result="effect1_innerShadow" />
          </filter>
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="35.52" id={f(5)} width="33.0854" x="95.4151" y="126.99">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.913725 0 0 0 0 0.117647 0 0 0 0 0.388235 0 0 0 0.12 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
