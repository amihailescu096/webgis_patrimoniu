import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGeoJSON, featureName } from './geojson.js'

test('normalizes a bare geometry and preserves feature attributes', () => {
  assert.equal(normalizeGeoJSON({ type: 'Point', coordinates: [26, 45] }).features.length, 1)
  const feature = { type: 'Feature', geometry: null, properties: { name: '<script>alert(1)</script>' } }
  assert.equal(normalizeGeoJSON(feature).features[0], feature)
  assert.equal(featureName(feature, 0), '<script>alert(1)</script>')
})
test('accepts all supported geometry types and collections', () => {
  const ring = [[26, 45], [27, 45], [27, 46], [26, 45]]
  const geometries = [
    { type: 'Point', coordinates: [26, 45] },
    { type: 'MultiPoint', coordinates: [[26, 45]] },
    { type: 'LineString', coordinates: [[26, 45], [27, 46]] },
    { type: 'MultiLineString', coordinates: [[[26, 45], [27, 46]]] },
    { type: 'Polygon', coordinates: [ring] },
    { type: 'MultiPolygon', coordinates: [[ring]] },
  ]
  for (const geometry of geometries) assert.equal(normalizeGeoJSON(geometry).features[0].geometry, geometry)
  assert.equal(normalizeGeoJSON({ type: 'GeometryCollection', geometries }).features.length, 1)
  assert.equal(normalizeGeoJSON({ type: 'FeatureCollection', features: [] }).features.length, 0)
})
test('rejects invalid input before it reaches Leaflet', () => {
  for (const input of [null, {}, { type: 'FeatureCollection' }, { type: 'Point', coordinates: [500000, 450000] }, { type: 'Point', coordinates: ['26', 45] }, { type: 'LineString', coordinates: [[26, 45]] }, { type: 'Polygon', coordinates: [[[26, 45], [27, 45], [27, 46], [26, 46]]] }, { type: 'Feature', properties: [], geometry: null }, { type: 'Point', coordinates: [26, 45], crs: { properties: { name: 'EPSG:3857' } } }]) assert.throws(() => normalizeGeoJSON(input))
})
