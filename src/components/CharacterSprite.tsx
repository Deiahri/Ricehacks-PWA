import { useId } from 'react'
import svgPaths from '../imports/AvatarCharacterspriteBase/svg-g0jev4nvz8'
import shieldPaths from '../imports/LowTierShield/svg-kbybzq1rfb'
import wandPaths from '../imports/MagicWand/svg-189sfn0wi7'
import hatPaths from '../imports/WarlockHat/svg-ya5fdplm2l'
import gauntletPaths from '../imports/Gauntlet/svg-8403qowjv7'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  flip?: boolean
  animate?: boolean
  /** Appearance overrides — players vary skin, eye and shirt */
  skin?: string
  skinOutline?: string
  eye?: string
  shirt?: string
  /** Equippable gear rendered into the reserved slots */
  hat?: boolean
  shield?: boolean
  weapon?: 'wand' | 'gauntlet'
  /** Extra inline styles applied to the SVG element */
  svgStyle?: React.CSSProperties
}

// Native art canvas is 134 × 232.5 (aspect ≈ 0.576). Sizes defined by height.
const R = 133.999 / 232.5
const SIZES: Record<string, number> = { xs: 40, sm: 56, md: 112, lg: 196 }

export default function CharacterSprite({
  size = 'sm',
  flip = false,
  animate = false,
  skin = '#f0c68d',
  skinOutline = '#be8d4b',
  eye = '#874c24',
  shirt,
  hat = false,
  shield = false,
  weapon,
  svgStyle,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const h = SIZES[size]
  const w = Math.round(h * R)
  const shirtColor = shirt ?? '#c3a0e6'

  // Per-instance filter/mask ids so multiple sprites don't collide across SVGs
  const f = (n: number) => `filter${n}_i_${uid}`
  const m1 = `path-1-inside-1_${uid}`
  const m2 = `path-9-inside-2_${uid}`

  // Per-instance ids for the gear items so their filters/masks don't collide
  const sf0 = `shield_f0_${uid}`
  const gf0 = `gaunt_f0_${uid}`
  const gm  = `gaunt_m_${uid}`
  const wf1 = `wand_f1_${uid}`
  const wf2 = `wand_f2_${uid}`
  const hf0 = `hat_f0_${uid}`
  const hf1 = `hat_f1_${uid}`

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

        {/* Shield — native size, centered on the shield-hand box (center 33.5, 186.5) */}
        {shield && (
          <g transform="translate(-13.06, 139.94)">
            <g>
              <g filter={`url(#${sf0})`}>
                <path d={shieldPaths.p1ad43500} fill="#BE8D4B" />
              </g>
              <path d={shieldPaths.p3cb53300} stroke="#7A4F00" strokeWidth="3" />
            </g>
            <path d={shieldPaths.p1bde4800} fill="#B45309" style={{ mixBlendMode: 'plus-darker' }} />
            <path d={shieldPaths.p18733f00} fill="#B45309" style={{ mixBlendMode: 'plus-darker' }} />
          </g>
        )}

        {/* Weapon — native size, centered on the weapon-hand box (center 112, 144.75) */}
        {weapon === 'gauntlet' && (
          <g transform="translate(85.84, 119.25)">
            <g>
              <mask fill="white" id={gm}>
                <path d={gauntletPaths.p1219d400} />
              </mask>
              <g filter={`url(#${gf0})`}>
                <path d={gauntletPaths.p1219d400} fill="#D35B5B" />
              </g>
              <path d={gauntletPaths.pe3aa380} fill="#A22626" mask={`url(#${gm})`} style={{ mixBlendMode: 'multiply' }} />
            </g>
            <path d={gauntletPaths.p293b3e80} stroke="#860E0E" strokeLinecap="round" strokeWidth="2" style={{ mixBlendMode: 'darken' }} />
          </g>
        )}
        {weapon === 'wand' && (
          <g transform="translate(96.75, 94.4)">
            <g>
              <g filter={`url(#${wf1})`}>
                <path d={wandPaths.p324ba0b0} fill="#B693AF" />
              </g>
              <path d={wandPaths.p2ead6000} stroke="#1A2B4A" style={{ mixBlendMode: 'overlay' }} />
            </g>
            <g filter={`url(#${wf2})`}>
              <path d={wandPaths.p9d13080} fill="#FDE68A" fillOpacity="0.2" />
              <path d={wandPaths.pe0b480} stroke="#F59E0B" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="1.7" style={{ mixBlendMode: 'lighten' }} />
            </g>
            <g>
              <path d={wandPaths.pe0b480} fill="#FDE68A" />
              <path d={wandPaths.pe0b480} stroke="#F59E0B" strokeLinejoin="round" strokeWidth="1.7" style={{ mixBlendMode: 'lighten' }} />
            </g>
          </g>
        )}

        {/* Hat — native size, centered on the head box (center-x 60.35), resting on the head top (y 56) */}
        {hat && (
          <g transform="translate(-13.4, -16)">
            <g>
              <g filter={`url(#${hf0})`}>
                <path d={hatPaths.p1e846a80} fill="#5959B6" />
              </g>
              <path d={hatPaths.p2c5c3400} stroke="#52229B" strokeLinejoin="round" strokeWidth="3" />
            </g>
            <g>
              <g filter={`url(#${hf1})`}>
                <path d={hatPaths.p13cda700} fill="#C5E2E7" />
              </g>
              <path d={hatPaths.p399b4300} stroke="#B5D1FF" strokeWidth="3" style={{ mixBlendMode: 'plus-lighter' }} />
            </g>
          </g>
        )}

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

          {/* ── Gear item filters (preserved from imports, per-instance ids) ── */}
          {/* Shield */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="83.6262" id={sf0} width="69.9746" x="11.7442" y="7.87163">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-8" />
            <feGaussianBlur stdDeviation="0.5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.478431 0 0 0 0 0.309804 0 0 0 0 0 0 0 0 0.47 0" />
            <feBlend in2="shape" mode="color-burn" result="effect1_innerShadow" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="10" />
            <feGaussianBlur stdDeviation="1.5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.530818 0 0 0 0 0.297602 0 0 0 0 0.142125 0 0 0 1 0" />
            {/* Figma exports "plus-lighter", which SVG feBlend doesn't support (console error per render); "screen" is the closest valid mode */}
            <feBlend in2="effect1_innerShadow" mode="screen" result="effect2_innerShadow" />
          </filter>
          {/* Gauntlet */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="40.9836" id={gf0} width="39.0837" x="6.767" y="3.69505">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.490196 0 0 0 0 0.235294 0 0 0 0 0.596078 0 0 0 1 0" />
            <feBlend in2="shape" mode="multiply" result="effect1_innerShadow" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dx="5" dy="4" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.345098 0 0 0 0 0.8 0 0 0 0 0.00784314 0 0 0 1 0" />
            <feBlend in2="effect1_innerShadow" mode="screen" result="effect2_innerShadow" />
          </filter>
          {/* Wand shaft */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="83" id={wf1} width="8" x="10.2107" y="17.7">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dx="2" dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.52549 0 0 0 0 0.937255 0 0 0 0 0.67451 0 0 0 1 0" />
            <feBlend in2="shape" mode="darken" result="effect1_innerShadow" />
          </filter>
          {/* Wand star glow */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="29.4902" id={wf2} width="30.4214" x="0" y="0">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2" />
          </filter>
          {/* Hat cone */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="74.9263" id={hf0} width="100" x="17.4998" y="11.3695">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-7" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.490196 0 0 0 0 0.235294 0 0 0 0 0.596078 0 0 0 1 0" />
            <feBlend in2="shape" mode="color-dodge" result="effect1_innerShadow" />
          </filter>
          {/* Hat buckle */}
          <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="19.9792" id={hf1} width="19.6784" x="2.8115" y="32.2804">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="4" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.52549 0 0 0 0 0.937255 0 0 0 0 0.67451 0 0 0 1 0" />
            <feBlend in2="shape" mode="screen" result="effect1_innerShadow" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
