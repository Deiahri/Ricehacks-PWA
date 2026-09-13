import type { LayerSpecification, StyleSpecification } from 'maplibre-gl'

// OpenFreeMap: free vector tiles, no API key. We fetch its "liberty" style and repaint it in the
// Pokémon-Go-ish palette the old hand-drawn map used (teal roads on green, bright water, sky horizon).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const C = {
  ground: '#48c878',
  landuse: '#44c07c',
  grass: '#46c878',
  wood: '#3db85a',
  // Blocks of homes and campuses a paler, warmer green so the ground isn't one flat colour.
  residential: '#8fd3a0',
  campus: '#b9dfa6',
  water: '#2aa8c8',
  road: '#2a7a68',
  path: '#5ad08e',
  casing: 'rgba(255,255,255,0.18)',
  // Buildings stand out in warm cream with terracotta edges; taller ones get sandier (see fill-extrusion).
  building: '#f3e3c3',
  buildingEdge: '#c9825b',
  buildingLow: '#f6e8cc',
  buildingTall: '#e6c99a',
  label: '#ffffff',
  halo: '#1f6352',
}

// Clutter that doesn't fit the game look.
const DROP = /^(natural_earth|poi_|road_one_way|highway-shield|road_shield|airport|boundary|aeroway|road_area_pattern)|_hatching$|rail/
// The only text we keep: street and water names.
const KEEP_SYMBOL = /^(highway-name|water_name|waterway_line_label)/

type Paint = Record<string, unknown>

function restyle(layer: LayerSpecification): LayerSpecification | null {
  const { id } = layer
  if (DROP.test(id)) return null
  if (layer.type === 'symbol' && !KEEP_SYMBOL.test(id)) return null
  if (layer.type === 'raster' || layer.type === 'hillshade') return null

  const paint: Paint = { ...((layer as { paint?: Paint }).paint ?? {}) }
  switch (layer.type) {
    case 'background':
      paint['background-color'] = C.ground
      break
    case 'fill':
      delete paint['fill-pattern']
      if (/water/.test(id)) paint['fill-color'] = C.water
      else if (id === 'building') {
        paint['fill-color'] = C.building
        paint['fill-outline-color'] = C.buildingEdge
      } else if (/wood/.test(id)) paint['fill-color'] = C.wood
      else if (/park|grass|pitch|wetland|cemetery|track/.test(id)) paint['fill-color'] = C.grass
      else if (/residential/.test(id)) paint['fill-color'] = C.residential
      else if (/school|hospital/.test(id)) paint['fill-color'] = C.campus
      else paint['fill-color'] = C.landuse
      break
    case 'fill-extrusion':
      paint['fill-extrusion-color'] = [
        'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0],
        0, C.buildingLow,
        40, C.buildingTall,
      ]
      paint['fill-extrusion-opacity'] = 0.9
      break
    case 'line':
      if (/water/.test(id)) paint['line-color'] = C.water
      else if (/casing/.test(id)) paint['line-color'] = C.casing
      else if (/path|pedestrian/.test(id)) paint['line-color'] = C.path
      else if (/^(road|bridge|tunnel)_/.test(id)) paint['line-color'] = C.road
      else if (id === 'park_outline') paint['line-color'] = C.wood
      break
    case 'symbol':
      paint['text-color'] = C.label
      paint['text-halo-color'] = C.halo
      paint['text-halo-width'] = 1.5
      break
  }
  return { ...layer, paint } as LayerSpecification
}

export async function loadStylizedStyle(): Promise<StyleSpecification> {
  const res = await fetch(STYLE_URL)
  if (!res.ok) throw new Error(`map style HTTP ${res.status}`)
  const style = (await res.json()) as StyleSpecification
  return {
    ...style,
    layers: style.layers.map(restyle).filter((l): l is LayerSpecification => l !== null),
    // Visible when the camera is tilted far enough to see the horizon.
    sky: {
      'sky-color': '#b8eaf4',
      'horizon-color': '#7dd4e8',
      'fog-color': '#9ee8f0',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.4,
      'atmosphere-blend': 0,
    },
  }
}
