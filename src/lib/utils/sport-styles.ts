import { SportType } from '@/lib/supabase/types'
import L from 'leaflet'

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
  // German sports
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

// Create simple sport icon with badge for multiple sports
function createSimpleSportIcon(sports: string[], baseSize: number, isSelected: boolean = false): string {
  const pinSize = baseSize
  const borderWidth = isSelected ? 3 : 2
  const borderColor = isSelected ? '#1F2937' : '#FFFFFF'
  const primaryColor = sportColors[sports[0]] || '#6B7280'
  const primaryIcon = sportIcons[sports[0]] || '📍'
  const isMultiSport = sports.length > 1
  
  return `
    <!-- Pin background -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: ${pinSize}px;
      height: ${pinSize}px;
      background-color: ${primaryColor};
      border: ${borderWidth}px solid ${borderColor};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      z-index: 10;
    "></div>
    
    <!-- Primary sport icon -->
    <div style="
      position: absolute;
      top: ${Math.round(pinSize * 0.15)}px;
      left: ${Math.round(pinSize * 0.15)}px;
      width: ${Math.round(pinSize * 0.7)}px;
      height: ${Math.round(pinSize * 0.7)}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.round(pinSize * 0.5)}px;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      z-index: 11;
    ">
      ${primaryIcon}
    </div>
    
    ${isMultiSport ? `
    <!-- Multi-sport badge -->
    <div style="
      position: absolute;
      top: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      background-color: #8B5CF6;
      border: 2px solid white;
      border-radius: 50%;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      z-index: 12;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      ${sports.length}
    </div>
    ` : ''}
  `
}

// Create custom Leaflet icon for a sport
export function createSportIcon(sports: string[], isSelected = false): L.DivIcon {
  const baseSize = isSelected ? 36 : 28
  const containerSize = baseSize + 8 // Add space for badge overflow
  
  return L.divIcon({
    className: 'custom-sport-marker',
    html: `
      <div style="
        position: relative;
        width: ${containerSize}px;
        height: ${containerSize}px;
      ">
        ${createSimpleSportIcon(sports, baseSize, isSelected)}
      </div>
    `,
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize - 4],
    popupAnchor: [0, -(containerSize - 4)]
  })
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