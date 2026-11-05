// Explicit disposable database only. Never loads application .env files.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import mysql from 'mysql2/promise'
import { NextRequest } from 'next/server'
import { pesPayloadSchema } from '../lib/pes/domain.ts'
import { ingestPes, readPes, PesConflict } from '../lib/pes/store.ts'
import { POST } from '../app/api/se/2026/external/pes/route.ts'
import { GET } from '../app/api/se/2026/public/pes/route.ts'

if (!/^\d+$/.test(process.env.PES_TEST_MYSQL_PORT || '')) throw new Error('Set PES_TEST_MYSQL_PORT for the disposable loopback MySQL test container')
const pool = mysql.createPool({ host: '127.0.0.1', port: Number(process.env.PES_TEST_MYSQL_PORT), user: 'root', password: '', database: 'simonsen_pes_test', connectionLimit: 4 })
const token = 'pes-integration-local-only'
const row = (key = 'a', extra = {}) => ({ pencacah: `${key}@example.test`, nama_ppl: 'Nama Sama', nama_pml: 'Pengawas A', total: 10, selesai_cacah: 6, selesai_approve: 4, ...extra })
const payload = (time, rows) => pesPayloadSchema.parse({ snapshot_ts: `2026-11-${time}`, petugas: rows })
const range = { from: '2026-11-01', to: '2026-11-05' }
async function reset() {
  await pool.query('DELETE FROM pes_petugas_harian')
  await pool.query('DELETE FROM pes_petugas')
  await pool.query('DELETE FROM pes_snapshot')
}
before(async () => {
  const sql = readFileSync(new URL('../db/migrations/2026_se2026_pes.sql', import.meta.url), 'utf8').split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  for (let round = 0; round < 2; round++) for (const part of sql.split(/;\s*(?:\r?\n|$)/).filter(s => s.trim())) await pool.query(part)
  await pool.query('CREATE TABLE IF NOT EXISTS fasih_petugas (id INT PRIMARY KEY, marker VARCHAR(20))')
  await pool.query("INSERT INTO fasih_petugas VALUES (1, 'unchanged') ON DUPLICATE KEY UPDATE marker = 'unchanged'")
  await pool.query('CREATE TABLE IF NOT EXISTS api_token (id INT PRIMARY KEY, label VARCHAR(100), token_hash CHAR(64) UNIQUE, sensus_kode VARCHAR(5), tahun INT, scopes JSON, expires_at DATETIME NULL, revoked_at DATETIME NULL, last_used_at DATETIME NULL)')
  await pool.query('CREATE TABLE IF NOT EXISTS api_audit_log (id INT AUTO_INCREMENT PRIMARY KEY, token_id INT NULL, sensus_kode VARCHAR(5), tahun INT, method VARCHAR(10), path VARCHAR(255), status INT, ip VARCHAR(100), user_agent VARCHAR(300), request_summary JSON NULL, duration_ms INT NULL)')
  await pool.execute("INSERT INTO api_token (id, label, token_hash, sensus_kode, tahun, scopes) VALUES (1, 'Test only', ?, 'se', 2026, ?) ON DUPLICATE KEY UPDATE scopes = VALUES(scopes)", [createHash('sha256').update(token).digest('hex'), JSON.stringify(['write:pes'])])
  globalThis.securityTest = { execute: (...args) => pool.execute(...args), getConnection: () => pool.getConnection() }
})
after(async () => { await pool.end() })

test('MySQL migration is repeatable, source identity is private and duplicate names remain separate', async () => {
  await reset()
  await ingestPes(pool, payload('01T10:00:00+07:00', [row(), row('b')]), 1)
  const result = await readPes(pool, range)
  assert.equal(result.petugas.length, 2)
  assert.notEqual(result.petugas[0].id, result.petugas[1].id)
  assert.equal(result.summary.total, 20)
  assert.equal(JSON.stringify(result).includes('@example.test'), false)
  assert.equal(JSON.stringify(result).includes('source_key'), false)
  const [sentinel] = await pool.query('SELECT marker FROM fasih_petugas WHERE id = 1')
  assert.equal(sentinel[0].marker, 'unchanged')
})

test('concurrent identical pushes are idempotent across snapshot, current and daily tables', async () => {
  await reset()
  const data = payload('01T10:00:00+07:00', [row()])
  const results = await Promise.all([ingestPes(pool, data, 1), ingestPes(pool, data, 1)])
  assert.equal(results.filter(r => r.duplicate).length, 1)
  for (const table of ['pes_snapshot', 'pes_petugas', 'pes_petugas_harian']) {
    const [counts] = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`)
    assert.equal(counts[0].n, 1)
  }
})

test('target growth updates the current denominator and preserves the prior day target', async () => {
  await reset()
  await ingestPes(pool, payload('01T10:00:00+07:00', [row()]), 1)
  await ingestPes(pool, payload('02T10:00:00+07:00', [row('a', { total: 20 })]), 1)
  const result = await readPes(pool, range)
  assert.equal(result.petugas[0].pct_cacah, 30)
  assert.equal(result.history[0].total, 10)
  assert.equal(result.history[1].total, 20)
  assert.equal(result.history[1].delta_cacah, 0)
})

test('a stale row rolls back earlier row updates and snapshot metadata in the same transaction', async () => {
  await reset()
  await ingestPes(pool, payload('01T10:00:00+07:00', [row()]), 1)
  await ingestPes(pool, payload('04T10:00:00+07:00', [row('b')]), 1)
  await assert.rejects(ingestPes(pool, payload('03T10:00:00+07:00', [row('a', { selesai_cacah: 8 }), row('b')]), 1), PesConflict)
  const result = await readPes(pool, range)
  assert.equal(result.summary.selesai_cacah, 12)
  const [snapshots] = await pool.query('SELECT COUNT(*) AS n FROM pes_snapshot')
  assert.equal(snapshots[0].n, 2)
  const [days] = await pool.query("SELECT COUNT(*) AS n FROM pes_petugas_harian WHERE tanggal='2026-11-03'")
  assert.equal(days[0].n, 0)
})

test('the same timestamp with different counts conflicts; latest daily source wins within a WIB day', async () => {
  await reset()
  await ingestPes(pool, payload('01T10:00:00+07:00', [row()]), 1)
  await assert.rejects(ingestPes(pool, payload('01T10:00:00+07:00', [row('a', { total: 20 })]), 1), PesConflict)
  await ingestPes(pool, payload('01T23:59:59+07:00', [row('a', { total: 20 })]), 1)
  const result = await readPes(pool, range)
  assert.equal(result.history[0].total, 20)
  const [days] = await pool.query('SELECT COUNT(*) AS n FROM pes_petugas_harian')
  assert.equal(days[0].n, 1)
})

test('assignment transfer and negative corrections stay visible without overwriting unchanged staff', async () => {
  await reset()
  await ingestPes(pool, payload('01T10:00:00+07:00', [row(), row('b')]), 1)
  await ingestPes(pool, payload('03T00:00:00+07:00', [row('a', { total: 0, selesai_cacah: 0, selesai_approve: 0 }), row('b', { total: 20, selesai_cacah: 12, selesai_approve: 8 })]), 1)
  await ingestPes(pool, payload('04T10:00:00+07:00', [row('b', { total: 20, selesai_cacah: 10, selesai_approve: 7 })]), 1)
  const all = await readPes(pool, range)
  const first = all.petugas.find(p => p.total === 0)
  assert.equal(all.summary.total, 20)
  assert.equal(all.history[3].delta_cacah, -2)
  const individual = await readPes(pool, range, { petugas: first.id })
  assert.equal(individual.history[2].delta_cacah, -6)
  assert.equal(individual.history[1].delta_cacah, null)
  assert.equal(individual.history[2].spans_gap, true)
})

test('API writes validate scopes and audit success; public filters and history share the same selection', async () => {
  await reset()
  const response = await POST(new NextRequest('http://localhost/api/se/2026/external/pes', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload('01T10:00:00+07:00', [row(), row('b', { nama_ppl: 'Petugas B', nama_pml: 'Pengawas B', total: 20 })])) }))
  assert.equal(response.status, 200)
  const result = await GET(new NextRequest('http://localhost/api/se/2026/public/pes?pengawas=Pengawas%20B&from=2026-11-01&to=2026-11-05'))
  assert.equal(result.status, 200)
  const body = await result.json()
  assert.equal(body.petugas.length, 1)
  assert.equal(body.options.length, 2)
  assert.equal(body.summary.total, 20)
  assert.equal(body.history[0].total, 20)
  assert.equal(JSON.stringify(body).includes('@example.test'), false)
  const [logs] = await pool.query("SELECT status FROM api_audit_log WHERE path = '/api/se/2026/external/pes' ORDER BY id DESC LIMIT 1")
  assert.equal(logs[0].status, 200)
})
