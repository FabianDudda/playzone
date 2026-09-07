import L from 'leaflet'

export interface MapLayer {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
  subdomains?: string[]
}

// CARTO basemaps now require an API key (https://carto.com/basemaps/apikey/).
// Inlined at build time by Next.js since it is a NEXT_PUBLIC_ variable.
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY

// Append the CARTO key to a raster tile URL. Falls back to the bare URL if the
// key is missing (tiles will render with an "API key required" watermark).
function withCartoKey(url: string): string {
  if (!CARTO_API_KEY) {
    if (typeof window !== 'undefined') {
      console.warn('NEXT_PUBLIC_CARTO_API_KEY is not set - CARTO basemaps will be watermarked')
    }
    return url
  }
  return `${url}?key=${CARTO_API_KEY}`
}

const CARTO_ATTRIBUTION =
  ' &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Available map layer configurations
export const MAP_LAYERS: Record<string, MapLayer> = {
  light: {
    id: 'light',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: ' &copy; <a href="https://www.esri.com/en-us/legal/copyright-trademarks">Esri</a>',
    maxZoom: 19,
  },
  dark: {
    id: 'dark', 
    name: 'Dark',
    url: withCartoKey('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abcd'
  },
  street: {
    id: 'street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: ' &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    subdomains: 'abc'
  },
  voyager: {
    id: 'voyager',
    name: 'Voyager',
    url: withCartoKey('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abcd'
  }
}

// Default layer (clean, professional look)
export const DEFAULT_LAYER_ID = 'voyager'

// Create Leaflet TileLayer from configuration
export function createTileLayer(layerConfig: MapLayer): L.TileLayer {
  const options: any = {
    attribution: layerConfig.attribution,
    maxZoom: layerConfig.maxZoom || 18,
  }
  
  // Only add subdomains if they are defined and not empty
  if (layerConfig.subdomains !== undefined && layerConfig.subdomains.length > 0) {
    options.subdomains = layerConfig.subdomains
  }
  
  return L.tileLayer(layerConfig.url, options)
}

// Get user's preferred layer from localStorage
export function getSavedLayerPreference(): string {
  if (typeof window === 'undefined') return DEFAULT_LAYER_ID
  return localStorage.getItem('preferred-map-layer') || DEFAULT_LAYER_ID
}

// Save user's layer preference to localStorage
export function saveLayerPreference(layerId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('preferred-map-layer', layerId)
}

// CSS filter configurations for future enhancement (Option 3)
export interface MapFilter {
  brightness: number
  contrast: number  
  saturation: number
  hue: number
}

export const DEFAULT_FILTERS: MapFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0
}

// Apply CSS filters to map container (prepared for Option 3)
export function applyMapFilters(mapContainer: HTMLElement, filters: MapFilter): void {
  const filterString = `
    brightness(${filters.brightness}%)
    contrast(${filters.contrast}%)
    saturate(${filters.saturation}%)
    hue-rotate(${filters.hue}deg)
  `.trim()
  
  mapContainer.style.filter = filterString
}