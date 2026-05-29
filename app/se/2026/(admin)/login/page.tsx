'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/se/2026/dashboard'

  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nip || !password) { setError('NIP dan password wajib diisi.'); return }
    setLoading(true); setError('')
    const res = await signIn('credentials', {
      nip, password,
      redirect: false,
      callbackUrl,
    })
    setLoading(false)
    if (res?.error) {
      setError('NIP atau password tidak valid. Hubungi koordinator Anda.')
    } else if (res?.ok) {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 68px)', background: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(232,117,26,.04) 0,rgba(232,117,26,.04) 1px,transparent 1px,transparent 18px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#E8751A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28 }}>📊</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>Portal SE2026</h1>
          <p style={{ fontSize: 13, color: '#6B6B6B' }}>BPS Kabupaten Musi Rawas</p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 32px rgba(232,117,26,.12)', border: '1px solid #EDE3D8' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>Login Petugas</h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 28 }}>Masuk untuk mengakses dashboard dan form laporan harian.</p>

          {error && (
            <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#E8192C', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ flexShrink: 0 }}>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', display: 'block', marginBottom: 6 }}>NIP / Username</label>
              <input
                value={nip} onChange={e => setNip(e.target.value)} autoComplete="username"
                placeholder="Masukkan NIP Anda"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1.5px solid ${error ? '#FECDD3' : '#EDE3D8'}`, fontSize: 14, outline: 'none', transition: 'border .2s', boxSizing: 'border-box' as const }}
                onFocus={e => (e.target.style.borderColor = '#E8751A')}
                onBlur={e => (e.target.style.borderColor = error ? '#FECDD3' : '#EDE3D8')}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                  placeholder="Masukkan password"
                  style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 8, border: `1.5px solid ${error ? '#FECDD3' : '#EDE3D8'}`, fontSize: 14, outline: 'none', transition: 'border .2s', boxSizing: 'border-box' as const }}
                  onFocus={e => (e.target.style.borderColor = '#E8751A')}
                  onBlur={e => (e.target.style.borderColor = error ? '#FECDD3' : '#EDE3D8')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6B6B6B' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#3D3D3D' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#E8751A' }} />
              Ingat saya selama 30 hari
            </label>

            <button type="submit" disabled={loading} style={{
              padding: '13px', borderRadius: 8, background: loading ? '#F5A623' : '#E8751A', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTop: '2.5px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Memverifikasi…</>
              ) : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div style={{ background: '#FDF6EE', borderRadius: 8, padding: '14px 16px', marginTop: 20, border: '1px solid rgba(232,117,26,.2)' }}>
            <p style={{ fontSize: 12, color: '#6B6B6B', lineHeight: 1.6, margin: 0 }}>
              💡 <strong style={{ color: '#C85E0A' }}>Belum punya akses?</strong> Hubungi koordinator kecamatan atau BPS Kab. Musi Rawas di <strong>(0733) 123456</strong>.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center' as const, marginTop: 20, fontSize: 13, color: '#6B6B6B' }}>
          <Link href="/" style={{ color: '#E8751A', textDecoration: 'none', fontWeight: 600 }}>← Kembali ke Beranda</Link>
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
