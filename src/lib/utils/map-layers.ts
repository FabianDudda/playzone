import L from 'leaflet'

export interface MapLayer {
  id: string
  name: string
  url: string
  attribution: string
  maxZoom?: number
  subdomains?: string[]
}

// Available map layer configurations
export const MAP_LAYERS: Record<string, MapLayer> = {
  light: {
    id: 'light',
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd'
  },
  dark: {
    id: 'dark', 
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd'
  },
  street: {
    id: 'street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    subdomains: [] // Esri doesn't use subdomains
  }
}

// Default layer (clean, professional look)
export const DEFAULT_LAYER_ID = 'light'

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