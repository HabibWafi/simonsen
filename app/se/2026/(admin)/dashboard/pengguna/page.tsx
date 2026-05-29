'use client'

import { useEffect, useState } from 'react'
import type { User, Role } from '@/types'

interface KecOpt { kdkec: string; nmkec: string }

const ROLE_OPTS: { v: Role; label: string; color: string }[] = [
  { v: 'admin',       label: 'Admin',       color: '#E8192C' },
  { v: 'koordinator', label: 'Koordinator', color: '#1877F2' },
  { v: 'petugas',     label: 'Petugas',     color: '#00A651' },
]

const emptyUser = () => ({ nip: '', nama: '', role: 'petugas' as Role, kdkec: '', password: '' })

export default function PenggunaPage() {
  const [users, setUsers] = useState<User[]>([])
  const [kecs, setKecs] = useState<KecOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [filterRole, setFilterRole] = useState<'' | Role>('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [u, k] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/admin/kecamatan').then(r => r.json()),
      ])
      setUsers(u.data ?? [])
      setKecs(k.data ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false
    if (search) {
      const q = search.toLowerCase()
      if (!u.nip.toLowerCase().includes(q) && !u.nama.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function save() {
    if (!editing) return
    setError('')
    const isNew = !editing.id
    const url = isNew ? '/api/admin/users' : `/api/admin/users/${editing.id}`
    const payload = { ...editing }
    if (!isNew && !payload.password) delete payload.password
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menyimpan')
      return
    }
    setEditing(null); load()
  }

  async function remove(id: number) {
    if (!confirm('Hapus pengguna ini?')) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Gagal menghapus')
      return
    }
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Kelola Pengguna</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Tambah admin, koordinator, dan petugas. Password di-hash bcrypt.</p>
        </div>
        <button onClick={() => setEditing(emptyUser())} style={btnPrimary}>+ Tambah Pengguna</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Cari NIP atau nama…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...input, maxWidth: 280 }}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)} style={{ ...input, maxWidth: 200 }}>
          <option value="">Semua Role</option>
          {ROLE_OPTS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8C7B6B', alignSelf: 'center' }}>
          {filtered.length} dari {users.length} pengguna
        </div>
      </div>

      {error && <div style={errBox}>{error}</div>}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#FAF8F5', textAlign: 'left' as const }}>
                <th style={th}>NIP</th>
                <th style={th}>Nama</th>
                <th style={th}>Role</th>
                <th style={th}>Kecamatan</th>
                <th style={{ ...th, textAlign: 'right' as const }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6B6B6B' }}>Memuat…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#8C7B6B', fontStyle: 'italic' }}>Tidak ada pengguna.</td></tr>
              ) : filtered.map(u => {
                const roleMeta = ROLE_OPTS.find(r => r.v === u.role)
                const kecName = kecs.find(k => k.kdkec === u.kdkec)?.nmkec ?? u.kecamatan ?? '—'
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #EDE3D8' }}>
                    <td style={td}><code style={{ fontSize: 12, background: '#F5EDE0', padding: '2px 6px', borderRadius: 4 }}>{u.nip}</code></td>
                    <td style={{ ...td, fontWeight: 600 }}>{u.nama}</td>
                    <td style={td}>
                      <span style={{ background: roleMeta?.color + '15', color: roleMeta?.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {roleMeta?.label}
                      </span>
                    </td>
                    <td style={td}>{kecName}</td>
                    <td style={{ ...td, textAlign: 'right' as const }}>
                      <button onClick={() => setEditing({ ...u, password: '' })} style={btnGhost}>Edit</button>
                      <button onClick={() => remove(u.id)} style={{ ...btnDanger, marginLeft: 6 }}>Hapus</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Pengguna' : 'Tambah Pengguna'} onClose={() => setEditing(null)}>
          <div style={formCol}>
            <Field label="NIP / Username"><input value={editing.nip ?? ''} onChange={e => setEditing({ ...editing, nip: e.target.value })} disabled={!!editing.id} style={input} /></Field>
            <Field label="Nama Lengkap"><input value={editing.nama ?? ''} onChange={e => setEditing({ ...editing, nama: e.target.value })} style={input} /></Field>
            <Field label="Role">
              <select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value as Role })} style={input}>
                {ROLE_OPTS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Kecamatan (untuk petugas)">
              <select value={editing.kdkec ?? ''} onChange={e => setEditing({ ...editing, kdkec: e.target.value || null })} style={input}>
                <option value="">— Semua / Tidak terikat —</option>
                {kecs.map(k => <option key={k.kdkec} value={k.kdkec}>{k.nmkec}</option>)}
              </select>
            </Field>
            <Field label={editing.id ? 'Password baru (kosongkan = tidak diubah)' : 'Password'}>
              <input type="password" value={editing.password ?? ''} onChange={e => setEditing({ ...editing, password: e.target.value })} style={input} />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setEditing(null)} style={btnGhost}>Batal</button>
              <button onClick={save} style={btnPrimary}>Simpan</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: 'transparent', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, background: '#FFF1F2', color: '#E8192C', border: '1.5px solid #FECDD3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const th: React.CSSProperties = { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5 }
const td: React.CSSProperties = { padding: '12px 14px', color: '#3D3D3D', verticalAlign: 'middle' as const }
const errBox: React.CSSProperties = { background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E8192C', marginBottom: 14 }
const formCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
