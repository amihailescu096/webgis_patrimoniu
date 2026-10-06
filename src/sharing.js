import { importFile } from './importFile.js'
export async function api(route, options = {}) {
  const response = await fetch(`/api${route}`, { credentials: 'same-origin', ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Cererea a eșuat.')
  return data
}
export async function loadMap(id) {
  const map = await api(`/maps/${encodeURIComponent(id)}`)
  const layers = []
  for (const layer of map.layers) {
    const response = await fetch(`/api/layers/${layer.blobId}`)
    if (!response.ok) throw new Error(`Nu s-a putut încărca stratul ${layer.name}.`)
    const blob = await response.blob()
    const imported = await importFile(new File([blob], 'layer.geojson'))
    layers.push({ ...imported, ...layer })
  }
  return { ...map, layers }
}
export async function saveMap(id, revision, title, basemap, layers) {
  const saved = []
  for (const layer of layers) {
    const blobId = layer.blobId ?? (await api('/layers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(layer.data) })).blobId
    saved.push({ id: layer.id, blobId, name: layer.name, color: layer.color, visible: layer.visible, labelField: layer.labelField })
  }
  return api(`/maps/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, title, basemap, layers: saved }) })
}
