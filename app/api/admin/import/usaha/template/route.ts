/**
 * GET /api/admin/import/usaha/template
 * Generate Excel template (.xlsx) untuk import master daftar usaha SE2026.
 * Sheet:
 *  1. "Master Usaha" — header + 3 baris contoh
 *  2. "Petunjuk Pengisian" — penjelasan tiap kolom + enum SKALA USAHA
 */
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireRole } from '@/lib/auth-guard'

export async function GET() {
  const guard = await requireRole(['admin'])
  if (guard instanceof NextResponse) return guard

  const headerMaster = [
    'IDSBR', 'NAMA', 'ALAMAT',
    'KDPROV', 'KDKAB', 'KDKEC', 'KDDESA', 'KDSLS',
    'NMPROV', 'NMKAB', 'NMKEC', 'NMDESA', 'NMSLS',
    'SKALA USAHA',
  ]
  const sampleMaster = [
    ['1620301001', 'CV Sejahtera Mandiri',     'Jl. Lintas Sumatera No. 12',   '16', '05', '1605030', '1605030001', '16050300010001', 'Sumatera Selatan', 'Musi Rawas', 'Muara Beliti', 'Muara Beliti Baru', 'SLS 0001', 'UMK'],
    ['1620301002', 'Toko Cahaya',              'Pasar Muara Beliti Blok A2',   '16', '05', '1605030', '1605030001', '16050300010002', 'Sumatera Selatan', 'Musi Rawas', 'Muara Beliti', 'Muara Beliti Baru', 'SLS 0002', 'UMK'],
    ['1620304001', 'PT Sawit Jaya Lestari',    'Desa Tugumulyo KM 12',          '16', '05', '1605040', '1605040003', '16050400030001', 'Sumatera Selatan', 'Musi Rawas', 'Tugumulyo',    'Tugumulyo',         'SLS 0001', 'UB'],
  ]

  const sheetMaster = XLSX.utils.aoa_to_sheet([headerMaster, ...sampleMaster])
  sheetMaster['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 36 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
    { wch: 12 },
  ]

  const petunjuk = [
    ['Kolom',         'Wajib', 'Format / Enum',                          'Contoh',            'Keterangan'],
    ['IDSBR',         'YA',    'String unique (PK)',                     '1620301001',        'Primary key — duplikat antar-file akan terdeteksi otomatis'],
    ['NAMA',          'YA',    'String max 255 char',                    'CV Sejahtera',      'Nama usaha lengkap'],
    ['ALAMAT',        'tidak', 'String',                                 'Jl. Sudirman No 1', 'Bisa kosong'],
    ['KDPROV',        'tidak', '2-digit kode BPS',                        '16',                'Sumsel = 16'],
    ['KDKAB',         'tidak', '2-digit kode BPS',                        '05',                'Musi Rawas = 05'],
    ['KDKEC',         'YA',    '7-digit (prov+kab+kec)',                  '1605030',           'Lihat daftar kecamatan'],
    ['KDDESA',        'YA',    '10-digit (kec+desa)',                     '1605030001',        'Lihat daftar desa'],
    ['KDSLS',         'tidak', '16-digit',                                '16050300010001',    'Satuan Lingkungan Setempat'],
    ['NMPROV',        'tidak', 'String',                                  'Sumatera Selatan',  ''],
    ['NMKAB',         'tidak', 'String',                                  'Musi Rawas',        ''],
    ['NMKEC',         'YA',    'String',                                  'Muara Beliti',      ''],
    ['NMDESA',        'YA',    'String',                                  'Muara Beliti Baru', ''],
    ['NMSLS',         'tidak', 'String',                                  'SLS 0001',          ''],
    ['SKALA USAHA',   'YA',    'Enum: UMK | UM | UB',                     'UMK',               'UMK=Mikro&Kecil, UM=Menengah, UB=Besar'],
    [],
    ['Catatan',       '',      'Import idempotent — re-upload aman: row dengan IDSBR yang sama akan dihitung sebagai duplikat (skip).'],
  ]
  const sheetPet = XLSX.utils.aoa_to_sheet(petunjuk)
  sheetPet['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 26 }, { wch: 22 }, { wch: 52 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetMaster, 'Master Usaha')
  XLSX.utils.book_append_sheet(wb, sheetPet, 'Petunjuk Pengisian')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="template-master-usaha-se2026.xlsx"`,
    },
  })
}
