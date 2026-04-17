import type { SportType } from '@/lib/supabase/types'

export type AttributeScope = 'place' | 'court'
export type AttributeInputType = 'boolean' | 'select' | 'number'
export type AttributeCategory = 'services' | 'infrastructure' | 'court' | 'sport-specific'

export interface AttributeDefinition {
  key: string
  label: string
  icon: string        // Lucide icon component name
  scope: AttributeScope
  inputType: AttributeInputType
  options?: string[]  // for select type
  sports?: SportType[] // undefined = applies to all sports
  category: AttributeCategory
}

export const ATTRIBUTE_DEFINITIONS: AttributeDefinition[] = [
  // ── Place-level ──────────────────────────────────────────────────────────
  {
    key: 'toilets',
    label: 'Toiletten',
    icon: 'Toilet',
    scope: 'place',
    inputType: 'boolean',
    category: 'services',
  },
  {
    key: 'drinking_water',
    label: 'Trinkwasser',
    icon: 'Droplets',
    scope: 'place',
    inputType: 'boolean',
    category: 'services',
  },

  // ── Court-level — all sports ──────────────────────────────────────────────
  {
    key: 'lighting',
    label: 'Beleuchtung',
    icon: 'Zap',
    scope: 'court',
    inputType: 'boolean',
    category: 'infrastructure',
  },
  {
    key: 'roof',
    label: 'Überdacht',
    icon: 'Home',
    scope: 'court',
    inputType: 'boolean',
    category: 'infrastructure',
  },

  // ── Court-level — Basketball ──────────────────────────────────────────────
  {
    key: 'full_court',
    label: 'Vollfeld',
    icon: 'LayoutGrid',
    scope: 'court',
    inputType: 'boolean',
    sports: ['basketball'],
    category: 'sport-specific',
  },
  {
    key: 'half_court',
    label: 'Halbfeld',
    icon: 'LayoutTemplate',
    scope: 'court',
    inputType: 'boolean',
    sports: ['basketball'],
    category: 'sport-specific',
  },

  // ── Court-level — Skatepark ───────────────────────────────────────────────
  {
    key: 'halfpipe',
    label: 'Halfpipe',
    icon: 'TrendingUp',
    scope: 'court',
    inputType: 'boolean',
    sports: ['skatepark'],
    category: 'sport-specific',
  },
  {
    key: 'bowl',
    label: 'Bowl',
    icon: 'Circle',
    scope: 'court',
    inputType: 'boolean',
    sports: ['skatepark'],
    category: 'sport-specific',
  },
  {
    key: 'rails',
    label: 'Rails / Ledges',
    icon: 'Minus',
    scope: 'court',
    inputType: 'boolean',
    sports: ['skatepark'],
    category: 'sport-specific',
  },
  {
    key: 'ramps',
    label: 'Rampen',
    icon: 'MoveUpRight',
    scope: 'court',
    inputType: 'boolean',
    sports: ['skatepark'],
    category: 'sport-specific',
  },

  // ── Court-level — Calisthenics ────────────────────────────────────────────
  {
    key: 'pullup_bars',
    label: 'Klimmzugstangen',
    icon: 'Dumbbell',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
  {
    key: 'dip_bars',
    label: 'Dip-Stangen',
    icon: 'Dumbbell',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
  {
    key: 'parallel_bars',
    label: 'Barren',
    icon: 'AlignJustify',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
  {
    key: 'monkey_bars',
    label: 'Monkey Bars',
    icon: 'Grip',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
  {
    key: 'gymnastic_rings',
    label: 'Ringe',
    icon: 'CircleDot',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
  {
    key: 'rope_climb',
    label: 'Kletterseil',
    icon: 'MoveUp',
    scope: 'court',
    inputType: 'boolean',
    sports: ['calisthenics'],
    category: 'sport-specific',
  },
]

/** All definitions for a given scope, optionally filtered to sports relevant for the context. */
export function getRelevantAttributes(
  scope: AttributeScope,
  activeSports?: SportType[],
): AttributeDefinition[] {
  return ATTRIBUTE_DEFINITIONS.filter(def => {
    if (def.scope !== scope) return false
    if (!def.sports) return true // applies to all
    if (!activeSports || activeSports.length === 0) return false
    return def.sports.some(s => activeSports.includes(s))
  })
}

/** True-valued boolean attribute keys for display (e.g. from a Record<string, boolean>). */
export function getActiveAttributeKeys(attrs: Record<string, boolean>): string[] {
  return Object.entries(attrs)
    .filter(([, v]) => v)
    .map(([k]) => k)
}

/** Convert a place_attributes / court_attributes rows array to a boolean map. */
export function rowsToAttributeMap(rows: { key: string; value: string }[]): Record<string, boolean> {
  return Object.fromEntries(rows.map(r => [r.key, r.value === 'true']))
}
