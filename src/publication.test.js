import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapFiles, archive } from './publication.js'
test('export preserves Unicode and labels across byte chunks', async () => {
  const data = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { LMI: 'BZ-II-m-ă😀' }, geometry: { type: 'Point', coordinates: [26, 45] } }] }
  const files = await mapFiles('Hartă', 'streets', [{ id: 'a', name: 'Strat', color: '#3979d5', visible: true, labelField: 'LMI', data }], 7)
  const manifest = JSON.parse(new TextDecoder().decode(files.at(-1).bytes))
  assert.equal(manifest.layers[0].labelField, 'LMI')
  assert.ok(files.slice(0, -1).every(file => file.bytes.length <= 7))
  const recovered = await new Blob(files.slice(0, -1).map(file => file.bytes)).text()
  assert.deepEqual(JSON.parse(recovered), data)
  const zip = new Uint8Array(await archive(files).arrayBuffer())
  assert.equal(new DataView(zip.buffer).getUint32(0, true), 0x04034b50)
})
