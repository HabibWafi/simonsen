'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

interface Token {
  id: number
  label: string
  prefix: string
  scopes: string[]
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

const SCOPES = [
  { id: 'read:progress',  label: 'Baca progress' },
  { id: 'write:progress', label: 'Tulis/update progress' },
  { id: 'read:usaha',     label: 'Baca daftar usaha' },
  { id: 'write:usaha',    label: 'Tulis/update daftar usaha' },
  { id: 'read:tahapan',   label: 'Baca tahapan' },
]

export default function ApiTokenPage() {
  const toast = useToast()
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [revealedToken, setRevealedToken] = useState<{ token: string; label: string } | null>(null)

  // Form
  const [label, setLabel] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read:progress'])
  const [expiresAt, setExpiresAt] = useState('')

  const fetchTokens = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/api-token')
      const j = await r.json()
      setTokens(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  async function createToken() {
    if (!label.trim()) { toast.warning('Label wajib diisi'); return }
    if (scopes.length === 0) { toast.warning('Pilih minimal 1 scope'); return }
    const res = await fetch('/api/admin/api-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, scopes, expires_at: expiresAt || null }),
    })
    const j = await res.json()
    if (!res.ok) { toast.error('Gagal create', j.error); return }
    setRevealedToken({ token: j.token, label: j.label })
    setShowCreate(false)
    setLabel(''); setScopes(['read:progress']); setExpiresAt('')
    await fetchTokens()
  }

  async function revokeToken(id: number, label: string) {
    if (!confirm(`Revoke token "${label}"? Aksi ini permanen.`)) return
    const res = await fetch(`/api/admin/api-token/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Gagal revoke'); return }
    toast.success('Token di-revoke', label)
    await fetchTokens()
  }

  function copyToken(t: string) {
    navigator.clipboard.writeText(t).then(() => toast.success('Token tersalin ke clipboard'))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>API Token & Integrasi External</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>
            Token untuk akses program/bot ke SE 2026. <strong>Token terikat ke sensus ini saja</strong> — tidak bisa dipakai untuk SP/ST.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Buat Token Baru
        </button>
      </div>

      {/* Quick doc */}
      <div style={{ background: '#FDF6EE', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#6B6B6B', border: '1px solid rgba(232,117,26,.18)' }}>
        <b style={{ color: '#C85E0A' }}>Contoh penggunaan:</b>
        <pre style={{ background: 'white', padding: 12, borderRadius: 8, fontSize: 11, overflow: 'auto', marginTop: 8, color: '#1A1A1A' }}>{`# Public read (anonymous)
curl ${typeof window !== 'undefined' ? window.location.origin : 'https://sensus.bpskabmusirawas.com'}/api/se/2026/public/progress

# External write (Bearer token, hanya SE2026)
curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://sensus.bpskabmusirawas.com'}/api/se/2026/external/progress \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[{"idsbr":"1620301234","status":"selesai","tanggal_cacah":"2026-05-30"}]}'`}</pre>
        <div style={{ marginTop: 6, fontSize: 11, color: '#8C7B6B' }}>Rate limit: 60 req/menit per token. Token SE2026 tidak bisa akses /api/sp/.. atau /api/st/..</div>
      </div>

      {/* Token list */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAF8F5', textAlign: 'left' as const }}>
              <th style={th}>Label</th>
              <th style={th}>Prefix</th>
              <th style={th}>Scopes</th>
              <th style={th}>Dibuat</th>
              <th style={th}>Last used</th>
              <th style={th}>Status</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#6B6B6B' }}>Memuat…</td></tr>
            ) : tokens.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#8C7B6B', fontStyle: 'italic' }}>Belum ada token. Buat token pertama untuk mulai integrasi.</td></tr>
            ) : tokens.map(t => {
              const revoked = !!t.revoked_at
              return (
                <tr key={t.id} style={{ borderTop: '1px solid #EDE3D8', opacity: revoked ? 0.55 : 1 }}>
                  <td style={{ ...td, fontWeight: 700 }}>{t.label}</td>
                  <td style={td}><code style={{ fontSize: 11, background: '#FAF8F5', padding: '2px 8px', borderRadius: 4 }}>{t.prefix}…</code></td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {t.scopes.map(s => <span key={s} style={{ background: '#FFF0DC', color: '#C85E0A', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{s}</span>)}
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#6B6B6B' }}>{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                  <td style={{ ...td, fontSize: 12, color: '#6B6B6B' }}>{t.last_used_at ? new Date(t.last_used_at).toLocaleString('id-ID') : '—'}</td>
                  <td style={td}>
                    {revoked
                      ? <span style={{ background: '#FFF1F2', color: '#E8192C', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>REVOKED</span>
                      : <span style={{ background: '#E8FFF3', color: '#00A651', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>AKTIF</span>}
                  </td>
                  <td style={td}>
                    {!revoked && (
                      <button onClick={() => revokeToken(t.id, t.label)} style={{ padding: '5px 10px', borderRadius: 6, background: '#FFF1F2', color: '#E8192C', border: '1px solid #FECDD3', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowCreate(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 14, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1A1A1A' }}>Buat Token API Baru</h2>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3D3D3D', marginBottom: 6 }}>Label / Nama Aplikasi</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="contoh: Bot Fasih Bridge" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3D3D3D', marginBottom: 6 }}>Scopes</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {SCOPES.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3D3D3D', cursor: 'pointer' }}>
                  <input type="checkbox" checked={scopes.includes(s.id)} onChange={e => setScopes(curr => e.target.checked ? [...curr, s.id] : curr.filter(x => x !== s.id))} style={{ accentColor: '#E8751A' }} />
                  <code style={{ fontSize: 11, background: '#FFF0DC', color: '#C85E0A', padding: '2px 6px', borderRadius: 4 }}>{s.id}</code>
                  <span>— {s.label}</span>
                </label>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3D3D3D', marginBottom: 6 }}>Kadaluarsa (opsional)</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #EDE3D8', fontSize: 13, marginBottom: 18, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 18px', borderRadius: 8, background: 'white', color: '#3D3D3D', border: '1.5px solid #EDE3D8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
              <button onClick={createToken} style={{ padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Buat Token</button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal modal — show plaintext ONCE */}
      {revealedToken && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.30)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1A1A1A' }}>✓ Token "{revealedToken.label}" berhasil dibuat</h2>
            <p style={{ fontSize: 12, color: '#C85E0A', background: '#FFF0DC', padding: '8px 12px', borderRadius: 8, marginBottom: 14, border: '1px solid rgba(232,117,26,.25)' }}>
              ⚠️ <strong>Salin token sekarang.</strong> Token tidak akan ditampilkan lagi setelah dialog ini ditutup.
            </p>
            <div style={{ background: '#0F1E3D', color: '#FFF0DC', padding: 14, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', marginBottom: 12 }}>
              {revealedToken.token}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => copyToken(revealedToken.token)} style={{ padding: '10px 18px', borderRadius: 8, background: '#FFF0DC', color: '#C85E0A', border: '1.5px solid rgba(232,117,26,.3)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 Copy Token</button>
              <button onClick={() => setRevealedToken(null)} style={{ padding: '10px 18px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Saya sudah simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .5 }
const td: React.CSSProperties = { padding: '12px 14px', color: '#3D3D3D', verticalAlign: 'middle' as const }
