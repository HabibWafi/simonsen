'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function ImportPage() {
  const [tab, setTab] = useState<'usaha' | 'progress'>('usaha')
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
        <TabButton active={tab === 'progress'} onClick={() => setTab('progress')}>📊 Update Progress</TabButton>
      </div>

      {tab === 'usaha' ? (
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

      <HistoryTable refreshRef={refreshHistoryRef} />
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
        if (j.missingColumns) setResult({ ...j, missingColumns: j.missingColumns } as any)
        toast.error('Import gagal', j.missingColumns ? `Kolom wajib hilang: ${j.missingColumns.join(', ')}` : msg)
        return
      }
      setResult(j)
      const summary = `${j.inserted ?? 0} insert · ${j.updated ?? 0} update · ${j.duplicate ?? 0} duplikat · ${j.error ?? 0} error`
      toast.success(`Import selesai — batch #${j.batchId}`, summary)
      onSuccess()
    } catch (e: any) {
      const msg = e.message ?? 'Network error'
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
    } catch (e: any) {
      toast.error('Gagal download template', e.message)
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
                  const rowNum = (e as any).rowIndex ?? (e as any).row
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

  useEffect(() => { fetchHistory() }, [fetchHistory])

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
    } catch (e: any) {
      toast.error('Network error', e.message)
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
