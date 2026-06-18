/**
 * Parser Excel update progress dari aplikasi Fasih.
 * Kolom wajib (case-insensitive):
 *   IDSBR, STATUS
 * Kolom opsional:
 *   LAT, LNG (atau LATITUDE, LONGITUDE)
 *   TANGGAL_CACAH (atau TANGGAL, TGL)
 *   CATATAN
 *   PETUGAS_NIP (NIP petugas yang mencacah)
 */
import * as XLSX from 'xlsx'
import type { StatusPencacahan } from '@/types'

export interface ParsedProgressRow {
  rowIndex: number
  idsbr: string
  status: StatusPencacahan
  lat: number | null
  lng: number | null
  tanggal_cacah: string | null
  catatan: string | null
  petugas_nip: string | null
}

export interface ParseProgressError {
  rowIndex: number
  idsbr?: string
  message: string
}

export interface ParseProgressResult {
  rows: ParsedProgressRow[]
  errors: ParseProgressError[]
  missingColumns: string[]
}

const REQUIRED = ['IDSBR', 'STATUS']

function normKey(k: string): string {
  return String(k).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function pick(obj: any, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function normStatus(v: string | null): StatusPencacahan | null {
  if (!v) return null
  const x = v.toLowerCase().trim()
  if (['belum', 'belum dikunjungi'].includes(x)) return 'belum'
  if (['proses', 'dalam proses', 'progress', 'on-progress'].includes(x)) return 'proses'
  if (['selesai', 'done', 'complete', 'cacah'].includes(x)) return 'selesai'
  if (['tolak', 'ditolak', 'refused'].includes(x)) return 'tolak'
  if (['tutup', 'tutup permanen', 'closed'].includes(x)) return 'tutup'
  if (['ganda', 'duplikat', 'duplicate'].includes(x)) return 'ganda'
  return null
}

function parseNumber(v: string | null): number | null {
  if (!v) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseDate(v: string | null): string | null {
  if (!v) return null
  // try ISO YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  // try DD/MM/YYYY or DD-MM-YYYY
  const m = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // try Excel serial number
  const n = Number(v)
  if (Number.isFinite(n) && n > 25569) {
    const date = new Date((n - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  return null
}

export function parseProgressBuffer(buf: Buffer): ParseProgressResult {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: '', raw: false })

  const rows: any[] = raw.map(r => {
    const out: any = {}
    for (const k of Object.keys(r)) out[normKey(k)] = r[k]
    return out
  })

  const headers = new Set<string>()
  if (rows.length) for (const k of Object.keys(rows[0])) headers.add(k)
  const missing = REQUIRED.filter(c => !headers.has(c))
  if (missing.length) return { rows: [], errors: [], missingColumns: missing }

  const parsed: ParsedProgressRow[] = []
  const errors: ParseProgressError[] = []

  rows.forEach((r, i) => {
    const rowIndex = i + 2
    const idsbr = pick(r, 'IDSBR')
    if (!idsbr) { errors.push({ rowIndex, message: 'IDSBR kosong' }); return }
    const status = normStatus(pick(r, 'STATUS', 'STATUS_PENCACAHAN'))
    if (!status) { errors.push({ rowIndex, idsbr, message: 'STATUS tidak valid' }); return }
    parsed.push({
      rowIndex,
      idsbr,
      status,
      lat: parseNumber(pick(r, 'LAT', 'LATITUDE')),
      lng: parseNumber(pick(r, 'LNG', 'LONGITUDE', 'LON')),
      tanggal_cacah: parseDate(pick(r, 'TANGGAL_CACAH', 'TANGGAL', 'TGL')),
      catatan: pick(r, 'CATATAN', 'KETERANGAN', 'NOTE'),
      petugas_nip: pick(r, 'PETUGAS_NIP', 'NIP', 'PETUGAS'),
    })
  })

  return { rows: parsed, errors, missingColumns: [] }
}
