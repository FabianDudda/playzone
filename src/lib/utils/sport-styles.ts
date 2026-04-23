import { SportType } from '@/lib/supabase/types'
import L from 'leaflet'

// Icon cache for performance optimization
const iconCache = new Map<string, L.DivIcon>()

// Helper function to generate cache key for sports array
function getSportsCacheKey(sports: string[], isSelected: boolean, hasEvents: boolean): string {
  return `${sports.sort().join(',')}-${isSelected}-${hasEvents}`
}

// Export function to clear icon cache (useful for memory management)\nexport function clearIconCache(): void {\n  iconCache.clear()\n}\n\n// Export function to get cache size (for debugging)\nexport function getIconCacheSize(): number {\n  return iconCache.size\n}\n\n// Sport color mapping
export const sportColors: Record<string, string> = {
  // Original sports
  tennis: '#10B981',      // Green
  basketball: '#F59E0B',  // Amber/Orange  
  volleyball: '#3B82F6',  // Blue
  spikeball: '#EF4444',   // Red
  badminton: '#8B5CF6',   // Purple/Violet
  squash: '#06B6D4',      // Cyan
  pickleball: '#F97316',  // Orange
  fußball: '#22C55E',     // Bright Green
  tischtennis: '#EC4899', // Pink
  beachvolleyball: '#FCD34D', // Yellow
  boule: '#92400E',       // Brown
  skatepark: '#374151',   // Dark Gray
  calisthenics: '#6366F1', // Indigo
  laufen: '#EF4444',      // Red
  schwimmen: '#0EA5E9',   // Sky Blue
  hockey: '#1F2937',      // Dark Gray
  klettern: '#78716C',    // Stone
  padel: '#A3E635',       // Lime
  schach: '#6B21A8',      // Purple
  parkour: '#F97316',     // Orange
  rugby: '#15803D',       // Green
  inliner: '#0284C7',     // Blue
  discgolf: '#65A30D',    // Lime Green
  bmx: '#DC2626',         // Red
  other: '#9CA3AF',       // Gray
}

// Sport display names (for consistency)
export const sportNames: Record<string, string> = {
  // Original sports
  tennis: 'Tennis',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  spikeball: 'Spikeball',
  badminton: 'Badminton',
  squash: 'Squash',
  pickleball: 'Pickleball',
  // German sports
  fußball: 'Fußball',
  tischtennis: 'Tischtennis',
  beachvolleyball: 'Beachvolleyball',
  boule: 'Boule',
  skatepark: 'Skatepark',
  laufen: 'Laufen',
  schwimmen: 'Schwimmen',
  hockey: 'Hockey',
  klettern: 'Klettern',
  padel: 'Padel',
  calisthenics: 'Calisthenics',
  schach: 'Schach',
  other: 'Andere Sportart',
}

// Modern badge styling with subtle backgrounds and default text color using Tailwind
export const sportBadgeStyles: Record<string, { bg: string, text: string }> = {
  // Original sports
  tennis: { bg: 'bg-emerald-50', text: 'text-foreground' },
  basketball: { bg: 'bg-amber-50', text: 'text-foreground' },
  volleyball: { bg: 'bg-blue-50', text: 'text-foreground' },
  spikeball: { bg: 'bg-red-50', text: 'text-foreground' },
  badminton: { bg: 'bg-violet-50', text: 'text-foreground' },
  squash: { bg: 'bg-cyan-50', text: 'text-foreground' },
  pickleball: { bg: 'bg-orange-50', text: 'text-foreground' },
  // German sports
  fußball: { bg: 'bg-green-50', text: 'text-foreground' },
  tischtennis: { bg: 'bg-pink-50', text: 'text-foreground' },
  beachvolleyball: { bg: 'bg-yellow-50', text: 'text-foreground' },
  boule: { bg: 'bg-amber-50', text: 'text-foreground' },
  skatepark: { bg: 'bg-gray-50', text: 'text-foreground' },
  calisthenics: { bg: 'bg-indigo-50', text: 'text-foreground' },
  laufen: { bg: 'bg-red-50', text: 'text-foreground' },
  schwimmen: { bg: 'bg-sky-50', text: 'text-foreground' },
  hockey: { bg: 'bg-gray-50', text: 'text-foreground' },
  klettern: { bg: 'bg-stone-50', text: 'text-foreground' },
  padel: { bg: 'bg-lime-50', text: 'text-foreground' },
  schach: { bg: 'bg-purple-50', text: 'text-foreground' },
  other: { bg: 'bg-gray-50', text: 'text-foreground' },
}

// Sport icon mapping - using Unicode symbols for visual representation
export const sportIcons: Record<string, string> = {
  // Original sports
  tennis: '🎾',        // Tennis ball
  basketball: '🏀',    // Basketball
  volleyball: '🏐',    // Volleyball  
  spikeball: '⭕',     // Circle (closest to spikeball net)
  badminton: '🏸',     // Shuttlecock
  squash: '🎯',        // Target (for enclosed court)
  pickleball: '🏓',    // Ping pong paddle (similar sport)
  // German sports  
  fußball: '⚽',       // Soccer ball
  tischtennis: '🏓',   // Ping pong
  beachvolleyball: '🏖️', // Beach with umbrella
  boule: '🔵',         // Blue circle (boule ball)
  skatepark: '🛹',     // Skateboard
  calisthenics: '💪',  // Calisthenics
  laufen: '🏃',        // Laufen
  schwimmen: '🏊',     // Schwimmen
  hockey: '🏑',        // Hockey
  klettern: '🧗',      // Klettern
  padel: '🎾',         // Padel
  schach: '♟️',        // Chess
  parkour: '🏃',        // Parkour
  rugby: '🏉',          // Rugby
  inliner: '🛼',        // Inline skates
  discgolf: '🥏',       // Disc golf
  bmx: '🚲',            // BMX
  other: '🏅',          // Other sport
}

// Returns the display label for a court sport, using custom_sport_name when sport is 'other'
export function getCourtSportLabel(sport: string, customSportName?: string | null): string {
  if (sport === 'other') return customSportName || 'Andere Sportart'
  return sportNames[sport] || sport
}

// Get color for a court based on its sports
export function getCourtColor(sports: string[]): string {
  if (sports.length === 0) return '#6B7280' // Gray fallback
  if (sports.length === 1) return sportColors[sports[0]] || '#6B7280'
  
  // For multi-sport courts, use a mixed color or primary sport
  // For now, just use the first sport's color
  return sportColors[sports[0]] || '#6B7280'
}

// Get primary sport icon for a court
export function getPrimarySportIcon(sports: string[]): string {
  if (sports.length === 0) return '📍' // Default pin
  return sportIcons[sports[0]] || '📍'
}

// Helper function to determine text color based on background color brightness
export function getContrastTextColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate brightness using relative luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  // Return white text for dark backgrounds, black for light backgrounds
  return brightness < 128 ? '#FFFFFF' : '#000000'
}

// Get modern badge Tailwind classes for a sport
export function getSportBadgeClasses(sport: string): string {
  const styles = sportBadgeStyles[sport]
  if (!styles) {
    // Fallback for unknown sports
    return 'bg-gray-50 text-foreground'
  }
  return `${styles.bg} ${styles.text}`
}

// Get modern badge inline styles for HTML templates (fallback when Tailwind classes aren't available)
export function getSportBadgeStyles(sport: string): { backgroundColor: string, color: string } {
  // Map Tailwind 50-tone classes to CSS values for HTML templates
  const tailwindToCSS: Record<string, string> = {
    'bg-emerald-50': '#ecfdf5',
    'bg-amber-50': '#fffbeb', 
    'bg-blue-50': '#eff6ff',
    'bg-red-50': '#fef2f2',
    'bg-violet-50': '#f5f3ff',
    'bg-cyan-50': '#ecfeff',
    'bg-orange-50': '#fff7ed',
    'bg-green-50': '#f0fdf4',
    'bg-pink-50': '#fdf2f8',
    'bg-yellow-50': '#fefce8',
    'bg-gray-50': '#f9fafb'
  }
  
  const styles = sportBadgeStyles[sport]
  if (!styles) {
    return { backgroundColor: '#f9fafb', color: '#0f172a' } // gray-50 fallback with default text
  }
  
  const backgroundColor = tailwindToCSS[styles.bg] || '#f9fafb'
  // Use default foreground color (typically dark) for all badges
  const textColor = '#0f172a' // Default app text color
  
  return { backgroundColor, color: textColor }
}

// Helper function to render emoji icon HTML for map pins
function renderIconHtml(icon: string, fontSize: number): string {
  return `<span style="font-size: ${fontSize}px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${icon}</span>`
}

// Builds absolutely-positioned icon elements for a pinSize×pinSize area (no background)
function buildIconElements(sports: string[], pinSize: number): string {
  const maxDisplayIcons = 3
  const sportsToShow = sports.slice(0, Math.min(maxDisplayIcons, sports.length))
  const showOverflow = sports.length > maxDisplayIcons
  const iconsToShow = showOverflow ? sportsToShow.slice(0, 2) : sportsToShow
  const remainingCount = showOverflow ? Math.max(0, sports.length - 2) : 0

  let iconSizeRatio
  if (sports.length === 0) {
    iconSizeRatio = 0.5
  } else if (sports.length === 1) {
    iconSizeRatio = 0.425
  } else if (iconsToShow.length === 2 && !showOverflow) {
    iconSizeRatio = 0.375
  } else {
    iconSizeRatio = 0.35
  }

  const iconSize = Math.round(pinSize * iconSizeRatio)
  const fontSize = Math.max(8, Math.round(iconSize * 0.8))
  const verticalSpacing = Math.round(iconSize * 0.1)
  const horizontalSpacing = Math.round(iconSize * 0.2)
  const topRowY = Math.round(pinSize * 0.2)
  const bottomRowY = topRowY + iconSize + Math.round(verticalSpacing * 0.7)

  if (sports.length === 0) {
    const cx = (pinSize - iconSize) / 2
    const cy = (pinSize - iconSize) / 2
    return `<div style="position:absolute;top:${cy}px;left:${cx}px;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;color:#6B7280;font-weight:bold;z-index:11;">?</div>`
  }

  if (sports.length === 1) {
    const icon = sportIcons[sports[0]] || '📍'
    const cx = (pinSize - iconSize) / 2
    const cy = (pinSize - iconSize) / 2
    return `<div style="position:absolute;top:${cy}px;left:${cx}px;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;z-index:11;">${renderIconHtml(icon, fontSize)}</div>`
  }

  if (iconsToShow.length === 2 && !showOverflow) {
    const totalW = 2 * iconSize + horizontalSpacing
    const startX = (pinSize - totalW) / 2
    const cy = (pinSize - iconSize) / 2
    return iconsToShow.map((sport, i) => {
      const left = startX + i * (iconSize + horizontalSpacing)
      return `<div style="position:absolute;left:${left}px;top:${cy}px;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;z-index:11;">${renderIconHtml(sportIcons[sport] || '📍', fontSize)}</div>`
    }).join('')
  }

  // Triangular layout for 3+ sports
  const totalW = 2 * iconSize + horizontalSpacing
  const startX = (pinSize - totalW) / 2
  const bottomX = (pinSize - iconSize) / 2

  const topRow = iconsToShow.slice(0, 2).map((sport, i) => {
    const left = startX + i * (iconSize + horizontalSpacing)
    return `<div style="position:absolute;left:${left}px;top:${topRowY}px;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;z-index:11;">${renderIconHtml(sportIcons[sport] || '📍', fontSize)}</div>`
  }).join('')

  const bottom = showOverflow
    ? `<div style="position:absolute;left:${bottomX}px;top:${bottomRowY}px;width:${iconSize}px;height:${iconSize}px;background-color:rgba(255,255,255,0.9);border:1px solid rgba(0,0,0,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.max(6, fontSize - 2)}px;font-weight:bold;color:#374151;z-index:12;">+${remainingCount}</div>`
    : `<div style="position:absolute;left:${bottomX}px;top:${bottomRowY}px;width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;z-index:11;">${renderIconHtml(sportIcons[iconsToShow[2]] || '📍', fontSize)}</div>`

  return topRow + bottom
}

// Create horizontal sport icons layout within pin
function createSimpleSportIcon(sports: string[], baseSize: number, isSelected: boolean = false, hasEvents: boolean = false): string {
  const pinSize = 36
  const bgColor = isSelected ? 'hsl(var(--primary))' : hasEvents ? '#6366F1' : 'white'

  return `
    <div style="position:absolute;top:0;left:0;width:${pinSize}px;height:${pinSize}px;background-color:${bgColor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);transform-origin:center center;box-shadow:0 3px 8px rgba(0,0,0,0.3);z-index:10;"></div>
    ${buildIconElements(sports, pinSize)}
  `
}

// Create custom Leaflet icon for a sport
export function createSportIcon(sports: string[], isSelected = false, hasEvents = false): L.DivIcon {
  // Ensure we have a valid sports array
  const validSports = Array.isArray(sports) ? sports.filter(Boolean) : []

  // Generate cache key
  const cacheKey = getSportsCacheKey(validSports, isSelected, hasEvents)

  // Check if icon is already cached
  const cachedIcon = iconCache.get(cacheKey)
  if (cachedIcon) {
    return cachedIcon
  }

  // All pins now use consistent teardrop size
  const pinSize = 36
  const containerWidth = pinSize + 8
  const containerHeight = Math.round(pinSize * 1.3) + 8 // Account for teardrop height

  const newIcon = L.divIcon({
    className: 'custom-sport-marker',
    html: `
      <div style="
        position: relative;
        width: ${containerWidth}px;
        height: ${containerHeight}px;
      ">
        ${createSimpleSportIcon(validSports, pinSize, isSelected, hasEvents)}
      </div>
    `,
    iconSize: [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, containerHeight - 4], // Anchor at bottom point
    popupAnchor: [0, -(containerHeight - 8)] // Popup above the pin
  })
  
  // Cache the created icon
  iconCache.set(cacheKey, newIcon)
  
  return newIcon
}

// Create a distinct diamond/star marker for organizer places
export function createOrganizerIcon(color: string, logoUrl?: string | null, isSelected = false): L.DivIcon {
  const cacheKey = `org-${color}-${logoUrl ?? ''}-${isSelected}`
  const cached = iconCache.get(cacheKey)
  if (cached) return cached

  const pinSize = 36
  const containerWidth = pinSize + 8
  const containerHeight = Math.round(pinSize * 1.3) + 8

  const bgColor = isSelected ? 'hsl(var(--primary))' : color
  const borderColor = isSelected ? 'hsl(var(--primary-foreground))' : '#FFFFFF'

  const iconContent = logoUrl
    ? `<img src="${logoUrl}" alt="" style="width:${Math.round(pinSize * 0.55)}px;height:${Math.round(pinSize * 0.55)}px;object-fit:contain;border-radius:2px;" />`
    : `<span style="font-size:${Math.round(pinSize * 0.4)}px;line-height:1;">🏢</span>`

  const html = `
    <div style="position:relative;width:${containerWidth}px;height:${containerHeight}px;">
      <!-- Diamond shape: square rotated 45° -->
      <div style="
        position:absolute;
        top:0;left:4px;
        width:${pinSize}px;height:${pinSize}px;
        background-color:${bgColor};
        border:2px solid ${borderColor};
        border-radius:4px;
        transform:rotate(45deg);
        transform-origin:center center;
        box-shadow:0 3px 8px rgba(0,0,0,0.3);
        z-index:10;
      "></div>
      <!-- Icon centered on the diamond -->
      <div style="
        position:absolute;
        top:${Math.round(pinSize * 0.23)}px;
        left:${Math.round(containerWidth / 2 - pinSize * 0.275)}px;
        width:${Math.round(pinSize * 0.55)}px;
        height:${Math.round(pinSize * 0.55)}px;
        display:flex;align-items:center;justify-content:center;
        z-index:11;
      ">${iconContent}</div>
    </div>
  `

  const icon = L.divIcon({
    className: 'custom-organizer-marker',
    html,
    iconSize: [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, containerHeight - 4],
    popupAnchor: [0, -(containerHeight - 8)],
  })
  iconCache.set(cacheKey, icon)
  return icon
}

// Create event-only place marker: indigo diamond with sport icons using same layout as place pins
export function createEventOnlyIcon(sports: string[], isSelected = false): L.DivIcon {
  const validSports = Array.isArray(sports) ? sports.filter(Boolean) : []
  const cacheKey = `event-only-${getSportsCacheKey(validSports, isSelected, false)}`
  const cached = iconCache.get(cacheKey)
  if (cached) return cached

  const pinSize = 36
  const containerWidth = pinSize + 8
  const containerHeight = Math.round(pinSize * 1.3) + 8
  const bgColor = isSelected ? 'hsl(var(--primary))' : '#6366F1'

  const html = `
    <div style="position:relative;width:${containerWidth}px;height:${containerHeight}px;">
      <div style="position:absolute;top:0;left:4px;width:${pinSize}px;height:${pinSize}px;background-color:${bgColor};border-radius:4px;transform:rotate(45deg);transform-origin:center center;box-shadow:0 3px 8px rgba(0,0,0,0.3);z-index:10;"></div>
      <div style="position:absolute;top:0;left:4px;width:${pinSize}px;height:${pinSize}px;">
        ${buildIconElements(validSports, pinSize)}
      </div>
    </div>
  `

  const icon = L.divIcon({
    className: 'custom-event-only-marker',
    html,
    iconSize: [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, containerHeight - 4],
    popupAnchor: [0, -(containerHeight - 8)],
  })
  iconCache.set(cacheKey, icon)
  return icon
}

// Create icon for user location
export function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        background-color: #3B82F6;
        width: 20px;
        height: 20px;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  })
}

// Create icon for selected location (when adding new court)
export function createSelectedLocationIcon(): L.DivIcon {
  const size = 32
  
  return L.divIcon({
    className: 'selected-location-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size + 8}px;
      ">
        <!-- Pin shape background -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          background-color: #EF4444;
          border: 3px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 8px rgba(239, 68, 68, 0.5);
          animation: pulse-pin 2s infinite;
        "></div>
        
        <!-- Plus icon -->
        <div style="
          position: absolute;
          top: ${Math.round(size * 0.2)}px;
          left: ${Math.round(size * 0.2)}px;
          width: ${Math.round(size * 0.6)}px;
          height: ${Math.round(size * 0.6)}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          z-index: 10;
        ">
          +
        </div>
      </div>
      
      <style>
        @keyframes pulse-pin {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      </style>
    `,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 4],
    popupAnchor: [0, -(size + 4)]
  })
}