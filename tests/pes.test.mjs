import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { pesPayloadSchema, pesRange, buildPesHistory, percent, dateWib } from '../lib/pes/domain.ts'
import { withPesNavigation } from '../lib/pes/navigation.ts'
import { POST } from '../app/api/se/2026/external/pes/route.ts'
import { GET } from '../app/api/se/2026/public/pes/route.ts'

const row = (extra = {}) => ({ pencacah: 'ppl@example.test', nama_ppl: 'Petugas Uji', nama_pml: 'Pengawas Uji', total: 10, selesai_cacah: 6, selesai_approve: 4, ...extra })
const body = (extra = {}) => ({ snapshot_ts: '2026-11-04T08:00:00+07:00', petugas: [row()], ...extra })
const request = (payload, headers = {}) => new NextRequest('http://localhost/api/se/2026/external/pes', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) })
beforeEach(() => {
  globalThis.securityTest = { calls: [], scopes: ['write:pes'], async execute(sql, args) {
    this.calls.push({ sql, args })
    if (sql.includes('FROM api_token')) return [[{ id: 20261105, label: 'Test', sensus_kode: 'se', tahun: 2026, scopes: JSON.stringify(this.scopes) }], []]
    return [{ affectedRows: 1 }, []]
  }, async getConnection() { throw Object.assign(new Error('private SQL detail'), { code: 'ER_NO_SUCH_TABLE' }) } }
})

test('PES validates assignments, integer counts, names and cumulative bounds', () => {
  assert.equal(pesPayloadSchema.safeParse(body()).success, true)
  for (const invalid of [{ total: -1 }, { draft: 1.5 }, { selesai_cacah: 11 }, { selesai_approve: 7 }, { nama_ppl: 'private@example.test' }]) {
    assert.equal(pesPayloadSchema.safeParse(body({ petugas: [row(invalid)] })).success, false)
  }
  assert.equal(pesPayloadSchema.safeParse(body({ petugas: [row({ total: 0, selesai_cacah: 0, selesai_approve: 0 })] })).success, true)
})

test('PES rejects duplicate source identities, empty batches and regional payload levels', () => {
  for (const invalid of [body({ petugas: [row(), row()] }), body({ petugas: [] }), body({ kecamatan: [] }), body({ snapshot_ts: '20261104_0800' })]) assert.equal(pesPayloadSchema.safeParse(invalid).success, false)
  assert.equal(pesPayloadSchema.safeParse(body({ petugas: [row(), row({ pencacah: 'another-id' })] })).success, true)
})

test('PES uses current target and handles zero target without NaN', () => {
  assert.equal(percent(6, 10), 60)
  assert.equal(percent(6, 20), 30)
  assert.equal(percent(0, 0), 0)
})

test('source timestamps and calendar boundaries follow Asia/Jakarta', () => {
  assert.equal(dateWib(Date.parse('2026-11-04T16:59:59Z')), '2026-11-04')
  assert.equal(dateWib(Date.parse('2026-11-04T17:00:00Z')), '2026-11-05')
  assert.equal(pesPayloadSchema.parse(body()).snapshot_ts, '2026-11-04T01:00:00.000Z')
})

test('PES range is inclusive, defaults to 14 WIB days and rejects invalid or oversized ranges', () => {
  assert.deepEqual(pesRange(new URLSearchParams(), '2026-11-05'), { from: '2026-10-23', to: '2026-11-05' })
  assert.doesNotThrow(() => pesRange(new URLSearchParams('from=2026-08-08&to=2026-11-05'), '2026-11-05'))
  for (const query of ['from=2026-08-07&to=2026-11-05', 'from=2026-11-05&to=2026-11-01', 'from=2026-02-30', 'to=2026-11-06']) assert.throws(() => pesRange(new URLSearchParams(query), '2026-11-05'))
})

test('PES history retains historical targets, marks baseline and gaps, and preserves corrections', () => {
  const points = buildPesHistory([
    { petugas_id: 'a', tanggal: '2026-11-01', total: 10, selesai_cacah: 6, selesai_approve: 4 },
    { petugas_id: 'a', tanggal: '2026-11-02', total: 20, selesai_cacah: 7, selesai_approve: 5 },
    { petugas_id: 'a', tanggal: '2026-11-04', total: 20, selesai_cacah: 5, selesai_approve: 3 },
  ], '2026-11-01', '2026-11-04')
  assert.equal(points[0].baseline_count, 1)
  assert.equal(points[0].delta_cacah, null)
  assert.deepEqual(points.map(p => p.total), [10, 20, 20, 20])
  assert.equal(points[1].delta_cacah, 1)
  assert.equal(points[2].updated_count, 0)
  assert.equal(points[2].delta_cacah, null)
  assert.equal(points[3].delta_cacah, -2)
  assert.equal(points[3].spans_gap, true)
})

test('history uses baseline before requested range and does not invent an increment for new staff', () => {
  const history = buildPesHistory([
    { petugas_id: 'a', tanggal: '2026-10-29', total: 10, selesai_cacah: 3, selesai_approve: 2 },
    { petugas_id: 'a', tanggal: '2026-11-01', total: 10, selesai_cacah: 5, selesai_approve: 3 },
    { petugas_id: 'b', tanggal: '2026-11-02', total: 8, selesai_cacah: 4, selesai_approve: 3 },
  ], '2026-11-01', '2026-11-02')
  assert.equal(history[0].delta_cacah, 2)
  assert.equal(history[1].total, 18)
  assert.equal(history[1].delta_cacah, null)
  assert.equal(history[1].baseline_count, 1)
})

test('PES navigation overlays custom database configuration without duplicates or mutation', () => {
  const config = { sensus_kode: 'se', tahun: 2026, navbar_config: { navLinks: [{ label: 'Beranda', href: '/se/2026' }, { label: 'Progress', href: '/se/2026/progress' }, { label: 'PES lama', href: '/se/2026/pes/' }] }, footer_config: { kolomLinks: [{ judul: 'SE', items: [{ label: 'Progress', href: '/se/2026/progress' }] }] } }
  const original = JSON.stringify(config)
  const result = withPesNavigation(withPesNavigation(config))
  assert.equal(JSON.stringify(config), original)
  assert.deepEqual(result.navbar_config.navLinks.map(l => l.label), ['Beranda', 'Progress', 'PES'])
  assert.equal(result.footer_config.kolomLinks[0].items[1].href, '/se/2026/pes')
  const other = { ...config, tahun: 2036 }
  assert.equal(withPesNavigation(other), other)
})

test('PES writes require a token and do not accept the SE progress scope alone', async () => {
  assert.equal((await POST(request(body()))).status, 401)
  assert.equal(globalThis.securityTest.calls.length, 0)
  globalThis.securityTest.scopes = ['write:progress']
  assert.equal((await POST(request(body(), { Authorization: 'Bearer fake' }))).status, 403)
  assert.equal(globalThis.securityTest.calls.some(c => c.sql.includes('pes_')), false)
})

test('PES rejects invalid, encoded, oversized and future payloads before acquiring a transaction', async () => {
  const auth = { Authorization: 'Bearer fake' }
  assert.equal((await POST(request(body({ petugas: [row({ total: -1 })] }), auth))).status, 400)
  assert.equal((await POST(request(body(), { ...auth, 'content-length': '4194305' }))).status, 413)
  assert.equal((await POST(request(body(), { ...auth, 'content-encoding': 'gzip' }))).status, 415)
  assert.equal((await POST(request(body({ snapshot_ts: '2099-11-05T00:00:00Z' }), auth))).status, 400)
  assert.equal((await POST(request(body(), { ...auth, 'content-type': 'text/plain' }))).status, 415)
  assert.equal((await POST(new NextRequest('http://localhost/api/se/2026/external/pes', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{' }))).status, 400)
})

test('public PES returns an explicit unavailable state without SQL details or private identifiers', async () => {
  const response = await GET(new NextRequest('http://localhost/api/se/2026/public/pes'))
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const text = await response.text()
  assert.equal(text.includes('private SQL'), false)
  assert.equal(text.includes('example.test'), false)
  assert.equal((await GET(new NextRequest('http://localhost/api/se/2026/public/pes?petugas=invalid'))).status, 400)
})
