// Small trend line (hand-rolled SVG, no chart library). Nulls leave a gap; `highlight` rings one point.
interface Props {
  title: string
  values: (number | null)[]
  color: string
  /** Top of the y axis (default: a round number above the largest value). */
  yMax?: number
  highlight?: number
  unit?: string
}

const niceCeil = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(v))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}
const fmt = (v: number) => String(Math.round(v * 10) / 10)

export default function LineChart({ title, values, color, yMax, highlight = -1, unit = '' }: Props) {
  const W = 320, H = 124
  const padL = 30, padR = 12, padT = 10, padB = 8
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const nums = values.filter((v): v is number => v !== null)
  const top = yMax ?? niceCeil(Math.max(1, ...nums))
  const x = (i: number) => padL + (values.length <= 1 ? plotW / 2 : (plotW * i) / (values.length - 1))
  const y = (v: number) => padT + plotH - (Math.min(v, top) / top) * plotH

  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v === null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `
    pen = true
  })
  const focus = highlight >= 0 ? values[highlight] : null

  return (
    <div className="rounded-2xl p-3" style={{ background: '#f5f7fb', border: '2.5px solid #c8d0e0' }}>
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <h4 className="font-game font-black text-sm" style={{ color: '#1a2b4a' }}>{title}</h4>
        {focus !== null && focus !== undefined && (
          <span className="text-[11px] font-game font-bold" style={{ color }}>This set: {fmt(focus)}{unit}</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
        {[0, top / 2, top].map(g => (
          <g key={g}>
            <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#e2e8f2" strokeWidth={1}/>
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize={9} fontFamily="'Nunito:Bold',sans-serif" fill="#9aaac4">{fmt(g)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/>
        {values.map((v, i) => v !== null && (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === highlight ? 5.5 : 3.2}
            fill={i === highlight ? color : '#fff'} stroke={i === highlight ? '#1a2b4a' : color} strokeWidth={i === highlight ? 2 : 2.2}/>
        ))}
      </svg>
      <div className="flex justify-between text-[9px] font-game mt-0.5" style={{ color: '#9aaac4', paddingLeft: 24 }}>
        <span>older</span>
        <span>newer</span>
      </div>
    </div>
  )
}
