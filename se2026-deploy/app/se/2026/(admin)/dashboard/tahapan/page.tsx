'use client'

import { useEffect, useState } from 'react'
import type { Tahapan, TahapanAkses, TahapanAksesTipe, TahapanStatus } from '@/types'

const STATUS_OPTS: { v: TahapanStatus; label: string }[] = [
  { v: 'selesai',     label: 'Selesai' },
  { v: 'aktif',       label: 'Sedang Berjalan' },
  { v: 'akan-datang', label: 'Akan Datang' },
]

const TIPE_OPTS: { v: TahapanAksesTipe; label: string; icon: string }[] = [
  { v: 'drive',       label: 'Drive Folder',     icon: '📁' },
  { v: 'dokumen',     label: 'Dokumen',          icon: '📄' },
  { v: 'spreadsheet', label: 'Spreadsheet',      icon: '📊' },
  { v: 'form',        label: 'Form',             icon: '📝' },
  { v: 'link',        label: 'Link Lain',        icon: '🔗' },
]

const tipeIcon = (t: TahapanAksesTipe) => TIPE_OPTS.find(x => x.v === t)?.icon ?? '🔗'

const emptyTahapan = (): Partial<Tahapan> => ({
  judul: '', periode: '', status: 'akan-datang', deskripsi: '', icon: '📌', urutan: 0,
})
const emptyAkses = (tahapan_id: number): Partial<TahapanAkses> => ({
  tahapan_id, nama: '', url: '', tipe: 'link', urutan: 0,
})

export default function DashboardTahapanPage() {
  const [items, setItems] = useState<Tahapan[]>([])
  const [aksesMap, setAksesMap] = useState<Record<number, TahapanAkses[]>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Tahapan> | null>(null)
  const [editingAkses, setEditingAkses] = useState<{ tahapanId: number; akses: Partial<TahapanAkses> } | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tahapan').then(r => r.json())
      setItems(res.data ?? [])
      // load akses for each tahapan in parallel
      const aksesEntries = await Promise.all(
        (res.data ?? []).map(async (t: Tahapan) => {
          const r = await fetch(`/api/admin/tahapan/${t.id}/akses`).then(r => r.json())
          return [t.id, r.data ?? []] as const
        }),
      )
      setAksesMap(Object.fromEntries(aksesEntries))
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function saveTahapan() {
    if (!editing) return
    setError('')
    const isNew = !editing.id
    const url = isNew ? '/api/admin/tahapan' : `/api/admin/tahapan/${editing.id}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    if (!res.ok) { setError('Gagal menyimpan tahapan'); return }
    setEditing(null)
    load()
  }

  async function deleteTahapan(id: number) {
    if (!confirm('Hapus tahapan ini? Semua akses lanjutan akan ikut terhapus.')) return
    const res = await fetch(`/api/admin/tahapan/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Gagal menghapus'); return }
    load()
  }

  async function saveAkses() {
    if (!editingAkses) return
    setError('')
    const { tahapanId, akses } = editingAkses
    const isNew = !akses.id
    const url = isNew
      ? `/api/admin/tahapan/${tahapanId}/akses`
      : `/api/admin/tahapan/${tahapanId}/akses/${akses.id}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(akses),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error === 'URL tidak valid' || j.issues?.fieldErrors?.url ? 'URL tidak valid' : 'Gagal menyimpan akses')
      return
    }
    setEditingAkses(null)
    load()
  }

  async function deleteAkses(tahapanId: number, aksesId: number) {
    if (!confirm('Hapus akses lanjutan ini?')) return
    const res = await fetch(`/api/admin/tahapan/${tahapanId}/akses/${aksesId}`, { method: 'DELETE' })
    if (!res.ok) { setError('Gagal menghapus'); return }
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Kelola Tahapan SE2026</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>
            Tambah, edit, dan urutkan tahapan. Tiap tahapan bisa memiliki link akses lanjutan (Drive, dokumen, form, dll).
          </p>
        </div>
        <button onClick={() => setEditing(emptyTahapan())} style={btnPrimary}>+ Tambah Tahapan</button>
      </div>

      {error && <div style={errBox}>{error}</div>}
      {loading ? <div style={{ color: '#6B6B6B' }}>Memuat…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(t => (
            <div key={t.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{t.judul}</div>
                      <div style={{ fontSize: 12, color: '#C85E0A', fontWeight: 600 }}>{t.periode}</div>
                    </div>
                    <span style={statusBadge(t.status)}>
                      {STATUS_OPTS.find(s => s.v === t.status)?.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#8C7B6B', marginLeft: 'auto' }}>urutan: {t.urutan}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6B6B6B', margin: '8px 0 0', lineHeight: 1.55 }}>{t.deskripsi}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditing(t)} style={btnGhost}>Edit</button>
                  <button onClick={() => deleteTahapan(t.id)} style={btnDanger}>Hapus</button>
                </div>
              </div>

              {/* Akses lanjutan list */}
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#FAF8F5', borderRadius: 10, border: '1px solid #EDE3D8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3D3D3D', textTransform: 'uppercase', letterSpacing: .5 }}>
                    Akses Lanjutan ({aksesMap[t.id]?.length ?? 0})
                  </div>
                  <button onClick={() => setEditingAkses({ tahapanId: t.id, akses: emptyAkses(t.id) })} style={btnGhostSm}>+ Tambah</button>
                </div>
                {(aksesMap[t.id] ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: '#8C7B6B', fontStyle: 'italic' }}>Belum ada akses lanjutan untuk tahapan ini.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aksesMap[t.id].map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'white', borderRadius: 8, border: '1px solid #EDE3D8' }}>
                        <span style={{ fontSize: 18 }}>{tipeIcon(a.tipe)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{a.nama}</div>
                          <div style={{ fontSize: 11, color: '#8C7B6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.url}</div>
                        </div>
                        <button onClick={() => setEditingAkses({ tahapanId: t.id, akses: a })} style={btnGhostSm}>Edit</button>
                        <button onClick={() => deleteAkses(t.id, a.id)} style={btnDangerSm}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tahapan */}
      {editing && (
        <Modal title={editing.id ? 'Edit Tahapan' : 'Tambah Tahapan'} onClose={() => setEditing(null)}>
          <div style={formCol}>
            <Field label="Judul"><input value={editing.judul ?? ''} onChange={e => setEditing({ ...editing, judul: e.target.value })} style={input} /></Field>
            <Field label="Periode (display)"><input value={editing.periode ?? ''} onChange={e => setEditing({ ...editing, periode: e.target.value })} placeholder="Jan – Apr 2026" style={input} /></Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Mulai (opsional)"><input type="date" value={editing.start_date ?? ''} onChange={e => setEditing({ ...editing, start_date: e.target.value || null })} style={input} /></Field>
              <Field label="Selesai (opsional)"><input type="date" value={editing.end_date ?? ''} onChange={e => setEditing({ ...editing, end_date: e.target.value || null })} style={input} /></Field>
            </div>
            <Field label="Status">
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as TahapanStatus })} style={input}>
                {STATUS_OPTS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Icon (emoji)"><input value={editing.icon ?? ''} onChange={e => setEditing({ ...editing, icon: e.target.value })} maxLength={4} style={{ ...input, width: 80 }} /></Field>
              <Field label="Urutan"><input type="number" value={editing.urutan ?? 0} onChange={e => setEditing({ ...editing, urutan: Number(e.target.value) })} style={input} /></Field>
            </div>
            <Field label="Deskripsi"><textarea value={editing.deskripsi ?? ''} onChange={e => setEditing({ ...editing, deskripsi: e.target.value })} rows={3} style={{ ...input, resize: 'vertical' }} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setEditing(null)} style={btnGhost}>Batal</button>
              <button onClick={saveTahapan} style={btnPrimary}>Simpan</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Akses */}
      {editingAkses && (
        <Modal title={editingAkses.akses.id ? 'Edit Akses Lanjutan' : 'Tambah Akses Lanjutan'} onClose={() => setEditingAkses(null)}>
          <div style={formCol}>
            <Field label="Nama"><input value={editingAkses.akses.nama ?? ''} onChange={e => setEditingAkses({ ...editingAkses, akses: { ...editingAkses.akses, nama: e.target.value } })} placeholder="Pedoman Pencacahan SE2026" style={input} /></Field>
            <Field label="URL"><input value={editingAkses.akses.url ?? ''} onChange={e => setEditingAkses({ ...editingAkses, akses: { ...editingAkses.akses, url: e.target.value } })} placeholder="https://drive.google.com/..." style={input} /></Field>
            <Field label="Tipe">
              <select value={editingAkses.akses.tipe} onChange={e => setEditingAkses({ ...editingAkses, akses: { ...editingAkses.akses, tipe: e.target.value as TahapanAksesTipe } })} style={input}>
                {TIPE_OPTS.map(t => <option key={t.v} value={t.v}>{t.icon} {t.label}</option>)}
              </select>
            </Field>
            <Field label="Urutan"><input type="number" value={editingAkses.akses.urutan ?? 0} onChange={e => setEditingAkses({ ...editingAkses, akses: { ...editingAkses.akses, urutan: Number(e.target.value) } })} style={input} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setEditingAkses(null)} style={btnGhost}>Batal</button>
              <button onClick={saveAkses} style={btnPrimary}>Simpan</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ---------- styles & small components ---------- */

const card: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 18, border: '1px solid #EDE3D8', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties   = { padding: '8px 14px', borderRadius: 8, background: 'transparent', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnGhostSm: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, background: 'transparent', color: '#E8751A', border: '1px solid #EDE3D8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties  = { padding: '8px 14px', borderRadius: 8, background: '#FFF1F2', color: '#E8192C', border: '1.5px solid #FECDD3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnDangerSm: React.CSSProperties = { padding: '4px 9px', borderRadius: 6, background: 'transparent', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const formCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const errBox: React.CSSProperties = { background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E8192C', marginBottom: 14 }

function statusBadge(s: TahapanStatus): React.CSSProperties {
  const bg = s === 'selesai' ? '#E8FFF3' : s === 'aktif' ? '#FFF0DC' : '#F5F5F5'
  const fg = s === 'selesai' ? '#00A651' : s === 'aktif' ? '#E8751A' : '#6B6B6B'
  return { background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#3D3D3D', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</span>
      {children}
    </label>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#8C7B6B', padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
