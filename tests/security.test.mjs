import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import sharp from 'sharp'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readBody, readJson, RequestBodyError } from '../lib/request-body.ts'
import { readExcelUpload, validateWorkbookArchive } from '../lib/excel/upload.ts'
import { parseUsahaBuffer } from '../lib/excel/parseUsaha.ts'
import { parseProgressBuffer } from '../lib/excel/parseProgress.ts'
import { bootstrapPassword } from '../scripts/bootstrap-password.mjs'
import { buildKecamatanTooltipHtml } from '../components/KecamatanTooltip.tsx'
import { requireRole } from '../lib/auth-guard.ts'
import { csvEscape } from '../lib/csv.ts'
import { POST as laporan } from '../app/api/laporan/route.ts'
import { GET as usaha } from '../app/api/usaha/route.ts'
import { POST as uploadImage } from '../app/api/admin/upload/route.ts'

beforeEach(() => {
  globalThis.securityTest = {
    session: { user: { id: '7', role: 'admin' } },
    user: { id: 7, nip: 'tester', nama: 'Tester', role: 'admin', kdkec: '1605030' },
    calls: [],
    async execute(sql, args) {
      this.calls.push({ sql, args })
      if (sql.includes('FROM users WHERE id')) return [this.user ? [this.user] : [], []]
      if (sql.startsWith('SELECT 1 FROM desa')) return [[{ ok: 1 }], []]
      return [{ affectedRows: 1 }, []]
    },
  }
})
const request = (body, headers = {}) => new NextRequest('https://portal.example/api/laporan', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
})
const validReport = { tanggal: '2026-11-04', kecamatan: 'Muara Beliti', desa: 'Desa', blok_sensus: '001', usaha_dicacah: 2 }
const rejectsStatus = status => error => error instanceof RequestBodyError && error.status === status

test('stream limit counts bytes without Content-Length and rejects a false small length', async () => {
  for (const headers of [{}, { 'content-length': '1' }]) {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(4)); controller.close() } })
    await assert.rejects(readBody(new Request('https://portal.example', { method: 'POST', body, duplex: 'half', headers }), 7), rejectsStatus(413))
  }
  assert.equal((await readBody(new Request('https://portal.example', { method: 'POST', body: '1234567' }), 7)).length, 7)
})
test('encoded bodies and malformed JSON are rejected', async () => {
  await assert.rejects(readBody(request({}, { 'content-encoding': 'br' }), 100), rejectsStatus(415))
  await assert.rejects(readJson(new Request('https://portal.example', { method: 'POST', body: '{' })), rejectsStatus(400))
})
test('bootstrap requires an explicit password within bcrypt byte limits', () => {
  for (const env of [{}, { BOOTSTRAP_ADMIN_PASSWORD: 'short' }, { BOOTSTRAP_ADMIN_PASSWORD: 'é'.repeat(37) }]) assert.throws(() => bootstrapPassword(env))
  assert.equal(bootstrapPassword({ BOOTSTRAP_ADMIN_PASSWORD: 'test-password-123' }), 'test-password-123')
})
test('authorization uses current account role and rejects deleted accounts', async () => {
  globalThis.securityTest.user.role = 'petugas'
  assert.equal((await requireRole(['admin'])).status, 403)
  globalThis.securityTest.user = null
  assert.equal((await requireRole('auth')).status, 401)
})
test('session mutations reject another origin before any database work', async () => {
  assert.equal((await laporan(request(validReport, { origin: 'https://attacker.example' }))).status, 403)
  assert.equal(globalThis.securityTest.calls.length, 0)
})
test('every admin mutation rejects cross-origin requests before database work', async () => {
  const root = resolve(import.meta.dirname, '../app/api/admin')
  const files = readdirSync(root, { recursive: true }).filter(file => file.endsWith('route.ts'))
  let handlers = 0
  for (const file of files) {
    const path = resolve(root, file)
    if (!/export async function (POST|PUT|PATCH|DELETE)/.test(readFileSync(path, 'utf8'))) continue
    const route = await import(pathToFileURL(path).href)
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      if (!route[method]) continue
      const req = new NextRequest('https://portal.example/api/admin/test', { method, headers: { Origin: 'https://attacker.example' } })
      const response = await route[method](req, { params: Promise.resolve({ id: '1', batchId: '1', aksesId: '1' }) })
      assert.equal(response.status, 403, `${method} ${file}`)
      handlers++
    }
  }
  assert.ok(handlers >= 25)
  assert.equal(globalThis.securityTest.calls.length, 0)
})
test('anonymous reports cannot write to the database', async () => {
  globalThis.securityTest.session = null
  assert.equal((await laporan(request(validReport))).status, 401)
  assert.equal(globalThis.securityTest.calls.length, 0)
})
test('report ownership comes from the session, never from user_id', async () => {
  const res = await laporan(request({ ...validReport, user_id: 999 }))
  assert.equal(res.status, 201)
  const insert = globalThis.securityTest.calls.find(call => call.sql.includes('INSERT INTO laporan_harian'))
  assert.equal(insert.args[0], 7)
})
test('reports reject negative counts before writing', async () => {
  assert.equal((await laporan(request({ ...validReport, usaha_dicacah: -1 }))).status, 400)
  assert.equal(globalThis.securityTest.calls.some(call => call.sql.includes('INSERT')), false)
})
test('petugas without an assigned region cannot list businesses', async () => {
  Object.assign(globalThis.securityTest.user, { role: 'petugas', kdkec: null })
  assert.equal((await usaha(new NextRequest('https://portal.example/api/usaha?kec=other'))).status, 403)
  assert.equal(globalThis.securityTest.calls.some(call => call.sql.includes('FROM usaha')), false)
})
test('tooltip escapes database text while retaining ordinary names', () => {
  const html = buildKecamatanTooltipHtml({ nama: '<b>Nama & "Wilayah"</b>', target: 1, realisasi: 0, persentase: 0 })
  assert.ok(html.includes('&lt;b&gt;Nama &amp; &quot;Wilayah&quot;&lt;/b&gt;'))
  assert.ok(!html.includes('<b>Nama'))
})
test('CSV exports keep formula-like text inert while preserving numeric values', () => {
  assert.equal(csvEscape('=SUM(1)'), "'=SUM(1)")
  assert.equal(csvEscape('  @SUM(1)'), "'  @SUM(1)")
  assert.equal(csvEscape('-123'), "'-123")
  assert.equal(csvEscape(-123), '-123')
  assert.equal(csvEscape('a,b'), '"a,b"')
  assert.equal(csvEscape('a\rb'), '"a\rb"')
})
function workbook(rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true })
}
test('patched SheetJS imports master and progress workbooks with expected values', async () => {
  const master = workbook([{ IDSBR: '001', NAMA: 'Usaha', KDKEC: '030', KDDESA: '001', NMKEC: 'Muara Beliti', NMDESA: 'Desa', 'SKALA USAHA': 'UMK' }])
  await validateWorkbookArchive(master)
  const result = parseUsahaBuffer(master)
  assert.equal(result.rows[0].idsbr, '001')
  assert.deepEqual(result.missingColumns, [])
  const progress = parseProgressBuffer(workbook([{ IDSBR: '001', STATUS: 'selesai' }]))
  assert.equal(progress.rows[0].status, 'selesai')
})
test('Excel upload rejects invalid archives and oversized ZIP metadata', async () => {
  await assert.rejects(validateWorkbookArchive(Buffer.from('not a zip')), rejectsStatus(400))
  const big = workbook([{ IDSBR: '001' }])
  const central = big.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  big.writeUInt32LE(101 * 1024 * 1024, central + 24)
  await assert.rejects(validateWorkbookArchive(big), rejectsStatus(400))
  const form = new FormData()
  form.set('file', 'not a file')
  await assert.rejects(readExcelUpload(new Request('https://portal.example', { method: 'POST', body: form })), rejectsStatus(400))
})
test('image upload rejects SVG bytes disguised as a JPEG', async () => {
  const form = new FormData()
  form.set('file', new File(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'], 'image.jpg', { type: 'image/jpeg' }))
  const res = await uploadImage(new NextRequest('https://portal.example/api/admin/upload', { method: 'POST', body: form }))
  assert.equal(res.status, 400)
})
test('patched sharp can re-encode a harmless PNG to WebP', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
  const webp = await sharp(png).webp().toBuffer()
  assert.equal((await sharp(webp).metadata()).format, 'webp')
})
