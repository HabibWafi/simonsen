'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/Toast'

interface ImportResult {
  total: number
  inserted: number
  updated: number
  duplicate: number
  error: number
  errors: Array<{ rowIndex?: number; row?: number; idsbr?: string; message: string }>
  batchId: number
  missingColumns?: string[]
}

interface HistoryRow {
  id: number
  jenis: 'master_usaha' | 'progress_fasih'
  filename: string
  total_rows: number
  inserted_rows: number
  updated_rows: number
  duplicate_rows: number
  error_rows: number
  imported_at: string
  imported_by_name: string | null
  status?: 'completed' | 'revoked'
  revoked_at?: string | null
}

interface FasihImportResult {
  ok?: boolean
  snapshot_id?: number | string
  counts?: Record<string, unknown>
}

function errorMessage(error: unknown, fallback = 'Network error') {
  return error instanceof Error ? error.message : fallback
}

export default function ImportPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [tab, setTab] = useState<'usaha' | 'progress' | 'fasih' | 'tagging'>('usaha')
  const refreshHistoryRef = useRef<() => void>(() => {})

  const onSuccess = useCallback(() => {
    refreshHistoryRef.current()
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Import Data Excel</h1>
        <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>
          Upload master daftar usaha (sekali) atau update progress (manual / dari Fasih) — setiap import dicatat dan bisa di-revoke.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #EDE3D8' }}>
        <TabButton active={tab === 'usaha'} onClick={() => setTab('usaha')}>📦 Master Usaha</TabButton>
        <TabButton active={tab === 'progress'} onClick={() => setTab('progress')}>📊 Update Progress (per IDSBR)</TabButton>
        <TabButton active={tab === 'fasih'} onClick={() => setTab('fasih')}>🤖 Progress Fasih (Scraper)</TabButton>
        {isAdmin && <TabButton active={tab === 'tagging'} onClick={() => setTab('tagging')}>◎ Data Tagging</TabButton>}
      </div>

      {tab === 'tagging' ? (
        <TaggingImportCard />
      ) : tab === 'fasih' ? (
        <FasihImportCard />
      ) : tab === 'usaha' ? (
        <ImportCard
          key="usaha"
          title="Import Master Daftar Usaha"
          subtitle="Upload file Excel berisi daftar usaha (IDSBR = primary key). Duplikat antar-file otomatis terdeteksi."
          requiredCols={['IDSBR', 'NAMA', 'KDKEC', 'KDDESA', 'NMKEC', 'NMDESA', 'SKALA USAHA']}
          endpoint="/api/admin/import/usaha"
          templateEndpoint="/api/admin/import/usaha/template"
          templateFilename="template-master-usaha-se2026.xlsx"
          onSuccess={onSuccess}
        />
      ) : (
        <ImportCard
          key="progress"
          title="Update Progress Pencacahan"
          subtitle="Upload file Excel berisi update status pencacahan per IDSBR. Bisa manual atau export dari Fasih."
          requiredCols={['IDSBR', 'STATUS']}
          optionalCols={['TANGGAL_CACAH', 'PETUGAS_NIP', 'CATATAN', 'LAT', 'LNG']}
          endpoint="/api/admin/import/progress"
          templateEndpoint="/api/admin/import/progress/template"
          templateFilename="template-update-progress-se2026.xlsx"
          onSuccess={onSuccess}
        />
      )}

      {tab === 'tagging' ? <TaggingHistory /> : <HistoryTable refreshRef={refreshHistoryRef} />}
    </div>
  )
}

/* ---------- TaggingImportCard (snapshot penuh, chunked) ---------- */

const TAGGING_COLUMNS = [
  'assignment_id', 'assignment_status_alias', 'level_6_full_code', 'nama_usaha_bang', 'nama_kk',
  'ada_keluarga_label', 'ada_bang_usaha_label', 'geotag_accuracy', 'geotag_latitude', 'geotag_longitude',
]

type TaggingResult = {
  batchId: number
  rawRows: number
  uniqueAssignments: number
  duplicateRows: number
  statusConflicts: number
  exactPointGroups: number
  nearPointGroups: number
  missingCoordinates: number
  lowAccuracy: number
  unmappedCodes: number
  outsideSubsls: number
}

async function postJson(url: string, body: unknown, retries = 0): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (response.ok || response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) { lastError = error }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)))
  }
  throw lastError instanceof Error ? lastError : new Error('Network error')
}

function TaggingImportCard() {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<TaggingResult | null>(null)

  async function submit() {
    if (!file) return
    setBusy(true); setProgress(1); setError(''); setResult(null); setPhase('Membaca workbook di browser…')
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Gunakan file .xlsx')
      if (file.size > 50 * 1024 * 1024) throw new Error('Ukuran file maksimum 50 MB')
      const buffer = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buffer)
      const fileSha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'array' })
      const worksheet = workbook.Sheets.Sheet2
      if (!worksheet) throw new Error('Sheet2 tidak ditemukan')
      // raw:true wajib agar kode wilayah 16 digit tidak berubah menjadi notasi ilmiah tampilan Excel.
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null, raw: true })
      if (!parsed.length) throw new Error('Sheet2 tidak memiliki data')
      const missing = TAGGING_COLUMNS.filter(column => !Object.keys(parsed[0]).includes(column))
      if (missing.length) throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`)
      setProgress(7); setPhase(`Mempersiapkan ${parsed.length.toLocaleString('id-ID')} baris…`)

      const startRes = await postJson('/api/admin/tagging/import/start', {
        filename: file.name, fileSha256, fileSize: file.size, rawRows: parsed.length,
      })
      const startJson = await startRes.json()
      if (!startRes.ok) throw new Error(startJson.error ?? 'Gagal membuat batch tagging')
      const batchId = Number(startJson.batchId)
      const chunkSize = 1000
      for (let start = 0; start < parsed.length; start += chunkSize) {
        const rows = parsed.slice(start, start + chunkSize).map((row, index) => ({ ...row, source_row: start + index + 2 }))
        setPhase(`Mengirim baris ${(start + 1).toLocaleString('id-ID')}–${Math.min(start + chunkSize, parsed.length).toLocaleString('id-ID')}…`)
        const chunkRes = await postJson(`/api/admin/tagging/import/${batchId}/chunk`, { rows }, 3)
        const chunkJson = await chunkRes.json()
        if (!chunkRes.ok) throw new Error(chunkJson.error ?? `Chunk mulai baris ${start + 2} gagal`)
        setProgress(8 + Math.round((Math.min(start + chunkSize, parsed.length) / parsed.length) * 77))
      }

      setPhase('Mendeteksi duplikasi, jarak 10 meter, dan kecocokan poligon…'); setProgress(88)
      const completeRes = await postJson(`/api/admin/tagging/import/${batchId}/complete`, {}, 0)
      const completeJson = await completeRes.json()
      if (!completeRes.ok) throw new Error(completeJson.error ?? 'Finalisasi snapshot gagal')
      setResult(completeJson); setProgress(100); setPhase('Snapshot aktif')
      toast.success(`Snapshot tagging #${batchId} aktif`, `${completeJson.uniqueAssignments.toLocaleString('id-ID')} assignment unik`)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Import tagging gagal'
      setError(message); setPhase('Import terhenti'); toast.error('Import tagging gagal', message)
    } finally { setBusy(false) }
  }

  return <div style={{ background: '#17212B', color: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 16px 44px rgba(23,33,43,.14)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ maxWidth: 720 }}><div style={{ fontSize: 10, color: '#FFB36E', fontWeight: 900, letterSpacing: '.15em', marginBottom: 7 }}>SNAPSHOT TAGGING · ADMIN ONLY</div><h2 style={{ margin: 0, fontSize: 19 }}>Impor data tagging lapangan</h2><p style={{ color: 'rgba(255,255,255,.66)', fontSize: 12, lineHeight: 1.65 }}>Workbook diproses bertahap per 1.000 baris. Snapshot lama tetap aktif sampai validasi kode wilayah, duplikasi assignment, titik identik, dan jarak 10 meter selesai.</p></div>
      <a href="/se/2026/dashboard/tagging" style={{ color: '#FFB36E', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Buka dashboard tagging ↗</a>
    </div>
    <div style={{ marginTop: 16, padding: 18, border: '1px dashed rgba(255,255,255,.23)', borderRadius: 12, background: 'rgba(255,255,255,.05)' }}>
      <input type="file" accept=".xlsx" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} style={{ width: '100%', color: 'white', fontSize: 12 }} />
      {file && <div style={{ marginTop: 9, color: '#D7E1E8', fontSize: 11 }}>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>}
    </div>
    {(busy || progress > 0) && <div style={{ marginTop: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.68)', marginBottom: 6 }}><span>{phase}</span><strong>{progress}%</strong></div><div style={{ height: 7, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,.12)' }}><div style={{ width: `${progress}%`, height: '100%', background: error ? '#FB7185' : '#E8751A', transition: 'width .25s' }} /></div></div>}
    {error && <div style={{ marginTop: 14, border: '1px solid rgba(251,113,133,.45)', background: 'rgba(190,18,60,.22)', color: '#FFE4E6', borderRadius: 9, padding: 11, fontSize: 12 }}>{error}</div>}
    {result && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(125px,1fr))', gap: 8, marginTop: 15 }}>{[
      ['Assignment', result.uniqueAssignments], ['Duplikat', result.duplicateRows], ['Konflik status', result.statusConflicts],
      ['Titik identik', result.exactPointGroups], ['Cluster ≤10 m', result.nearPointGroups], ['Di luar Sub-SLS', result.outsideSubsls],
    ].map(([label, value]) => <div key={String(label)} style={{ padding: 11, borderRadius: 9, background: 'rgba(255,255,255,.07)' }}><span style={{ display: 'block', color: 'rgba(255,255,255,.55)', fontSize: 9, textTransform: 'uppercase' }}>{label}</span><strong style={{ display: 'block', color: '#FFB36E', fontSize: 19, marginTop: 4 }}>{Number(value).toLocaleString('id-ID')}</strong></div>)}</div>}
    <button disabled={!file || busy} onClick={submit} style={{ width: '100%', marginTop: 15, height: 43, border: 0, borderRadius: 9, background: !file || busy ? '#53606B' : '#E8751A', color: 'white', fontWeight: 850, cursor: !file || busy ? 'not-allowed' : 'pointer' }}>{busy ? 'Memproses snapshot…' : 'Validasi & impor snapshot penuh'}</button>
  </div>
}

function TaggingHistory() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  useEffect(() => { void fetch('/api/admin/tagging/history').then(res => res.json()).then(json => setRows(json.data ?? [])) }, [])
  return <div style={{ background: 'white', border: '1px solid #EDE3D8', borderRadius: 12, overflow: 'hidden' }}><div style={{ padding: '16px 18px', borderBottom: '1px solid #EDE3D8' }}><h3 style={{ margin: 0, fontSize: 14 }}>Riwayat snapshot tagging</h3></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}><thead><tr>{['ID','File','Status','Baris','Assignment','Duplikat','Titik identik','Tanggal'].map(label => <th key={label} style={th}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={String(row.id)}><td style={td}>#{String(row.id)}{Boolean(row.is_active) && <strong style={{ display: 'block', color: '#00A651', fontSize: 9 }}>AKTIF</strong>}</td><td style={td}>{String(row.filename)}</td><td style={td}>{String(row.status)}</td><td style={td}>{Number(row.raw_rows).toLocaleString('id-ID')}</td><td style={td}>{Number(row.unique_assignments).toLocaleString('id-ID')}</td><td style={td}>{Number(row.duplicate_rows).toLocaleString('id-ID')}</td><td style={td}>{Number(row.exact_point_groups).toLocaleString('id-ID')}</td><td style={td}>{new Date(String(row.created_at)).toLocaleString('id-ID')}</td></tr>)}</tbody></table></div></div>
}

/* ---------- FasihImportCard (upload xlsx scraper langsung) ---------- */

function FasihImportCard() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<FasihImportResult | null>(null)
  const [error, setError] = useState('')

  async function submit() {
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/import/fasih', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Import gagal')
      setResult(j)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: '0 0 4px' }}>Import Progress Fasih (hasil scraper)</h2>
      <p style={{ fontSize: 13, color: '#6B6B6B', margin: '0 0 16px', lineHeight: 1.6 }}>
        Upload file <code>progres_subsls_*.xlsx</code> dari bot scraper. Sheet yang dibaca: Rekap Kecamatan/Desa/SLS, Detail SUBSLS, Progress Petugas & Pengawas.
        Data agregat ini meng-update progress peta + per-petugas (idempotent, upsert per wilayah).
        <br /><strong>Untuk update otomatis berkala</strong>, bot sebaiknya kirim JSON ke <code>POST /api/se/2026/external/fasih</code> (lebih cepat) — lihat docs API.
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13 }} />
        <button onClick={submit} disabled={!file || busy} style={{
          padding: '10px 20px', borderRadius: 8, background: !file || busy ? '#E0D5C8' : '#E8751A',
          color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: !file || busy ? 'default' : 'pointer',
        }}>{busy ? 'Memproses…' : 'Upload & Ingest'}</button>
      </div>

      {error && <div style={{ marginTop: 14, background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E8192C' }}>{error}</div>}

      {result?.ok && (
        <div style={{ marginTop: 16, background: '#E8FFF3', border: '1px solid #A7F3D0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#00A651', marginBottom: 10 }}>✓ Snapshot #{result.snapshot_id} berhasil di-ingest</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {Object.entries(result.counts ?? {}).map(([k, v]) => (
              <div key={k} style={{ fontSize: 12, color: '#3D3D3D' }}>
                <span style={{ fontWeight: 700, color: '#C85E0A', textTransform: 'capitalize' }}>{k}</span>: {String(v)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- ImportCard ---------- */

function ImportCard({
  title, subtitle, requiredCols, optionalCols, endpoint,
  templateEndpoint, templateFilename, onSuccess,
}: {
  title: string
  subtitle: string
  requiredCols: string[]
  optionalCols?: string[]
  endpoint: string
  templateEndpoint: string
  templateFilename: string
  onSuccess: () => void
}) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload() {
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) {
        const msg = j.error ?? 'Gagal upload'
        setError(msg)
        if (j.missingColumns) setResult({
          total: Number(j.total ?? 0), inserted: Number(j.inserted ?? 0), updated: Number(j.updated ?? 0),
          duplicate: Number(j.duplicate ?? 0), error: Number(j.errorCount ?? 0),
          errors: Array.isArray(j.errors) ? j.errors : [], batchId: Number(j.batchId ?? 0),
          missingColumns: j.missingColumns,
        })
        toast.error('Import gagal', j.missingColumns ? `Kolom wajib hilang: ${j.missingColumns.join(', ')}` : msg)
        return
      }
      setResult(j)
      const summary = `${j.inserted ?? 0} insert · ${j.updated ?? 0} update · ${j.duplicate ?? 0} duplikat · ${j.error ?? 0} error`
      toast.success(`Import selesai — batch #${j.batchId}`, summary)
      onSuccess()
    } catch (requestError) {
      const msg = errorMessage(requestError)
      setError(msg)
      toast.error('Network error', msg)
    } finally { setBusy(false) }
  }

  async function downloadTemplate() {
    try {
      const res = await fetch(templateEndpoint)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = templateFilename
      a.click()
      URL.revokeObjectURL(url)
      toast.info('Template di-download', templateFilename)
    } catch (requestError) {
      toast.error('Gagal download template', errorMessage(requestError, 'Template tidak dapat diunduh'))
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0', lineHeight: 1.55 }}>{subtitle}</p>
        </div>
        <button onClick={downloadTemplate} style={{
          padding: '9px 16px', borderRadius: 8,
          background: '#FFF0DC', color: '#C85E0A',
          border: '1.5px solid rgba(232,117,26,.35)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>📥 Download Template Excel</button>
      </div>

      <div style={{ background: '#FDF6EE', borderRadius: 8, padding: '10px 14px', margin: '14px 0', fontSize: 12, color: '#6B6B6B', border: '1px solid rgba(232,117,26,.15)' }}>
        <div style={{ fontWeight: 700, color: '#C85E0A', marginBottom: 4 }}>Kolom wajib (case-insensitive):</div>
        {requiredCols.map(c => <code key={c} style={{ background: 'white', padding: '2px 8px', borderRadius: 4, marginRight: 6, fontSize: 11, border: '1px solid #EDE3D8' }}>{c}</code>)}
        {optionalCols && (
          <>
            <div style={{ fontWeight: 700, color: '#3D3D3D', marginTop: 10, marginBottom: 4 }}>Kolom opsional:</div>
            {optionalCols.map(c => <code key={c} style={{ background: 'white', padding: '2px 8px', borderRadius: 4, marginRight: 6, fontSize: 11, border: '1px solid #EDE3D8', color: '#8C7B6B' }}>{c}</code>)}
          </>
        )}
      </div>

      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#E8751A' : '#EDE3D8'}`,
          borderRadius: 10,
          padding: '32px 20px',
          textAlign: 'center' as const,
          cursor: 'pointer',
          background: dragOver ? '#FFF8F0' : '#FAF8F5',
          transition: 'all .2s',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        {file ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{file.name}</div>
            <div style={{ fontSize: 12, color: '#8C7B6B', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3D3D3D' }}>Klik atau drag file .xlsx / .xls ke sini</div>
            <div style={{ fontSize: 12, color: '#8C7B6B', marginTop: 4 }}>Max 10 MB</div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
      </div>

      <button onClick={upload} disabled={!file || busy} style={{
        padding: '12px 24px', borderRadius: 8,
        background: !file || busy ? '#F5A623' : '#E8751A',
        color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
        cursor: !file || busy ? 'not-allowed' : 'pointer', width: '100%',
      }}>
        {busy ? '⏳ Mengupload & memproses…' : '⬆️ Upload & Import'}
      </button>

      {error && (
        <div style={{ marginTop: 14, background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#E8192C' }}>
          <strong>⚠️ {error}</strong>
          {result?.missingColumns && (
            <div style={{ marginTop: 6 }}>Kolom yang tidak ditemukan: {result.missingColumns.map(c => <code key={c} style={{ background: 'white', padding: '2px 6px', borderRadius: 4, marginRight: 4, fontSize: 11 }}>{c}</code>)}</div>
          )}
        </div>
      )}

      {result && !error && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Stat label="Total" value={result.total} color="#3D3D3D" />
            <Stat label="Insert" value={result.inserted} color="#00A651" />
            <Stat label="Update" value={result.updated} color="#1877F2" />
            <Stat label="Duplikat" value={result.duplicate} color="#F5A623" />
            <Stat label="Error" value={result.error} color="#E8192C" />
          </div>
          {result.errors?.length > 0 && (
            <details open style={{ background: '#FFF1F2', borderRadius: 8, padding: '10px 14px', fontSize: 12, border: '1px solid #FECDD3' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#E8192C' }}>
                Detail {result.errors.length} baris bermasalah ({result.errors.filter(e => /duplikat/i.test(e.message)).length} duplikat, {result.errors.length - result.errors.filter(e => /duplikat/i.test(e.message)).length} error)
              </summary>
              <div style={{ marginTop: 8, maxHeight: 240, overflow: 'auto' }}>
                {result.errors.map((e, i) => {
                  const rowNum = e.rowIndex ?? e.row
                  return (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #FECDD3' }}>
                      Row {rowNum ?? '?'}{e.idsbr ? ` (IDSBR: ${e.idsbr})` : ''}: {e.message}
                    </div>
                  )
                })}
              </div>
            </details>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: '#8C7B6B', fontStyle: 'italic' }}>
            Batch tersimpan di Riwayat Import dengan ID #{result.batchId} — bisa di-revoke kalau salah.
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#FAF8F5', padding: '12px 14px', borderRadius: 10, border: '1px solid #EDE3D8' }}>
      <div style={{ fontSize: 11, color: '#8C7B6B', textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: .5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{(value ?? 0).toLocaleString('id-ID')}</div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 700,
      color: active ? '#E8751A' : '#6B6B6B',
      borderBottom: `2.5px solid ${active ? '#E8751A' : 'transparent'}`,
      marginBottom: -1,
    }}>{children}</button>
  )
}

/* ---------- HistoryTable ---------- */

function HistoryTable({ refreshRef }: { refreshRef: React.MutableRefObject<() => void> }) {
  const toast = useToast()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [revoking, setRevoking] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/import/history')
      const j = await r.json()
      setRows(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchHistory() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchHistory])

  // Expose refresh ke parent
  useEffect(() => { refreshRef.current = fetchHistory }, [refreshRef, fetchHistory])

  async function doRevoke(batchId: number) {
    setRevoking(true)
    try {
      const res = await fetch(`/api/admin/import/${batchId}/revoke`, { method: 'POST' })
      const j = await res.json()
      if (!res.ok) {
        toast.error('Gagal revoke', j.error ?? `HTTP ${res.status}`)
        return
      }
      toast.success(`Batch #${batchId} di-revoke`, `${j.reverted ?? 0} row dikembalikan, ${j.skipped ?? 0} di-skip.`)
      setConfirmId(null)
      await fetchHistory()
    } catch (requestError) {
      toast.error('Network error', errorMessage(requestError))
    } finally { setRevoking(false) }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Riwayat Import</h2>
          <p style={{ fontSize: 12, color: '#8C7B6B', margin: '4px 0 0' }}>50 import terakhir. Klik tombol Revoke untuk rollback batch.</p>
        </div>
        <button onClick={fetchHistory} style={{ padding: '7px 14px', borderRadius: 8, background: '#FAF8F5', color: '#6B6B6B', border: '1px solid #EDE3D8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAF8F5', textAlign: 'left' as const }}>
              <th style={th}>ID</th>
              <th style={th}>Tanggal</th>
              <th style={th}>Jenis</th>
              <th style={th}>Filename</th>
              <th style={th}>Total</th>
              <th style={th}>OK</th>
              <th style={th}>Dup</th>
              <th style={th}>Err</th>
              <th style={th}>Oleh</th>
              <th style={th}>Status</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#6B6B6B' }}>Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#8C7B6B', fontStyle: 'italic' }}>Belum ada riwayat import.</td></tr>
            ) : rows.map(r => {
              const revoked = r.status === 'revoked'
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #EDE3D8', opacity: revoked ? 0.55 : 1 }}>
                  <td style={td}><code style={{ fontSize: 11, background: '#FAF8F5', padding: '2px 6px', borderRadius: 4 }}>#{r.id}</code></td>
                  <td style={td}>{new Date(r.imported_at).toLocaleString('id-ID')}</td>
                  <td style={td}>
                    <span style={{
                      background: r.jenis === 'master_usaha' ? '#E8FFF3' : '#E0F0FF',
                      color:      r.jenis === 'master_usaha' ? '#00A651' : '#1877F2',
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    }}>{r.jenis === 'master_usaha' ? 'Master' : 'Progress'}</span>
                  </td>
                  <td style={{ ...td, fontSize: 12 }}><code>{r.filename}</code></td>
                  <td style={td}>{r.total_rows.toLocaleString('id-ID')}</td>
                  <td style={{ ...td, color: '#00A651', fontWeight: 700 }}>{(r.inserted_rows + r.updated_rows).toLocaleString('id-ID')}</td>
                  <td style={{ ...td, color: '#F5A623', fontWeight: 700 }}>{(r.duplicate_rows ?? 0).toLocaleString('id-ID')}</td>
                  <td style={{ ...td, color: r.error_rows > 0 ? '#E8192C' : '#8C7B6B', fontWeight: 700 }}>{r.error_rows.toLocaleString('id-ID')}</td>
                  <td style={td}>{r.imported_by_name ?? '—'}</td>
                  <td style={td}>
                    {revoked ? (
                      <span style={{ background: '#FFF1F2', color: '#E8192C', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>REVOKED</span>
                    ) : (
                      <span style={{ background: '#E8FFF3', color: '#00A651', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>OK</span>
                    )}
                  </td>
                  <td style={td}>
                    {!revoked && (
                      <button onClick={() => setConfirmId(r.id)} style={{ padding: '5px 10px', borderRadius: 6, background: '#FFF1F2', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        ↺ Revoke
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {confirmId != null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => !revoking && setConfirmId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1A1A1A' }}>Revoke Batch #{confirmId}?</div>
            <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 16 }}>
              Aksi ini akan mengembalikan semua row yang diubah oleh batch ini ke kondisi sebelum import.<br/>
              Row yang sudah diubah oleh batch lain setelah ini akan di-skip (tidak di-revoke).
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmId(null)} disabled={revoking} style={{ padding: '10px 18px', borderRadius: 8, background: 'white', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 13, fontWeight: 700, cursor: revoking ? 'not-allowed' : 'pointer' }}>
                Batal
              </button>
              <button onClick={() => doRevoke(confirmId)} disabled={revoking} style={{ padding: '10px 18px', borderRadius: 8, background: '#E8192C', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.7 : 1 }}>
                {revoking ? 'Memproses…' : 'Ya, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5 }
const td: React.CSSProperties = { padding: '12px 14px', color: '#3D3D3D', verticalAlign: 'middle' as const }
