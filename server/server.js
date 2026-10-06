import http from 'node:http'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { normalizeGeoJSON } from '../src/geojson.js'

const idPattern = /^[a-f0-9-]{36}$/
const maxLayerBytes = 150 * 1024 * 1024
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
function matches(password, hash) {
  const [salt, key] = hash.split(':')
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(key, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
function fail(status, message) { const error = new Error(message); error.status = status; throw error }
async function body(req, limit) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Se acceptă doar JSON.')
  if (Number(req.headers['content-length']) > limit) fail(413, 'Fișierul depășește limita permisă.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) fail(413, 'Fișierul depășește limita permisă.')
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { fail(400, 'JSON invalid.') }
}
async function atomic(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 })
  await rename(temporary, file)
}
export async function createApp({ dataDir, distDir, ownerHash, publicOrigin, secureCookies = true }) {
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(ownerHash ?? '')) throw new Error('Configurează OWNER_PASSWORD_HASH înainte de pornire.')
  const origin = new URL(publicOrigin).origin
  if (secureCookies && !origin.startsWith('https:')) throw new Error('În producție, PUBLIC_ORIGIN trebuie să folosească HTTPS.')
  await mkdir(path.join(dataDir, 'layers'), { recursive: true, mode: 0o700 })
  const manifestFile = path.join(dataDir, 'map.json')
  let manifest
  try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
    manifest = { id: randomUUID(), revision: 0, title: 'Harta mea', basemap: 'streets', layers: [] }
    await atomic(manifestFile, manifest)
  }
  const sessions = new Map()
  const attempts = new Map()
  let saving = false
  function owner(req) {
    const token = /(?:^|;\s*)map_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1]
    const expiry = sessions.get(token)
    if (expiry && expiry > Date.now()) return token
    if (token) sessions.delete(token)
    return null
  }
  function cookie(token, maxAge) { return `map_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}` }
  function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    const url = new URL(req.url, origin)
    const route = url.pathname
    try {
      if (route.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method)) {
        if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Originea cererii nu este permisă.')
      }
      if (req.method === 'GET' && route === '/api/session') return json(res, 200, { owner: !!owner(req), mapId: owner(req) ? manifest.id : null })
      if (req.method === 'POST' && route === '/api/login') {
        const ip = req.socket.remoteAddress
        const now = Date.now()
        for (const [key, attempt] of attempts) if (attempt.until <= now) attempts.delete(key)
        const attempt = attempts.get(ip) ?? { count: 0, until: now + 15 * 60 * 1000 }
        if (attempt.count >= 5) fail(429, 'Prea multe încercări. Reîncearcă peste 15 minute.')
        const input = await body(req, 4096)
        attempt.count++; attempts.set(ip, attempt)
        if (!input || typeof input.password !== 'string' || input.password.length > 1024 || !matches(input.password, ownerHash)) fail(401, 'Parolă incorectă.')
        attempts.delete(ip)
        for (const [token, expiry] of sessions) if (expiry <= now) sessions.delete(token)
        const token = randomBytes(32).toString('hex')
        sessions.set(token, now + 12 * 60 * 60 * 1000)
        res.setHeader('Set-Cookie', cookie(token, 43200))
        return json(res, 200, { owner: true, mapId: manifest.id })
      }
      if (req.method === 'POST' && route === '/api/logout') {
        sessions.delete(owner(req)); res.setHeader('Set-Cookie', cookie('', 0))
        return json(res, 200, { owner: false })
      }
      if (req.method === 'GET' && route === `/api/maps/${manifest.id}`) return json(res, 200, manifest)
      if (req.method === 'GET' && route.startsWith('/api/layers/')) {
        const id = route.slice('/api/layers/'.length)
        if (!idPattern.test(id) || (!owner(req) && !manifest.layers.some(layer => layer.blobId === id))) fail(404, 'Stratul nu există.')
        const file = path.join(dataDir, 'layers', `${id}.json`)
        const info = await stat(file)
        res.writeHead(200, { 'Content-Type': 'application/geo+json', 'Content-Length': info.size, 'Cache-Control': 'no-store' })
        createReadStream(file).on('error', () => res.destroy()).pipe(res)
        return
      }
      if (req.method === 'POST' && route === '/api/layers') {
        if (!owner(req)) fail(401, 'Autentificarea administratorului este obligatorie.')
        const input = await body(req, maxLayerBytes)
        let data
        try { data = normalizeGeoJSON(input) } catch (error) { fail(400, error.message) }
        const id = randomUUID()
        await atomic(path.join(dataDir, 'layers', `${id}.json`), data)
        return json(res, 201, { blobId: id })
      }
      if (req.method === 'PUT' && route === `/api/maps/${manifest.id}`) {
        if (!owner(req)) fail(401, 'Autentificarea administratorului este obligatorie.')
        if (saving) fail(409, 'O altă salvare este în curs. Reîncearcă.')
        saving = true
        try {
          const input = await body(req, 1024 * 1024)
          if (!input || typeof input !== 'object') fail(400, 'Configurație invalidă.')
          if (input.revision !== manifest.revision) fail(409, 'Harta a fost actualizată din altă sesiune. Reîncarcă înainte de salvare.')
          if (typeof input.title !== 'string' || input.title.length > 200 || !['streets', 'satellite'].includes(input.basemap) || !Array.isArray(input.layers) || input.layers.length > 100) fail(400, 'Configurație invalidă.')
          const layers = []
          const ids = new Set()
          for (const layer of input.layers) {
            if (!layer || !idPattern.test(layer.id) || !idPattern.test(layer.blobId) || ids.has(layer.id) || typeof layer.name !== 'string' || layer.name.length > 200 || typeof layer.labelField !== 'string' || layer.labelField.length > 1000 || !/^#[0-9a-f]{6}$/i.test(layer.color) || typeof layer.visible !== 'boolean') fail(400, 'Strat invalid.')
            ids.add(layer.id)
            await stat(path.join(dataDir, 'layers', `${layer.blobId}.json`))
            layers.push({ id: layer.id, blobId: layer.blobId, name: layer.name, labelField: layer.labelField, color: layer.color, visible: layer.visible })
          }
          const next = { id: manifest.id, revision: manifest.revision + 1, title: input.title, basemap: input.basemap, layers }
          await atomic(manifestFile, next)
          manifest = next
          return json(res, 200, manifest)
        } finally { saving = false }
      }
      if (route.startsWith('/api/')) fail(404, 'Resursa nu există.')
      if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Metodă nepermisă.')
      const relative = decodeURIComponent(route).replace(/^\/+/, '')
      let file = path.resolve(distDir, relative || 'index.html')
      if (file !== path.resolve(distDir) && !file.startsWith(path.resolve(distDir) + path.sep)) fail(404, 'Resursa nu există.')
      let info
      try { info = await stat(file) } catch { file = path.join(distDir, 'index.html'); info = await stat(file) }
      if (!info.isFile()) fail(404, 'Resursa nu există.')
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size })
      if (req.method === 'HEAD') res.end()
      else createReadStream(file).on('error', () => res.destroy()).pipe(res)
    } catch (error) {
      if (res.headersSent) return res.destroy()
      json(res, error.status ?? (error.code === 'ENOENT' ? 404 : 500), { error: error.status ? error.message : error.code === 'ENOENT' ? 'Resursa nu există.' : 'Eroare de server.' })
    }
  })
  server.requestTimeout = 10 * 60 * 1000
  return server
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createApp({ dataDir: path.resolve(process.env.DATA_DIR ?? 'storage'), distDir: path.resolve('dist'), ownerHash: process.env.OWNER_PASSWORD_HASH, publicOrigin: process.env.PUBLIC_ORIGIN ?? 'http://localhost:3001', secureCookies: process.env.NODE_ENV === 'production' })
  server.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () => console.log('Map server ready'))
}
