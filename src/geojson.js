const depths = { Point: 0, MultiPoint: 1, LineString: 1, MultiLineString: 2, Polygon: 2, MultiPolygon: 3 }

function position(value) {
  if (!Array.isArray(value) || value.length < 2 || !value.every(Number.isFinite) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) throw new Error('Coordonatele trebuie să fie longitudine/latitudine WGS84 (EPSG:4326).')
}
function coordinates(value, depth) {
  if (depth === 0) return position(value)
  if (!Array.isArray(value) || value.length === 0) throw new Error('Geometrie fără coordonate.')
  value.forEach(item => coordinates(item, depth - 1))
}
function geometry(value) {
  if (value === null) return
  if (!value || typeof value !== 'object') throw new Error('Geometrie invalidă.')
  if (value.type === 'GeometryCollection') {
    if (!Array.isArray(value.geometries)) throw new Error('GeometryCollection invalidă.')
    value.geometries.forEach(geometry)
    return
  }
  if (!Object.hasOwn(depths, value.type)) throw new Error('Tip de geometrie necunoscut.')
  coordinates(value.coordinates, depths[value.type])
  const lines = value.type === 'LineString' ? [value.coordinates] : value.type === 'MultiLineString' ? value.coordinates : []
  if (lines.some(line => line.length < 2)) throw new Error('O linie necesită cel puțin două poziții.')
  const polygons = value.type === 'Polygon' ? [value.coordinates] : value.type === 'MultiPolygon' ? value.coordinates : []
  for (const polygon of polygons) for (const ring of polygon) {
    if (ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) throw new Error('Inelele poligoanelor trebuie să fie închise și să aibă cel puțin patru poziții.')
  }
}
export function normalizeGeoJSON(value) {
  if (!value || typeof value !== 'object') throw new Error('Fișierul nu conține un obiect GeoJSON.')
  if (value.crs && !/4326|CRS84/i.test(JSON.stringify(value.crs))) throw new Error('Reproiectează fișierul în WGS84 (EPSG:4326) înainte de import.')
  const features = value.type === 'FeatureCollection' ? value.features : value.type === 'Feature' ? [value] : [{ type: 'Feature', properties: {}, geometry: value }]
  if (!Array.isArray(features)) throw new Error('Lista de obiecte GeoJSON este invalidă.')
  for (const feature of features) {
    if (!feature || feature.type !== 'Feature' || !('geometry' in feature)) throw new Error('Obiect GeoJSON invalid.')
    if (feature.properties !== null && feature.properties !== undefined && (typeof feature.properties !== 'object' || Array.isArray(feature.properties))) throw new Error('Atributele trebuie să fie un obiect.')
    geometry(feature.geometry)
  }
  return { type: 'FeatureCollection', features }
}
export function featureName(feature, index) {
  const p = feature.properties ?? {}
  return String(p.Denumire ?? p.name ?? p.Name ?? p.title ?? feature.id ?? `Obiect ${index + 1}`)
}
