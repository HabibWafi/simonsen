'use client'

import { useState } from 'react'

const kecamatanList = [
  'Muara Beliti', 'Tugumulyo', 'BTS Ulu', 'Rawas Ulu', 'Karang Jaya',
  'Muara Lakitan', 'Jayaloka', 'Sukakarya', 'Megang Sakti', 'Rawas Ilir',
  'Bulang Tengah Suku Ulu', 'STL Ulu Terawas', 'Selangit', 'Tiang Pumpung Kepungut',
]

const kategoriOptions = [
  { id: 'perdagangan', label: '🏪 Perdagangan' },
  { id: 'akomodasi', label: '🍽️ Akomodasi & Makan' },
  { id: 'industri', label: '🏭 Industri' },
  { id: 'jasa', label: '🔧 Jasa' },
  { id: 'transportasi', label: '🚗 Transportasi' },
  { id: 'keuangan', label: '🏦 Keuangan' },
  { id: 'pendidikan', label: '🎓 Pendidikan' },
  { id: 'kesehatan', label: '🏥 Kesehatan' },
]

const kendalaOptions = ['Tidak ada kendala', 'Usaha tutup sementara', 'Responden tidak ada di tempat', 'Responden menolak', 'Akses jalan sulit', 'Cuaca buruk', 'Lainnya']

type FormData = {
  tanggal: string
  kecamatan: string
  desa: string
  blok_sensus: string
  didatangi: number
  dicacah: number
  kosong: number
  tolak: number
  kategori: string[]
  kendala: string
  catatan: string
  lat: string
  lng: string
}

export default function LaporanPage() {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<FormData>({
    tanggal: today,
    kecamatan: '',
    desa: '',
    blok_sensus: '',
    didatangi: 0,
    dicacah: 0,
    kosong: 0,
    tolak: 0,
    kategori: [],
    kendala: '',
    catatan: '',
    lat: '',
    lng: '',
  })
  const [loadingGps, setLoadingGps] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const stepper = (key: 'didatangi' | 'dicacah' | 'kosong' | 'tolak', delta: number) =>
    setField(key, Math.max(0, form[key] + delta) as number)

  const toggleKat = (id: string) =>
    setField('kategori', form.kategori.includes(id) ? form.kategori.filter(k => k !== id) : [...form.kategori, id])

  const getGps = () => {
    setLoadingGps(true)
    navigator.geolocation?.getCurrentPosition(
      pos => { setField('lat', String(pos.coords.latitude.toFixed(7))); setField('lng', String(pos.coords.longitude.toFixed(7))); setLoadingGps(false) },
      () => setLoadingGps(false)
    )
  }

  const isValid = form.kecamatan && form.desa && form.blok_sensus && form.didatangi > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1400))
    setSubmitting(false)
    setSuccess(true)
  }

  const handleDraft = async () => {
    setSavingDraft(true)
    await new Promise(r => setTimeout(r, 800))
    setSavingDraft(false)
    alert('Draft berhasil disimpan.')
  }

  if (success) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' as const, padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 40, border: '1px solid #EDE3D8', boxShadow: '0 4px 32px rgba(0,165,81,.12)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E8FFF3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>Laporan Terkirim!</h2>
          <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.7, marginBottom: 28 }}>
            Laporan harian untuk <strong>{form.kecamatan}</strong> – {form.desa} berhasil dikirim.<br />
            Total <strong>{form.dicacah} usaha</strong> berhasil dicacah.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setForm({ tanggal: today, kecamatan: '', desa: '', blok_sensus: '', didatangi: 0, dicacah: 0, kosong: 0, tolak: 0, kategori: [], kendala: '', catatan: '', lat: '', lng: '' }); setSuccess(false) }} style={{ padding: '12px 24px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Input Laporan Baru
            </button>
            <button onClick={() => window.location.href = '/se/2026/dashboard'} style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>Input Laporan Harian</h1>
        <p style={{ fontSize: 13, color: '#6B6B6B' }}>Isi laporan pencacahan harian sebelum jam 17:00 WIB.</p>
      </div>

      {/* ── SECTION 1: Identitas ── */}
      <FormSection title="1. Identitas Pencacahan" icon="📍">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="id-grid">
          <Field label="Tanggal Pencacahan" required>
            <input type="date" value={form.tanggal} max={today} onChange={e => setField('tanggal', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Kecamatan" required>
            <select value={form.kecamatan} onChange={e => setField('kecamatan', e.target.value)} style={inputStyle}>
              <option value="">Pilih kecamatan…</option>
              {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Desa / Kelurahan" required>
            <input value={form.desa} onChange={e => setField('desa', e.target.value)} placeholder="Nama desa/kelurahan" style={inputStyle} />
          </Field>
          <Field label="Nomor Blok Sensus" required>
            <input value={form.blok_sensus} onChange={e => setField('blok_sensus', e.target.value)} placeholder="Contoh: 001A" style={inputStyle} />
          </Field>
        </div>
      </FormSection>

      {/* ── SECTION 2: Rekapitulasi ── */}
      <FormSection title="2. Rekapitulasi Usaha" icon="📊">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="rekap-grid">
          {([
            { key: 'didatangi', label: 'Usaha Didatangi', color: '#1877F2' },
            { key: 'dicacah',   label: 'Berhasil Dicacah', color: '#00A651' },
            { key: 'kosong',    label: 'Usaha Kosong / Tutup', color: '#F5A623' },
            { key: 'tolak',     label: 'Menolak Didata', color: '#E8192C' },
          ] as { key: 'didatangi'|'dicacah'|'kosong'|'tolak', label: string, color: string }[]).map(s => (
            <div key={s.key} style={{ background: '#FAF8F5', borderRadius: 10, padding: '14px 16px', border: '1px solid #EDE3D8' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 10 }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => stepper(s.key, -1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #EDE3D8', background: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B6B6B' }}>−</button>
                <span style={{ fontSize: 26, fontWeight: 900, color: s.color, minWidth: 40, textAlign: 'center' as const }}>{form[s.key]}</span>
                <button onClick={() => stepper(s.key, 1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #E8751A', background: '#FFF0DC', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8751A', fontWeight: 700 }}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FDF6EE', borderRadius: 8, padding: '10px 14px', marginTop: 12, display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(232,117,26,.2)' }}>
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>Total usaha didatangi</span>
          <strong style={{ fontSize: 14, color: '#E8751A' }}>{form.didatangi} usaha</strong>
        </div>
      </FormSection>

      {/* ── SECTION 3: Kategori ── */}
      <FormSection title="3. Kategori Usaha yang Dicacah" icon="🏷️">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {kategoriOptions.map(k => {
            const selected = form.kategori.includes(k.id)
            return (
              <button key={k.id} onClick={() => toggleKat(k.id)} style={{
                padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s',
                background: selected ? '#E8751A' : 'white',
                color: selected ? 'white' : '#3D3D3D',
                boxShadow: selected ? '0 2px 8px rgba(232,117,26,.3)' : '0 1px 4px rgba(0,0,0,.08)',
              }}>
                {k.label}
              </button>
            )
          })}
        </div>
        {form.kategori.length > 0 && (
          <p style={{ fontSize: 12, color: '#00A651', marginTop: 8 }}>✓ {form.kategori.length} kategori dipilih</p>
        )}
      </FormSection>

      {/* ── SECTION 4: Kendala & Catatan ── */}
      <FormSection title="4. Kendala & Catatan" icon="📝">
        <Field label="Kendala Utama">
          <select value={form.kendala} onChange={e => setField('kendala', e.target.value)} style={inputStyle}>
            <option value="">Pilih kendala (opsional)…</option>
            {kendalaOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Catatan Tambahan" style={{ marginTop: 12 }}>
          <textarea value={form.catatan} onChange={e => setField('catatan', e.target.value)} placeholder="Catatan tambahan tentang kondisi lapangan, informasi khusus, dll (opsional)" rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </Field>
        {/* Foto upload placeholder */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>Foto Dokumentasi (maks. 3)</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 1, 2].map(i => (
              <label key={i} style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed #EDE3D8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAFA', flexShrink: 0 }}>
                <span style={{ fontSize: 24, color: '#EDE3D8' }}>📷</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} />
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      {/* ── SECTION 5: Lokasi GPS ── */}
      <FormSection title="5. Lokasi GPS" icon="📡">
        <button onClick={getGps} disabled={loadingGps} style={{ padding: '10px 20px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: loadingGps ? 'not-allowed' : 'pointer', opacity: loadingGps ? .7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          {loadingGps ? '📡 Mendeteksi lokasi…' : '📍 Deteksi Lokasi Sekarang'}
        </button>
        {(form.lat || form.lng) && (
          <div style={{ marginTop: 12, background: '#E8FFF3', borderRadius: 8, padding: '10px 14px', border: '1px solid #BBF7D0', fontSize: 13, color: '#00A651', fontWeight: 600 }}>
            ✓ Lokasi terdeteksi: {form.lat}, {form.lng}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Field label="Latitude (manual)">
            <input value={form.lat} onChange={e => setField('lat', e.target.value)} placeholder="-3.0000000" style={inputStyle} />
          </Field>
          <Field label="Longitude (manual)">
            <input value={form.lng} onChange={e => setField('lng', e.target.value)} placeholder="102.9000000" style={inputStyle} />
          </Field>
        </div>
      </FormSection>

      {/* ── FIXED BOTTOM BAR ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #EDE3D8', padding: '14px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end', zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,.08)' }}>
        <button onClick={handleDraft} disabled={savingDraft} style={{ padding: '12px 24px', borderRadius: 8, background: 'transparent', color: '#E8751A', border: '1.5px solid #E8751A', fontSize: 14, fontWeight: 600, cursor: savingDraft ? 'not-allowed' : 'pointer', opacity: savingDraft ? .7 : 1 }}>
          {savingDraft ? 'Menyimpan…' : '💾 Simpan Draft'}
        </button>
        <button onClick={handleSubmit} disabled={!isValid || submitting} style={{ padding: '12px 28px', borderRadius: 8, background: isValid && !submitting ? '#E8751A' : '#EDE3D8', color: isValid && !submitting ? 'white' : '#6B6B6B', border: 'none', fontSize: 14, fontWeight: 700, cursor: isValid && !submitting ? 'pointer' : 'not-allowed', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8 }}>
          {submitting ? <><Spinner /> Mengirim…</> : '📤 Kirim Laporan'}
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .id-grid, .rekap-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Helper components ── */
function FormSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #EDE3D8', background: '#FDF6EE', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{title}</span>
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  )
}

function Field({ label, required, children, style }: { label: string; required?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', display: 'block', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#E8192C' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #EDE3D8', fontSize: 13, outline: 'none',
  transition: 'border-color .2s', boxSizing: 'border-box',
  background: 'white', color: '#1A1A1A',
}
