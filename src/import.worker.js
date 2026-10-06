import { normalizeGeoJSON, layerMetadata } from './geojson.js'
self.onmessage = async ({ data: file }) => {
  try {
    const data = normalizeGeoJSON(JSON.parse((await file.text()).replace(/^\uFEFF/, '')))
    self.postMessage({ data, ...layerMetadata(data) })
  } catch (error) { self.postMessage({ error: error.message }) }
}
