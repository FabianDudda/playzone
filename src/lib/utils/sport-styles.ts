import { SportType } from '@/lib/supabase/types'
import L from 'leaflet'

// Icon cache for performance optimization
const iconCache = new Map<string, L.DivIcon>()

// Helper function to generate cache key for sports array
function getSportsCacheKey(sports: string[], isSelected: boolean): string {
  return `${sports.sort().join(',')}-${isSelected}`
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
  skatepark: '#374151'    // Dark Gray
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
  skatepark: 'Skatepark'
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
  skatepark: { bg: 'bg-gray-50', text: 'text-foreground' }
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
  skatepark: '🛹'      // Skateboard
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

// Create horizontal sport icons layout within pin
function createSimpleSportIcon(sports: string[], baseSize: number, isSelected: boolean = false): string {
  const borderWidth = isSelected ? 3 : 2
  const borderColor = isSelected ? '#1F2937' : '#FFFFFF'
  const primaryColor = sportColors[sports[0]] || '#6B7280'
  
  // Determine how many icons to show and if we need +X indicator
  const maxDisplayIcons = 3
  const sportsToShow = sports.slice(0, Math.min(maxDisplayIcons, sports.length))
  const showOverflow = sports.length > maxDisplayIcons
  
  // If we have overflow, show first 2 icons + "+X" indicator (replaces 3rd position)
  const iconsToShow = showOverflow ? sportsToShow.slice(0, 2) : sportsToShow
  // Calculate remaining count based on actual icons shown (2 when overflow, otherwise all)
  const remainingCount = showOverflow ? Math.max(0, sports.length - 2) : 0
  
  // All pins use consistent size - unified width
  const pinSize = 44
  
  // Dynamic icon sizing based on number of sports
  let iconSizeRatio
  if (sports.length === 0) {
    iconSizeRatio = 0.5 // Large for question mark
  } else if (sports.length === 1) {
    iconSizeRatio = 0.425 // Large icon for single sport
  } else if (iconsToShow.length === 2 && !showOverflow) {
    iconSizeRatio = 0.375 // Medium icons for 2 sports
  } else {
    // For 3 sports OR 4+ sports with overflow (triangular layout)
    iconSizeRatio = 0.35 // Icons for triangular layout
  }
  
  // const iconSize = Math.round(pinSize * iconSizeRatio)
  const iconSize = Math.round(pinSize * iconSizeRatio)
  const fontSize = Math.max(8, Math.round(iconSize * 0.8))
  const verticalSpacing = Math.round(iconSize * 0.1) // Spacing between rows
  const horizontalSpacing = Math.round(iconSize * 0.2) // Spacing between top icons
  
  // Calculate positions for layout - icons positioned in circular head
  const topRowY = Math.round(pinSize * 0.2) // Top row position in circular head
  const bottomRowY = topRowY + iconSize + Math.round(verticalSpacing * 0.7) // Bottom row position
  
  // Generate all icon elements based on sport count
  let iconElements = ''
  
  if (sports.length === 0) {
    // Question mark for no sports - centered
    const centerX = (pinSize - iconSize) / 2
    const centerY = (pinSize - iconSize) / 2
    iconElements = `
      <div style="
        position: absolute;
        top: ${centerY}px;
        left: ${centerX}px;
        width: ${iconSize}px;
        height: ${iconSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        color: #6B7280;
        font-weight: bold;
        z-index: 11;
      ">
        ?
      </div>
    `
  } else if (sports.length === 1) {
    // Single centered icon
    const icon = sportIcons[sports[0]] || '📍'
    const centerX = (pinSize - iconSize) / 2
    const centerY = (pinSize - iconSize) / 2
    iconElements = `
      <div style="
        position: absolute;
        top: ${centerY}px;
        left: ${centerX}px;
        width: ${iconSize}px;
        height: ${iconSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        z-index: 11;
      ">
        ${icon}
      </div>
    `
  } else if (iconsToShow.length === 2 && !showOverflow) {
    // Two sports side by side - vertically centered
    const totalTopWidth = 2 * iconSize + horizontalSpacing
    const topRowStartX = (pinSize - totalTopWidth) / 2
    const centerY = (pinSize - iconSize) / 2 // Vertically center the row
    
    iconElements = iconsToShow.map((sport, index) => {
      const icon = sportIcons[sport] || '📍'
      const left = topRowStartX + index * (iconSize + horizontalSpacing)
      
      return `
        <div style="
          position: absolute;
          left: ${left}px;
          top: ${centerY}px;
          width: ${iconSize}px;
          height: ${iconSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          z-index: 11;
        ">
          ${icon}
        </div>
      `
    }).join('')
  } else {
    // Triangular layout for 3+ sports
    const totalTopWidth = 2 * iconSize + horizontalSpacing
    const topRowStartX = (pinSize - totalTopWidth) / 2
    const bottomIconX = (pinSize - iconSize) / 2
    
    // Top row icons (first 2)
    const topIconElements = iconsToShow.slice(0, 2).map((sport, index) => {
      const icon = sportIcons[sport] || '📍'
      const left = topRowStartX + index * (iconSize + horizontalSpacing)
      
      return `
        <div style="
          position: absolute;
          left: ${left}px;
          top: ${topRowY}px;
          width: ${iconSize}px;
          height: ${iconSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          z-index: 11;
        ">
          ${icon}
        </div>
      `
    }).join('')
    
    // Bottom element: either 3rd sport icon OR "+X" indicator
    const bottomElement = showOverflow ? `
      <div style="
        position: absolute;
        left: ${bottomIconX}px;
        top: ${bottomRowY}px;
        width: ${iconSize}px;
        height: ${iconSize}px;
        background-color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${Math.max(6, fontSize - 2)}px;
        font-weight: bold;
        color: #374151;
        z-index: 12;
      ">
        +${remainingCount}
      </div>
    ` : `
      <div style="
        position: absolute;
        left: ${bottomIconX}px;
        top: ${bottomRowY}px;
        width: ${iconSize}px;
        height: ${iconSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        z-index: 11;
      ">
        ${sportIcons[iconsToShow[2]] || '📍'}
      </div>
    `
    
    iconElements = topIconElements + bottomElement
  }
  
  // Single unified teardrop background for ALL cases
  return `
    <!-- Unified teardrop pin background -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: ${pinSize}px;
      height: ${Math.round(pinSize)}px;
      background-color: white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      transform-origin: center center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      z-index: 10;
    "></div>
    
    ${iconElements}
  `
}

// Create custom Leaflet icon for a sport
export function createSportIcon(sports: string[], isSelected = false): L.DivIcon {
  // Ensure we have a valid sports array
  const validSports = Array.isArray(sports) ? sports.filter(Boolean) : []
  
  // Generate cache key
  const cacheKey = getSportsCacheKey(validSports, isSelected)
  
  // Check if icon is already cached
  const cachedIcon = iconCache.get(cacheKey)
  if (cachedIcon) {
    return cachedIcon
  }
  
  // All pins now use consistent teardrop size
  const pinSize = 40 // Updated to match current pin size
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
        ${createSimpleSportIcon(validSports, pinSize, isSelected)}
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