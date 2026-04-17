import {
  Zap, Home, Droplets, LayoutGrid, LayoutTemplate,
  TrendingUp, Circle, Minus, MoveUpRight, Dumbbell,
  AlignJustify, Grip, CircleDot, MoveUp, Toilet,
  LucideProps,
} from 'lucide-react'
import { ATTRIBUTE_DEFINITIONS, AttributeDefinition } from '@/lib/attributes/definitions'

// Map icon names → Lucide components
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Zap,
  Home,
  Droplets,
  LayoutGrid,
  LayoutTemplate,
  TrendingUp,
  Circle,
  Minus,
  MoveUpRight,
  Dumbbell,
  AlignJustify,
  Grip,
  CircleDot,
  MoveUp,
  Toilet,
}

interface AttributeBadgeProps {
  attributeKey: string
  size?: 'md' | 'sm' | 'xs'
  showLabel?: boolean
}

/** Single attribute icon + optional label badge. */
export function AttributeBadge({ attributeKey, size = 'sm', showLabel = true }: AttributeBadgeProps) {
  const def = ATTRIBUTE_DEFINITIONS.find(d => d.key === attributeKey)
  if (!def) return null
  const Icon = ICON_MAP[def.icon]
  const iconSize = size === 'xs' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  const textSize = size === 'xs' ? 'text-[10px]' : size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span className={`inline-flex items-center gap-1 text-muted-foreground ${textSize}`}>
      {Icon && <Icon className={iconSize} />}
      {showLabel && <span>{def.label}</span>}
    </span>
  )
}

interface AttributeIconRowProps {
  activeKeys: string[]
  size?: 'md' | 'sm' | 'xs'
  showLabel?: boolean
  className?: string
}

/** Compact horizontal row of attribute badges for true-valued attributes. */
export function AttributeIconRow({ activeKeys, size = 'sm', showLabel = true, className }: AttributeIconRowProps) {
  if (activeKeys.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className ?? ''}`}>
      {activeKeys.map(key => (
        <AttributeBadge key={key} attributeKey={key} size={size} showLabel={showLabel} />
      ))}
    </div>
  )
}

interface AttributeSectionProps {
  title: string
  defs: AttributeDefinition[]
  activeKeys: string[]
}

/** Grouped section (e.g. "Infrastruktur") with all attribute badges. */
export function AttributeSection({ title, defs, activeKeys }: AttributeSectionProps) {
  const active = defs.filter(d => activeKeys.includes(d.key))
  if (active.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {active.map(def => (
          <AttributeBadge key={def.key} attributeKey={def.key} size="sm" showLabel />
        ))}
      </div>
    </div>
  )
}
