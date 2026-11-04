import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultTahapan, resolveTahapan, pendataanDeadline } from '../lib/tahapan.ts'
import { GET } from '../app/api/tahapan/route.ts'

const date = value => Date.parse(value)
const door = defaultTahapan[3]

test('pendataan remains active through the final day in Jakarta and completes at midnight', () => {
  assert.equal(resolveTahapan(door, date('2026-08-31T16:59:59Z')).status, 'aktif')
  assert.equal(resolveTahapan(door, date('2026-08-31T17:00:00Z')).status, 'selesai')
  assert.equal(pendataanDeadline(defaultTahapan), date('2026-08-31T23:59:59.999+07:00'))
})
test('November schedule completes collection, activates processing, and keeps publication upcoming', () => {
  const items = defaultTahapan.map(t => resolveTahapan(t, date('2026-11-05T12:00:00+07:00')))
  assert.deepEqual(items.map(t => t.status), ['selesai', 'selesai', 'selesai', 'selesai', 'aktif', 'akan-datang'])
})
test('legacy database stages without dates use the matching original schedule', () => {
  const legacy = { ...door, status: 'aktif', start_date: null, end_date: null }
  assert.equal(resolveTahapan(legacy, date('2026-11-05')).status, 'selesai')
})
test('custom dates take priority and an early manual completion is retained', () => {
  const future = { ...door, start_date: '2027-06-01', end_date: '2027-08-31' }
  assert.equal(resolveTahapan(future, date('2026-11-05')).status, 'akan-datang')
  assert.equal(resolveTahapan({ ...future, status: 'selesai' }, date('2027-06-02')).status, 'selesai')
})
test('unknown undated stages retain their manual status instead of borrowing default dates', () => {
  const custom = { ...door, judul: 'Kegiatan Tambahan', start_date: null, end_date: null, status: 'akan-datang' }
  assert.equal(resolveTahapan(custom, date('2026-11-05')).status, 'akan-datang')
})
test('public schedule reads no attachment table and sends an uncacheable response', async t => {
  t.mock.method(Date, 'now', () => date('2026-11-05T12:00:00+07:00'))
  const calls = []
  globalThis.securityTest = { execute: async sql => { calls.push(sql); return [[{ ...door, start_date: null, end_date: null, status: 'aktif' }], []] } }
  const response = await GET()
  const body = await response.json()
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(body.data[0].status, 'selesai')
  assert.equal('akses' in body.data[0], false)
  assert.equal(calls.length, 1)
  assert.ok(!calls[0].includes('tahapan_akses'))
})
