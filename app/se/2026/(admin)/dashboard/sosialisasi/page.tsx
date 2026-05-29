'use client'

import { useEffect, useState } from 'react'

type Post = {
  id: number
  judul: string
  slug: string
  kategori: string
  excerpt: string | null
  konten?: string | null
  thumbnail: string | null
  media_type: 'none' | 'image' | 'video'
  video_url: string | null
  author: string
  published: number
  created_at: string
}

const KATEGORI = ['berita', 'sosialisasi', 'infografis', 'video', 'pengumuman']

const emptyPost = (): Partial<Post> => ({
  judul: '', kategori: 'berita', excerpt: '', konten: '', thumbnail: null,
  media_type: 'none', video_url: '', author: 'BPS Kab. Musi Rawas', published: 1,
})

export default function DashboardSosialisasiPage() {
  const [items, setItems] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Post> | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/posts').then(r => r.json())
      setItems(res.data ?? [])
    } catch (e: any) { setError(e.message ?? 'Gagal memuat') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function uploadThumb(file: File) {
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'posts')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Upload gagal')
      setEditing(prev => prev ? { ...prev, thumbnail: j.url, media_type: prev.media_type === 'video' ? 'video' : 'image' } : prev)
    } catch (e: any) { setError(e.message) }
    finally { setUploading(false) }
  }

  async function save() {
    if (!editing) return
    setError('')
    if (!editing.judul?.trim()) { setError('Judul wajib diisi'); return }
    const isNew = !editing.id
    // media_type: video bila ada video_url, image bila ada thumbnail, else none
    const media_type = editing.video_url ? 'video' : editing.thumbnail ? 'image' : 'none'
    const payload = { ...editing, media_type }
    const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${editing.id}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Gagal menyimpan'); return }
    setEditing(null); load()
  }

  async function togglePublish(p: Post) {
    await fetch(`/api/admin/posts/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: p.published ? 0 : 1 }),
    })
    load()
  }

  async function remove(id: number) {
    if (!confirm('Hapus konten ini?')) return
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError('Gagal menghapus'); return }
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Kelola Sosialisasi & Berita</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Buat dan kelola konten sosialisasi, berita, infografis, video, dan pengumuman SE2026.</p>
        </div>
        <button onClick={() => setEditing(emptyPost())} style={btnPrimary}>+ Tambah Konten</button>
      </div>

      {error && <div style={errBox}>{error}</div>}
      {loading ? <div style={{ color: '#6B6B6B' }}>Memuat…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.length === 0 && <div style={{ color: '#8C7B6B', fontStyle: 'italic' }}>Belum ada konten.</div>}
          {items.map(p => (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#FFF0DC,#F5EDE0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                  {p.thumbnail ? <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.media_type === 'video' ? '🎬' : '📄')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={kategoriBadge}>{p.kategori}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: p.published ? '#E8FFF3' : '#F5F5F5', color: p.published ? '#00A651' : '#6B6B6B' }}>
                      {p.published ? 'Terbit' : 'Draft'}
                    </span>
                    <span style={{ fontSize: 11, color: '#8C7B6B' }}>{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{p.judul}</div>
                  <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.excerpt}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => togglePublish(p)} style={btnGhost}>{p.published ? 'Jadikan Draft' : 'Terbitkan'}</button>
                  <button onClick={() => setEditing(p)} style={btnGhost}>Edit</button>
                  <button onClick={() => remove(p.id)} style={btnDanger}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Konten' : 'Tambah Konten'} onClose={() => setEditing(null)}>
          <div style={formCol}>
            <Field label="Judul"><input value={editing.judul ?? ''} onChange={e => setEditing({ ...editing, judul: e.target.value })} style={input} /></Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Kategori">
                <select value={editing.kategori} onChange={e => setEditing({ ...editing, kategori: e.target.value })} style={input}>
                  {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Penulis"><input value={editing.author ?? ''} onChange={e => setEditing({ ...editing, author: e.target.value })} style={input} /></Field>
            </div>
            <Field label="Ringkasan (excerpt)"><textarea value={editing.excerpt ?? ''} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} rows={2} style={{ ...input, resize: 'vertical' }} /></Field>
            <Field label="Konten (mendukung ## judul, ### sub, - list)"><textarea value={editing.konten ?? ''} onChange={e => setEditing({ ...editing, konten: e.target.value })} rows={8} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} /></Field>

            <Field label="Gambar (thumbnail) — otomatis dikompres ke WebP">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {editing.thumbnail && <img src={editing.thumbnail} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #EDE3D8' }} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumb(f) }} style={{ fontSize: 12 }} />
                {uploading && <span style={{ fontSize: 12, color: '#8C7B6B' }}>mengunggah…</span>}
                {editing.thumbnail && <button onClick={() => setEditing({ ...editing, thumbnail: null })} style={btnDangerSm}>hapus</button>}
              </div>
            </Field>

            <Field label="Embed Video URL (YouTube/Drive — untuk kategori video)">
              <input value={editing.video_url ?? ''} onChange={e => setEditing({ ...editing, video_url: e.target.value })} placeholder="https://www.youtube.com/embed/xxxx" style={input} />
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3D3D3D', fontWeight: 600 }}>
              <input type="checkbox" checked={!!editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked ? 1 : 0 })} />
              Terbitkan langsung
            </label>

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

const card: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 16, border: '1px solid #EDE3D8', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, background: 'transparent', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, background: '#FFF1F2', color: '#E8192C', border: '1.5px solid #FECDD3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnDangerSm: React.CSSProperties = { padding: '4px 9px', borderRadius: 6, background: 'transparent', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const formCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const errBox: React.CSSProperties = { background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E8192C', marginBottom: 14 }
const kategoriBadge: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFF0DC', color: '#C85E0A', textTransform: 'capitalize' }

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
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#8C7B6B', padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
