import { SportType } from '@/lib/supabase/types'
import L from 'leaflet'

// Sport color mapping
export const sportColors: Record<SportType, string> = {
  tennis: '#10B981',      // Green
  basketball: '#F59E0B',  // Amber/Orange  
  volleyball: '#3B82F6',  // Blue
  spikeball: '#EF4444',   // Red
  badminton: '#8B5CF6',   // Purple/Violet
  squash: '#06B6D4',      // Cyan
  pickleball: '#F97316'   // Orange
}

// Sport display names (for consistency)
export const sportNames: Record<SportType, string> = {
  tennis: 'Tennis',
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  spikeball: 'Spikeball',
  badminton: 'Badminton',
  squash: 'Squash',
  pickleball: 'Pickleball'
}

// Get color for a court based on its sports
export function getCourtColor(sports: SportType[]): string {
  if (sports.length === 0) return '#6B7280' // Gray fallback
  if (sports.length === 1) return sportColors[sports[0]]
  
  // For multi-sport courts, use a mixed color or primary sport
  // For now, just use the first sport's color
  return sportColors[sports[0]]
}

// Create custom Leaflet icon for a sport
export function createSportIcon(sports: SportType[], isSelected = false): L.DivIcon {
  const color = getCourtColor(sports)
  const size = isSelected ? 32 : 24
  const borderColor = isSelected ? '#1F2937' : '#FFFFFF'
  
  return L.divIcon({
    className: 'custom-sport-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border: 2px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        font-weight: bold;
        color: white;
        font-size: ${size > 24 ? '14px' : '12px'};
      ">
        ${sports.length > 1 ? '●●' : '●'}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
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
  return L.divIcon({
    className: 'selected-location-marker',
    html: `
      <div style="
        background-color: #EF4444;
        width: 28px;
        height: 28px;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
        color: white;
        font-weight: bold;
        font-size: 16px;
      ">
        +
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  })
}