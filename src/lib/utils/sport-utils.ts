// Sport color mapping
export const sportColors: Record<string, string> = {
  // Original sports
  tennis: '#10B981',      // Green
  basketball: '#F59E0B',  // Amber/Orange  
  volleyball: '#3B82F6',  // Blue
  spikeball: '#EF4444',   // Red
  badminton: '#8B5CF6',   // Purple/Violet
  squash: '#06B6D4',      // Cyan
  pickleball: '#F97316',  // Orange
  hockey: '#1F2937',      // Dark Gray
  fußball: '#22C55E',     // Bright Green
  tischtennis: '#EC4899', // Pink
  beachvolleyball: '#FCD34D', // Yellow
  boule: '#92400E',       // Brown
  skatepark: '#374151',   // Dark Gray
  laufen: '#EF4444',     // Red
  schwimmen: '#0EA5E9',    // Sky Blue
  klettern: '#78716C',     // Stone
  padel: '#A3E635',        // Lime
  calisthenics: '#6366F1', // Indigo
  schach: '#6B21A8',       // Purple
  other: '#9CA3AF',        // Gray
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
  hockey: 'Hockey',
  // German sports
  fußball: 'Fußball',
  tischtennis: 'Tischtennis',
  beachvolleyball: 'Beachvolleyball',
  boule: 'Boule',
  skatepark: 'Skatepark',
  calisthenics: 'Calisthenics',
  laufen: 'Laufen',
  schwimmen: 'Schwimmen',
  klettern: 'Klettern',
  padel: 'Padel',
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
  hockey: { bg: 'bg-gray-50', text: 'text-foreground' },
  // German sports
  fußball: { bg: 'bg-green-50', text: 'text-foreground' },
  tischtennis: { bg: 'bg-pink-50', text: 'text-foreground' },
  beachvolleyball: { bg: 'bg-yellow-50', text: 'text-foreground' },
  boule: { bg: 'bg-amber-50', text: 'text-foreground' },
  skatepark: { bg: 'bg-gray-50', text: 'text-foreground' },
  laufen: { bg: 'bg-red-50', text: 'text-foreground' },
  schwimmen: { bg: 'bg-sky-50', text: 'text-foreground' },
  klettern: { bg: 'bg-stone-50', text: 'text-foreground' },
  padel: { bg: 'bg-lime-50', text: 'text-foreground' },
  calisthenics: { bg: 'bg-indigo-50', text: 'text-foreground' },
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
  hockey: '🏑',        // Hockey stick and ball
  // German sports  
  fußball: '⚽',       // Soccer ball
  tischtennis: '🏓',   // Ping pong
  beachvolleyball: '🏖️', // Beach with umbrella
  boule: '🔵',         // Blue circle (boule ball)
  skatepark: '🛹',     // Skateboard
  calisthenics: '💪',  // Calisthenics
  laufen: '🏃',        // Laufen
  schwimmen: '🏊',     // Schwimmen
  klettern: '🧗',      // Klettern
  padel: '🎾',         // Padel
  schach: '♟️',        // Chess
  other: '🏅',          // Other sport
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

// Place type utilities
export type PlaceType = 'öffentlich' | 'verein' | 'schule'

export const placeTypeLabels: Record<PlaceType, string> = {
  öffentlich: 'Öffentlich',
  verein: 'Verein',
  schule: 'Schule',
}

export const placeTypeIcons: Record<PlaceType, string> = {
  öffentlich: '🌳',
  verein: '👥',
  schule: '🏫',
}

export const placeTypeBadgeClasses: Record<PlaceType, string> = {
  öffentlich: 'bg-green-100 text-green-800',
  verein: 'bg-blue-100 text-blue-800',
  schule: 'bg-amber-100 text-amber-800',
}

export function getPlaceTypeBadgeClasses(type: PlaceType | string | null | undefined): string {
  if (!type) return 'bg-green-100 text-green-800'
  return placeTypeBadgeClasses[type as PlaceType] || 'bg-gray-100 text-gray-800'
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
    'bg-gray-50': '#f9fafb',
    'bg-purple-50': '#faf5ff'
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