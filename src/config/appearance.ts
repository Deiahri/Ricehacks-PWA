/**
 * Avatar looks, free to change in the avatar editor (Profile → tap your avatar).
 * Skin tone ids are shared with the server (Ricehacks-mybuild-backend/game-config.mjs, SKIN_TONES), so a new tone needs
 * its id added there too. The shirt can be any colour.
 */
export interface SkinTone {
  id: string
  /** Head and hands. */
  fill: string
  /** Their outline (drawn with multiply, so a darker shade of the fill). */
  outline: string
}

export const SKIN_TONES: SkinTone[] = [
  { id: 's1', fill: '#fde3cb', outline: '#d9a67e' },
  { id: 's2', fill: '#f0c68d', outline: '#be8d4b' },
  { id: 's3', fill: '#e0ac69', outline: '#a8743a' },
  { id: 's4', fill: '#c68642', outline: '#8d5a24' },
  { id: 's5', fill: '#a8703e', outline: '#734620' },
  { id: 's6', fill: '#8d5524', outline: '#5c3310' },
  { id: 's7', fill: '#6b4226', outline: '#432612' },
  { id: 's8', fill: '#4b2e1b', outline: '#2c190c' },
]

/** Before someone picks a tone. */
export const DEFAULT_SKIN = 's2'
export const DEFAULT_SHIRT = '#c3a0e6'

/** CharacterSprite's skin props for a tone id (unknown or missing → the default tone). */
export function skinColors(id: string | null | undefined): { skin: string; skinOutline: string } {
  const tone = SKIN_TONES.find(t => t.id === id) ?? SKIN_TONES.find(t => t.id === DEFAULT_SKIN)!
  return { skin: tone.fill, skinOutline: tone.outline }
}
