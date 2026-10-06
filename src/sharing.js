import { importFile } from './importFile.js'
import { archive, mapFiles } from './publication.js'
export async function loadMap() {
  const base = new URL(`${import.meta.env.BASE_URL}data/`, window.location.origin)
  const response = await fetch(new URL('map.json', base), { cache: 'no-store' })
  if (!response.ok) throw new Error('Configurația publicată nu este disponibilă.')
  const map = await response.json()
  if (map.version !== 1 || !Array.isArray(map.layers)) throw new Error('Configurație de hartă invalidă.')
  const layers = []
  for (const layer of map.layers) {
    if (!Array.isArray(layer.files) || !layer.files.length) throw new Error('Strat fără fișiere de date.')
    const chunks = []
    for (const file of layer.files) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(file)) throw new Error('Nume de fișier invalid.')
      const part = await fetch(new URL(file, base))
      if (!part.ok) throw new Error(`Nu s-a putut încărca stratul ${layer.name}.`)
      chunks.push(await part.blob())
    }
    const imported = await importFile(new File(chunks, 'layer.geojson'))
    layers.push({ ...imported, ...layer })
  }
  return { ...map, layers }
}
export async function exportMap(title, basemap, layers) {
  const files = await mapFiles(title, basemap, layers)
  const url = URL.createObjectURL(archive(files))
  const link = document.createElement('a')
  link.href = url
  link.download = 'harta-pentru-github.zip'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
