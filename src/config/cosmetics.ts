/**
 * Cosmetics. The art is in public/cosmetics/; this table says where each item sits on the avatar.
 *
 * x / y / width / height are in the avatar's own units: CharacterSprite's viewBox is 134 × 232.5, the top of the head
 * is at y ≈ 56, the shield hand is centred near (33.5, 186.5) and the weapon hand near (112, 144.75).
 * Keep width / height at the file's viewBox size to draw it 1:1.
 *
 * Prices here are for display only: the server (Ricehacks-mybuild-backend/game-config.mjs) owns prices and slots,
 * so a new item needs an entry there too.
 */
export type Slot = 'head' | 'offhand' | 'mainhand'
/** Which item is worn in each slot (ids from the server; unknown ids are ignored). */
export type Equipped = Partial<Record<Slot, string>>

export interface Cosmetic {
  id: string
  name: string
  slot: Slot
  cost: number
  /** File name in public/cosmetics/. */
  file: string
  x: number
  y: number
  width: number
  height: number
  /** Degrees clockwise around the item's centre. */
  rotation: number
  /** Stacking order: negative draws behind the body, otherwise in front (higher on top). */
  z: number
  description: string
  /** What it does in a battle (the rules are on the server: game-config.mjs ITEM_EFFECTS). */
  effect: string
  /** Shop card background and glow. */
  tint: string
  glowColor: string
}

export const COSMETICS: Cosmetic[] = [
  {
    id: 'low_tier_shield', name: 'Low Tier Shield', slot: 'offhand', cost: 150,
    file: 'low_tier_shield.svg', x: -13.06, y: 139.94, width: 94, height: 94, rotation: 0, z: 1,
    description: 'A sturdy starter shield. Shows everyone you mean business.',
    effect: 'Absorbs up to 30% of incoming BP attack damage in battle.',
    tint: 'linear-gradient(145deg, #dff4ff 0%, #b8e0f7 100%)', glowColor: '#4a90e2',
  },
  {
    id: 'magic_wand', name: 'Magic Wand', slot: 'mainhand', cost: 300,
    file: 'magic_wand.svg', x: 96.75, y: 94.4, width: 31, height: 103, rotation: 0, z: 2,
    description: 'Sparkles with every perfect rep.',
    effect: 'Land 5 perfect reps (90+ form) in a row to trigger a +50 BP surge at the end of the round.',
    tint: 'linear-gradient(145deg, #fff0fb 0%, #f7c8f0 100%)', glowColor: '#c026d3',
  },
  {
    id: 'gauntlet', name: 'Iron Gauntlet', slot: 'mainhand', cost: 350,
    file: 'gauntlet.svg', x: 85.84, y: 119.25, width: 53, height: 51, rotation: 0, z: 2,
    description: 'Heavy-duty fist armour for heavy-duty sets.',
    effect: 'Applies a 1.5× multiplier to your attack while you are in a live battle.',
    tint: 'linear-gradient(145deg, #f0f4ff 0%, #c8d4f7 100%)', glowColor: '#6366f1',
  },
  {
    id: 'warlock_hat', name: 'Warlock Hat', slot: 'head', cost: 400,
    file: 'warlock_hat.svg', x: -13.4, y: -16, width: 118, height: 105, rotation: 0, z: 3,
    description: 'Mysterious, pointy, and extremely intimidating on the map.',
    effect: 'Curses your foe: every red rep they do has a 20% chance of costing them a point.',
    tint: 'linear-gradient(145deg, #f7f0ff 0%, #dfc8ff 100%)', glowColor: '#9333ea',
  },
]

const BY_ID = new Map(COSMETICS.map(c => [c.id, c]))

export const cosmetic = (id: string | undefined): Cosmetic | undefined => (id ? BY_ID.get(id) : undefined)

/** URL of an item's art (relative to the app, so it works under any base path). */
export const cosmeticUrl = (c: Cosmetic) => `${import.meta.env?.BASE_URL ?? './'}cosmetics/${c.file}`

/** The worn items that exist in this build, in drawing order. */
export function wornItems(equipped: Equipped | undefined): Cosmetic[] {
  if (!equipped) return []
  return (Object.entries(equipped) as [Slot, string][])
    .map(([slot, id]) => cosmetic(id))
    .filter((c): c is Cosmetic => c !== undefined && equipped[c.slot] === c.id)
    .sort((a, b) => a.z - b.z)
}
