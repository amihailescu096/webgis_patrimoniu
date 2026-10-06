import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApp, passwordHash } from './server.js'

const password = 'test-only-password-1234'
const point = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { Cod_LMI: 'BZ-1' }, geometry: { type: 'Point', coordinates: [26, 45] } }] }
test('only the owner can publish, public reads survive restart, and stale writes are rejected', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'map-test-'))
  let server
  let base
  async function start() {
    server = await createApp({ dataDir: dir, distDir: path.resolve('dist'), ownerHash: passwordHash(password), publicOrigin: 'http://localhost', secureCookies: false })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
  }
  async function request(route, method = 'GET', data, cookie, origin = 'http://localhost') {
    return fetch(base + route, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) })
  }
  try {
    await start()
    assert.equal((await request('/api/layers', 'POST', point)).status, 401)
    assert.equal((await request('/api/login', 'POST', { password }, null, 'http://attacker.example')).status, 403)
    assert.equal((await request('/api/login', 'POST', { password: 'wrong' })).status, 401)
    const login = await request('/api/login', 'POST', { password })
    assert.equal(login.status, 200)
    const cookie = login.headers.get('set-cookie').split(';')[0]
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
    const { mapId } = await login.json()
    assert.equal((await request(`/api/maps/${mapId}`, 'PUT', {}, null)).status, 401)
    const upload = await request('/api/layers', 'POST', point, cookie)
    const { blobId } = await upload.json()
    assert.equal((await request(`/api/layers/${blobId}`)).status, 404)
    const manifest = { revision: 0, title: 'Harta publicată', basemap: 'streets', layers: [{ id: blobId, blobId, name: 'Monumente', labelField: 'Cod_LMI', color: '#3979d5', visible: true }] }
    assert.equal((await request(`/api/maps/${mapId}`, 'PUT', manifest, cookie)).status, 200)
    assert.equal((await request(`/api/maps/${mapId}`, 'PUT', manifest, cookie)).status, 409)
    assert.equal((await request(`/api/layers/${blobId}`)).status, 200)
    assert.deepEqual(await (await request(`/api/layers/${blobId}`)).json(), point)
    assert.equal((await request('/api/layers', 'POST', { type: 'Point', coordinates: [999, 999] }, cookie)).status, 400)
    await new Promise(resolve => server.close(resolve))
    await start()
    const saved = await (await request(`/api/maps/${mapId}`)).json()
    assert.equal(saved.revision, 1)
    assert.equal(saved.layers[0].labelField, 'Cod_LMI')
    assert.equal((await request('/api/session', 'GET', null, cookie)).status, 200)
    assert.equal((await (await request('/api/session', 'GET', null, cookie)).json()).owner, false)
    assert.equal((await request(`/api/layers/${blobId}`)).status, 200)
    const relogin = await request('/api/login', 'POST', { password })
    const nextCookie = relogin.headers.get('set-cookie').split(';')[0]
    assert.equal((await request(`/api/maps/${mapId}`, 'PUT', { ...saved, layers: [] }, nextCookie)).status, 200)
    assert.equal((await request(`/api/layers/${blobId}`)).status, 404)
    await request('/api/logout', 'POST', {}, nextCookie)
    assert.equal((await request('/api/layers', 'POST', point, nextCookie)).status, 401)
  } finally {
    if (server?.listening) await new Promise(resolve => server.close(resolve))
    await rm(dir, { recursive: true, force: true })
  }
})
test('password hashes use separate salts and production rejects an HTTP origin', async () => {
  assert.notEqual(passwordHash(password), passwordHash(password))
  await assert.rejects(createApp({ dataDir: '/unused', distDir: '/unused', ownerHash: passwordHash(password), publicOrigin: 'http://example.com' }), /HTTPS/)
})
