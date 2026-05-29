/**
 * Shared TypeScript types for SE2026 portal.
 * Mirrors DB schema in db/migrations/2026_se2026_iterasi4.sql
 */

// ---------- Auth ----------
export type Role = 'admin' | 'koordinator' | 'petugas'

export interface SessionUser {
  id: string
  name: string
  email: string        // NIP as email field
  role: Role
  kecamatan?: string   // legacy field
  kdkec?: string       // 7-digit BPS code (e.g. "1605030")
}

// ---------- Tahapan ----------
export type TahapanStatus = 'selesai' | 'aktif' | 'akan-datang'

export interface Tahapan {
  id: number
  judul: string
  periode: string
  start_date?: string | null
  end_date?: string | null
  status: TahapanStatus
  deskripsi: string
  icon: string
  urutan: number
  created_at?: string
  updated_at?: string
  akses?: TahapanAkses[]
}

export type TahapanAksesTipe = 'drive' | 'dokumen' | 'spreadsheet' | 'form' | 'link'

export interface TahapanAkses {
  id: number
  tahapan_id: number
  nama: string
  url: string
  tipe: TahapanAksesTipe
  urutan: number
}

// ---------- Desa ----------
export interface Desa {
  id: number
  kddesa: string       // "1605030015" (10 char from BPS)
  nama: string
  kdkec: string        // "1605030"
  nmkec: string
}

// ---------- Usaha ----------
export type SkalaUsaha = 'UMK' | 'UM' | 'UB'
export type StatusPencacahan = 'belum' | 'proses' | 'selesai' | 'tolak' | 'tutup' | 'ganda'

export interface Usaha {
  idsbr: string
  nama: string
  alamat: string | null
  kdprov: string | null
  kdkab: string | null
  kdkec: string
  kddesa: string
  kdsls: string | null
  nmprov: string | null
  nmkab: string | null
  nmkec: string
  nmdesa: string
  nmsls: string | null
  skala_usaha: SkalaUsaha
  status_pencacahan: StatusPencacahan
  petugas_id: number | null
  tanggal_cacah: string | null
  catatan: string | null
  lat: number | null
  lng: number | null
  imported_at?: string
  updated_at?: string
}

// ---------- Import batch ----------
export type ImportJenis = 'master_usaha' | 'progress_fasih'

export interface ImportBatch {
  id: number
  jenis: ImportJenis
  filename: string
  total_rows: number
  inserted_rows: number
  updated_rows: number
  duplicate_rows: number
  error_rows: number
  error_summary: string | null
  imported_by: number
  imported_at: string
  imported_by_name?: string // joined from users.nama
}

export interface ImportResult {
  total: number
  inserted: number
  updated: number
  duplicate: number
  error: number
  errors: Array<{ row: number; idsbr?: string; message: string }>
  batchId: number
}

// ---------- Progress aggregates ----------
export interface SkalaBreakdown {
  target: number
  realisasi: number
  persentase: number
}

export interface ProgressBreakdown {
  UMK: SkalaBreakdown
  UM:  SkalaBreakdown
  UB:  SkalaBreakdown
}

export interface ProgressKecamatanRow {
  id?: number
  kdkec: string
  nmkec: string
  kecamatan: string         // alias of nmkec for backwards compat with mockData consumers
  target_usaha: number
  realisasi: number
  persentase: number
  petugas_count: number
  status: 'belum' | 'berlangsung' | 'selesai'
  breakdown?: ProgressBreakdown   // hadir saat filter "Semua Skala"
}

export interface ProgressDesaRow {
  kddesa: string
  nmdesa: string
  kdkec: string
  target_usaha: number
  realisasi: number
  persentase: number
  breakdown?: ProgressBreakdown
}

export interface StatsRow {
  total_target: number
  total_realisasi: number
  persentase: number
  kecamatan_count: number
  desa_count: number
  petugas_aktif: number
  hari_tersisa: number
}

// ---------- User ----------
export interface User {
  id: number
  nip: string
  nama: string
  role: Role
  kecamatan: string | null
  kdkec: string | null
  created_at?: string
}

export interface UserCreateInput {
  nip: string
  nama: string
  role: Role
  kdkec?: string | null
  password: string
}

export interface UserUpdateInput {
  nama?: string
  role?: Role
  kdkec?: string | null
  password?: string  // optional reset
}

// ---------- Sensus Multi-Tenant ----------
export interface NavLink { label: string; href: string }
export interface FooterLinkGroup { judul: string; items: NavLink[] }
export interface SosmedLink { platform: 'facebook'|'instagram'|'youtube'|'twitter'|'tiktok'|'whatsapp'; url: string }
export interface Kontak { alamat: string; telp: string; faks?: string; email: string; whatsapp?: string }

export interface NavbarConfig {
  wordmarkAtas: string
  wordmarkBawah: string
  navLinks: NavLink[]
  ctaLabel: string
  ctaHref: string
}

export interface FooterConfig {
  tagline: string
  kolomLinks: FooterLinkGroup[]
  kontak: Kontak
  sosmed: SosmedLink[]
  copyright: string
}

export interface SensusConfig {
  id: number
  sensus_kode: string
  tahun: number
  nama_lengkap: string
  nama_pendek: string
  primary_color: string
  secondary_color: string | null
  navbar_config: NavbarConfig
  footer_config: FooterConfig
  is_active: boolean
}

export interface UserSensusAccess {
  user_id: number
  sensus_kode: string
  tahun: number
  role: Role
}

// ---------- Import Batch Row (snapshot revoke) ----------
export type ImportRowAction = 'insert'|'update'|'duplicate'|'error'|'skip'

export interface ImportBatchRow {
  id: number
  batch_id: number
  idsbr: string
  action: ImportRowAction
  before_json: Partial<Usaha> | null
  after_json: Partial<Usaha> | null
  error_message: string | null
  row_index: number | null
  created_at: string
}

// ---------- API Token (external) ----------
export type ApiScope =
  | 'read:progress' | 'write:progress'
  | 'read:usaha'    | 'write:usaha'
  | 'read:tahapan'  | 'write:tahapan'

export interface ApiToken {
  id: number
  label: string
  prefix: string
  sensus_kode: string
  tahun: number
  scopes: ApiScope[]
  created_by: number
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface ApiAuditLog {
  id: number
  token_id: number | null
  sensus_kode: string
  tahun: number
  method: string
  path: string
  status: number
  ip: string | null
  user_agent: string | null
  duration_ms: number | null
  created_at: string
}
