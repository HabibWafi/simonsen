'use client'

import { useEffect, useState } from 'react'

type Anggota = {
  id: number
  nama: string
  peran: string
  foto: string | null
  tipe: 'struktural' | 'pj_kecamatan'
  kdkec: string | null
  nmkec: string | null
  urutan: number
}
type Kec = { kdkec: string; nmkec: string }

const emptyAnggota = (tipe: 'struktural' | 'pj_kecamatan'): Partial<Anggota> => ({
  nama: '', peran: tipe === 'pj_kecamatan' ? 'PJ Kecamatan' : '', foto: null, tipe, kdkec: null, nmkec: null, urutan: 0,
})

export default function DashboardTimPage() {
  const [items, setItems] = useState<Anggota[]>([])
  const [kecs, setKecs] = useState<Kec[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Anggota> | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [t, k] = await Promise.all([
        fetch('/api/admin/tim').then(r => r.json()),
        fetch('/api/admin/kecamatan').then(r => r.json()),
      ])
      setItems(t.data ?? [])
      setKecs(k.data ?? [])
    } catch (e: any) { setError(e.message ?? 'Gagal memuat') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function uploadFoto(file: File) {
    setUploading(true); setError('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('folder', 'tim')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Upload gagal')
      setEditing(prev => prev ? { ...prev, foto: j.url } : prev)
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false) }
  }

  async function save() {
    if (!editing) return
    setError('')
    if (!editing.nama?.trim() || !editing.peran?.trim()) { setError('Nama & peran wajib diisi'); return }
    const isNew = !editing.id
    const res = await fetch(isNew ? '/api/admin/tim' : `/api/admin/tim/${editing.id}`, {
      method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Gagal menyimpan'); return }
    setEditing(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Hapus anggota ini?')) return
    const res = await fetch(`/api/admin/tim/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Gagal menghapus'); return }
    load()
  }

  const struktural = items.filter(i => i.tipe === 'struktural')
  const pj = items.filter(i => i.tipe === 'pj_kecamatan')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Kelola Tim SE2026</h1>
        <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Kelola foto, nama, dan peran tim struktural serta Penanggung Jawab (PJ) per kecamatan.</p>
      </div>
      {error && <div style={errBox}>{error}</div>}
      {loading ? <div style={{ color: '#6B6B6B' }}>Memuat…</div> : (
        <>
          <Section title="Tim Struktural" onAdd={() => setEditing(emptyAnggota('struktural'))}>
            {struktural.length === 0 && <Empty />}
            {struktural.map(a => <Row key={a.id} a={a} onEdit={() => setEditing(a)} onDel={() => remove(a.id)} />)}
          </Section>

          <Section title="PJ Kecamatan" onAdd={() => setEditing(emptyAnggota('pj_kecamatan'))}>
            {pj.length === 0 && <Empty />}
            {pj.map(a => <Row key={a.id} a={a} onEdit={() => setEditing(a)} onDel={() => remove(a.id)} />)}
          </Section>
        </>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Anggota' : 'Tambah Anggota'} onClose={() => setEditing(null)}>
          <div style={formCol}>
            <Field label="Nama"><input value={editing.nama ?? ''} onChange={e => setEditing({ ...editing, nama: e.target.value })} style={input} /></Field>
            <Field label="Peran / Jabatan"><input value={editing.peran ?? ''} onChange={e => setEditing({ ...editing, peran: e.target.value })} style={input} /></Field>

            {editing.tipe === 'pj_kecamatan' && (
              <Field label="Kecamatan">
                <select
                  value={editing.kdkec ?? ''}
                  onChange={e => {
                    const k = kecs.find(x => x.kdkec === e.target.value)
                    setEditing({ ...editing, kdkec: k?.kdkec ?? null, nmkec: k?.nmkec ?? null })
                  }}
                  style={input}
                >
                  <option value="">— pilih kecamatan —</option>
                  {kecs.map(k => <option key={k.kdkec} value={k.kdkec}>{k.nmkec}</option>)}
                </select>
              </Field>
            )}

            <Field label="Foto — otomatis dikompres ke WebP">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {editing.foto && <img src={editing.foto} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid #EDE3D8' }} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFoto(f) }} style={{ fontSize: 12 }} />
                {uploading && <span style={{ fontSize: 12, color: '#8C7B6B' }}>mengunggah…</span>}
                {editing.foto && <button onClick={() => setEditing({ ...editing, foto: null })} style={btnDangerSm}>hapus</button>}
              </div>
            </Field>

            <Field label="Urutan"><input type="number" value={editing.urutan ?? 0} onChange={e => setEditing({ ...editing, urutan: Number(e.target.value) })} style={input} /></Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setEditing(null)} style={btnGhost}>Batal</button>
              <button onClick={save} disabled={uploading} style={btnPrimary}>Simpan</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</h2>
        <button onClick={onAdd} style={btnPrimary}>+ Tambah</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>{children}</div>
    </div>
  )
}

function Row({ a, onEdit, onDel }: { a: Anggota; onEdit: () => void; onDel: () => void }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#E8751A,#C85E0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
          {a.foto ? <img src={a.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.nama.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{a.nama}</div>
          <div style={{ fontSize: 12, color: '#6B6B6B' }}>{a.peran}{a.nmkec ? ` · ${a.nmkec}` : ''}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={onEdit} style={btnGhostSm}>Edit</button>
        <button onClick={onDel} style={btnDangerSm}>Hapus</button>
      </div>
    </div>
  )
}

const Empty = () => <div style={{ fontSize: 13, color: '#8C7B6B', fontStyle: 'italic' }}>Belum ada data.</div>

const card: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 14, border: '1px solid #EDE3D8' }
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, background: 'transparent', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnGhostSm: React.CSSProperties = { padding: '5px 12px', borderRadius: 6, background: 'transparent', color: '#E8751A', border: '1px solid #EDE3D8', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const btnDangerSm: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, background: '#FFF1F2', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const formCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const errBox: React.CSSProperties = { background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E8192C', marginBottom: 14 }

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
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#8C7B6B', padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
