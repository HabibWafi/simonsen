/**
 * GET /api/admin/import/progress/template
 * Generate Excel template (.xlsx) untuk update progress (manual atau dari Fasih).
 * Sheet:
 *  1. "Update Progress" — header + 5 baris contoh
 *  2. "Petunjuk Pengisian"
 *  3. "Sample IDSBR" — 50 IDSBR random dari DB untuk referensi
 */
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireRole } from '@/lib/auth-guard'
import pool from '@/lib/db'

export async function GET() {
  const guard = await requireRole(['admin', 'koordinator'])
  if (guard instanceof NextResponse) return guard

  // Ambil 50 IDSBR sample dari DB
  let sampleIdsbrs: Array<{ idsbr: string; nama: string; nmkec: string; skala_usaha: string }> = []
  try {
    const [rows] = await pool.query(
      `SELECT idsbr, nama, nmkec, skala_usaha FROM usaha ORDER BY RAND() LIMIT 50`,
    ) as [any[], any]
    sampleIdsbrs = rows
  } catch { /* ignore — kalau DB belum siap, biarkan sample kosong */ }

  const header = ['IDSBR', 'STATUS', 'TANGGAL_CACAH', 'PETUGAS_NIP', 'CATATAN', 'LAT', 'LNG']
  const sampleRows = [
    ['1620301001', 'selesai',  '2026-05-30', '199001012015011001', 'Pencacahan lengkap',      '-3.0123', '102.9456'],
    ['1620301002', 'proses',   '2026-05-30', '199001012015011001', 'Sedang dikunjungi ulang',  '',        ''],
    ['1620304001', 'tolak',    '2026-05-28', '199001012015011001', 'Pemilik menolak diwawancara', '',     ''],
    ['1620304002', 'tutup',    '2026-05-28', '199001012015011001', 'Usaha sudah tutup permanen',  '',     ''],
    ['1620301050', 'belum',    '',           '',                    '',                              '', ''],
  ]
  const sheetProgress = XLSX.utils.aoa_to_sheet([header, ...sampleRows])
  sheetProgress['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 38 }, { wch: 12 }, { wch: 12 },
  ]

  const petunjuk = [
    ['Kolom',         'Wajib', 'Format / Enum',                          'Contoh',            'Keterangan'],
    ['IDSBR',         'YA',    'String unique',                          '1620301001',        'Harus ada di master usaha — kalau tidak ada → error'],
    ['STATUS',        'YA',    'Enum: belum / proses / selesai / tolak / tutup / ganda', 'selesai', 'Lowercase. selesai = sudah dicacah lengkap'],
    ['TANGGAL_CACAH', 'tidak', 'YYYY-MM-DD',                              '2026-05-30',        'Tanggal pencacahan terakhir'],
    ['PETUGAS_NIP',   'tidak', 'NIP 18-digit',                            '199001012015011001','Auto lookup ke tabel users — kalau NIP tidak ada, field di-set NULL'],
    ['CATATAN',       'tidak', 'String free text',                        'Pemilik tidak di rumah', ''],
    ['LAT',           'tidak', 'Decimal -90..90',                         '-3.0123',           'Latitude lokasi usaha'],
    ['LNG',           'tidak', 'Decimal -180..180',                       '102.9456',          'Longitude lokasi usaha'],
    [],
    ['Catatan import:'],
    ['- Import progress adalah UPDATE: row dengan IDSBR yang sudah ada di DB akan di-update.'],
    ['- Row dengan IDSBR yang TIDAK ADA di master → dihitung sebagai error.'],
    ['- Kolom kosong → field tersebut tidak di-update (preserve nilai existing).'],
    ['- Aksi import dicatat di Riwayat Import dan bisa di-revoke.'],
  ]
  const sheetPet = XLSX.utils.aoa_to_sheet(petunjuk)
  sheetPet['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 28 }, { wch: 22 }, { wch: 60 }]

  const sheetSample = XLSX.utils.aoa_to_sheet([
    ['IDSBR', 'NAMA USAHA', 'KECAMATAN', 'SKALA'],
    ...sampleIdsbrs.map(s => [s.idsbr, s.nama, s.nmkec, s.skala_usaha]),
  ])
  sheetSample['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 22 }, { wch: 8 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetProgress, 'Update Progress')
  XLSX.utils.book_append_sheet(wb, sheetPet, 'Petunjuk Pengisian')
  XLSX.utils.book_append_sheet(wb, sheetSample, 'Sample IDSBR')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="template-update-progress-se2026.xlsx"`,
    },
  })
}
