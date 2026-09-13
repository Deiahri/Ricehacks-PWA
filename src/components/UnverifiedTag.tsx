// Identity verification markers: the "Unverified" tag other players see, and the shield used around the verify flow.

/** A shield with "!" (or a tick once verified). `color` is a 6-digit hex. */
export function ShieldIcon({ size = 20, color = '#b45309', check = false }: { size?: number; color?: string; check?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z" fill={`${color}22`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      {check
        ? <path d="M8.5 12.2l2.4 2.4 4.6-4.8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        : <>
            <path d="M12 7.5v5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1.3" fill={color}/>
          </>}
    </svg>
  )
}

/**
 * "Unverified" pill, shown only when `verified` is exactly false (verification is on and they haven't done it).
 * Unknown (null/undefined: no account yet, an older server, or verification off) shows nothing.
 */
export default function UnverifiedTag({ verified, size = 'sm' }: { verified?: boolean | null; size?: 'xs' | 'sm' }) {
  if (verified !== false) return null
  const xs = size === 'xs'
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-game font-black whitespace-nowrap flex-shrink-0 ${xs ? 'text-[8px] pl-0.5 pr-1.5 py-px' : 'text-[9px] pl-1 pr-1.5 py-0.5'}`}
      style={{ background: '#fffbeb', color: '#b45309', border: '1.5px solid #fde68a', lineHeight: 1.2 }}
    >
      <ShieldIcon size={xs ? 9 : 11}/>
      Unverified
    </span>
  )
}
