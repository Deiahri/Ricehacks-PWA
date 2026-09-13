import type { RepQuality } from './scoring'

/** How each rep grade looks: the last-rep label during a set and the replay's rep badges. */
export const QUALITY_CFG: Record<RepQuality, { label: string; color: string; emoji: string }> = {
  red:    { label: 'Poor Form', color: '#ff4b4b', emoji: '🔴' },
  yellow: { label: 'Good',      color: '#f59e0b', emoji: '🟡' },
  green:  { label: 'Great!',    color: '#58cc02', emoji: '🟢' },
}

/** Rep block colours (progress bars, quality strips, replay timeline). */
export const Q_COLOR: Record<RepQuality, string> = { red: '#ff4b4b', yellow: '#ffd700', green: '#58cc02' }
