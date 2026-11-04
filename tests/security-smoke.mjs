import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'

const listener = createServer()
listener.listen(0, '127.0.0.1')
await once(listener, 'listening')
const port = listener.address().port
await new Promise(done => listener.close(done))
const origin = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [resolve('.next/standalone/server.js')], {
  env: { ...process.env, NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), NEXTAUTH_URL: origin, NEXTAUTH_SECRET: randomBytes(32).toString('base64url') },
  stdio: ['ignore', 'ignore', 'pipe'],
})
let stderr = ''
child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-4000) })
try {
  let ready = false
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${child.exitCode}`)
    try {
      const response = await fetch(`${origin}/api/auth/session`, { signal: AbortSignal.timeout(1000) })
      if (response.status === 200) { ready = true; break }
    } catch { /* Wait until the local server is listening. */ }
    await setTimeout(200)
  }
  assert.ok(ready, 'Standalone server must become ready')
  const cases = [
    ['/', {}, 200],
    ['/api/auth/session', {}, 200],
    ['/api/laporan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, 401],
    ['/api/laporan', { method: 'POST', headers: { Origin: 'https://attacker.example' }, body: '{}' }, 403],
    ['/api/usaha', {}, 401],
    ['/api/admin/import/usaha', { method: 'POST' }, 401],
    ['/api/se/2026/external/fasih', { method: 'POST' }, 401],
    ['/_next/image?url=%2Fimages%2Flogo-bps.png&w=64&q=75', {}, 404],
    ['/se/2026/dashboard', { redirect: 'manual' }, 307],
  ]
  for (const [path, options, status] of cases) {
    const response = await fetch(`${origin}${path}`, { ...options, signal: AbortSignal.timeout(5000) })
    assert.equal(response.status, status, `${options.method ?? 'GET'} ${path}`)
    assert.equal(response.headers.get('x-middleware-set-cookie'), null)
    console.log(`PASS ${options.method ?? 'GET'} ${path}: ${status}`)
    await response.arrayBuffer()
  }
} catch (error) {
  // Test server has no real credentials; omit raw server logs from successful output.
  if (stderr) console.error(stderr)
  throw error
} finally {
  child.kill()
  if (child.exitCode === null) await once(child, 'exit')
}
