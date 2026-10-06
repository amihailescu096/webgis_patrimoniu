// Uncompressed ZIP: each exported data part stays below GitHub's browser upload limit.
const encoder = new TextEncoder()
export async function mapFiles(title, basemap, layers, chunkSize = 20 * 1024 * 1024) {
  const files = []
  const manifest = { version: 1, title, basemap, layers: [] }
  for (const [index, layer] of layers.entries()) {
    const blob = new Blob([JSON.stringify(layer.data)])
    const names = []
    for (let offset = 0, part = 1; offset < blob.size; offset += chunkSize, part++) {
      const name = `layer-${index + 1}-${part}.part`
      names.push(name)
      files.push({ name: `public/data/${name}`, bytes: new Uint8Array(await blob.slice(offset, offset + chunkSize).arrayBuffer()) })
    }
    const { id, name, color, visible, labelField } = layer
    manifest.layers.push({ id, name, color, visible, labelField, files: names })
  }
  files.push({ name: 'public/data/map.json', bytes: encoder.encode(JSON.stringify(manifest, null, 2)) })
  return files
}
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
export function archive(files) {
  const body = [], directory = []
  let offset = 0, directorySize = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.bytes)
    const header = new Uint8Array(30 + name.length)
    const local = new DataView(header.buffer)
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true)
    local.setUint32(14, crc, true); local.setUint32(18, file.bytes.length, true); local.setUint32(22, file.bytes.length, true)
    local.setUint16(26, name.length, true); header.set(name, 30)
    body.push(header, file.bytes)
    const central = new Uint8Array(46 + name.length)
    const view = new DataView(central.buffer)
    view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true)
    view.setUint32(16, crc, true); view.setUint32(20, file.bytes.length, true); view.setUint32(24, file.bytes.length, true)
    view.setUint16(28, name.length, true); view.setUint32(42, offset, true); central.set(name, 46)
    directory.push(central); directorySize += central.length; offset += header.length + file.bytes.length
  }
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true)
  view.setUint32(12, directorySize, true); view.setUint32(16, offset, true)
  return new Blob([...body, ...directory, end], { type: 'application/zip' })
}
