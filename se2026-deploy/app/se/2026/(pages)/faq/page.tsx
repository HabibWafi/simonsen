'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import WaveLoop from '@/components/decor/WaveLoop'
import { motion, AnimatePresence } from 'framer-motion'

const FAQ_DATA = [
  {
    kategori: 'Tentang SE2026',
    icon: '📋',
    items: [
      { q: 'Apa itu Sensus Ekonomi 2026?', a: 'Sensus Ekonomi 2026 (SE2026) adalah kegiatan pendataan menyeluruh seluruh usaha/perusahaan non-pertanian di Indonesia yang dilaksanakan setiap 10 tahun sekali oleh BPS. SE2026 bertujuan memperoleh data lengkap tentang jumlah, struktur, karakteristik, dan distribusi usaha di seluruh Indonesia.' },
      { q: 'Mengapa SE2026 penting untuk Musi Rawas?', a: 'Data SE2026 menjadi dasar perencanaan pembangunan ekonomi daerah Kabupaten Musi Rawas. Dengan data yang akurat, pemerintah dapat merancang kebijakan yang tepat sasaran, mendukung UMKM, dan mendorong pertumbuhan ekonomi lokal.' },
      { q: 'Kapan SE2026 dilaksanakan di Musi Rawas?', a: 'Pencacahan online mulai Mei 2026, pendataan door-to-door 15 Juni – 31 Agustus 2026. Seluruh usaha non-pertanian di 14 kecamatan Kabupaten Musi Rawas akan didata.' },
    ],
  },
  {
    kategori: 'Partisipasi',
    icon: '🤝',
    items: [
      { q: 'Siapa yang harus berpartisipasi dalam SE2026?', a: 'Seluruh pelaku usaha non-pertanian: pedagang, pengusaha, penyedia jasa, industri, dll. Termasuk usaha rumahan, warung, toko, bengkel, salon, restoran, dan semua jenis usaha skala mikro hingga besar.' },
      { q: 'Bagaimana cara mendaftar SE2026 secara online?', a: 'Kunjungi portal sensus.bps.go.id/se2026, klik "Daftar Usaha Saya", masukkan NIK/NPWP, isi informasi usaha (nama, jenis, lokasi, jumlah pekerja, omset), dan submit. Proses tidak lebih dari 15 menit.' },
      { q: 'Apakah wajib mengikuti SE2026?', a: 'Ya, berdasarkan UU No. 16 Tahun 1997 tentang Statistik, semua usaha wajib memberikan keterangan yang diperlukan oleh BPS. Namun dalam praktiknya, SE2026 dijalankan dengan pendekatan partisipatif dan kooperatif.' },
    ],
  },
  {
    kategori: 'Privasi & Keamanan',
    icon: '🔒',
    items: [
      { q: 'Apakah data usaha saya aman dan rahasia?', a: 'Sepenuhnya aman. BPS wajib menjaga kerahasiaan data berdasarkan UU Statistik. Data TIDAK akan dibagikan ke instansi lain (termasuk pajak), hanya digunakan untuk keperluan statistik secara agregat.' },
      { q: 'Apa yang terjadi jika saya memberikan data yang salah?', a: 'Berikan data seakurat mungkin. Data SE2026 yang akurat menguntungkan Anda karena menjadi dasar kebijakan yang tepat sasaran, seperti program bantuan UMKM, pengembangan infrastruktur, dan kebijakan ekonomi daerah.' },
    ],
  },
  {
    kategori: 'Teknis',
    icon: '⚙️',
    items: [
      { q: 'Bagaimana jika usaha saya belum didatangi petugas?', a: 'Hubungi BPS Kabupaten Musi Rawas di (0733) 123456 atau WhatsApp 0812-3456-7890. Anda juga bisa mendaftar secara mandiri melalui portal online sensus.bps.go.id/se2026.' },
      { q: 'Apa yang harus disiapkan sebelum petugas datang?', a: 'Siapkan: nama dan alamat usaha, jenis usaha (kategori lapangan usaha), jumlah pekerja (tetap dan tidak tetap), perkiraan omset/pendapatan per tahun, dan alamat email/nomor WA aktif.' },
    ],
  },
]

type Message = { role: 'user' | 'bot'; text: string }

const QUICK_REPLIES = [
  'Apa itu SE2026?',
  'Cara daftar online',
  'Jadwal pencacahan',
  'Apakah data aman?',
  'Hubungi petugas',
]

const BOT_ANSWERS: Record<string, string> = {
  'apa itu se2026': 'SE2026 adalah Sensus Ekonomi 2026 — pendataan seluruh usaha non-pertanian di Indonesia. Di Musi Rawas, ada 9.960 target usaha yang akan didata oleh 40 petugas BPS di 14 kecamatan.',
  'cara daftar online': 'Daftar online di sensus.bps.go.id/se2026. Siapkan NIK/NPWP dan informasi usaha Anda. Proses hanya 10-15 menit. Atau tunggu kunjungan petugas BPS.',
  'jadwal pencacahan': 'Pencacahan online: Mei – Agustus 2026. Pendataan door-to-door: 15 Juni – 31 Agustus 2026. Saat ini, 4 kecamatan sudah aktif melakukan pendataan.',
  'apakah data aman': 'Data 100% aman dan rahasia berdasarkan UU No. 16/1997. Data TIDAK dibagikan ke instansi lain termasuk pajak. Hanya digunakan untuk keperluan statistik.',
  'hubungi petugas': 'Hubungi BPS Kab. Musi Rawas:\n📞 Telepon: (0733) 123456\n💬 WhatsApp: 0812-3456-7890\n✉️ Email: bps1604@bps.go.id\n🕐 Jam kerja: Senin-Jumat 08:00-16:00 WIB',
}

function getBotReply(text: string): string {
  const lower = text.toLowerCase()
  for (const [key, val] of Object.entries(BOT_ANSWERS)) {
    if (lower.includes(key.split(' ')[0])) return val
  }
  return 'Terima kasih atas pertanyaan Anda! Untuk informasi lebih detail, silakan hubungi petugas BPS Kabupaten Musi Rawas atau kunjungi portal resmi sensus.bps.go.id/se2026. 😊'
}

export default function FaqPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Halo! Saya Asisten SE2026 Musi Rawas. Tanyakan apa saja seputar Sensus Ekonomi 2026 di Kabupaten Musi Rawas! 😊' }
  ])
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', text }, { role: 'bot', text: getBotReply(text) }])
    setInput('')
  }

  return (
    <>
      {/* Hero */}
      <section className="hero-flush-navbar" style={{ background: 'linear-gradient(135deg, #E8751A 0%, #C85E0A 100%)', padding: '56px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 16px)' }} />
        <WaveLoop position="top-right" size={380} opacity={0.22} variant="ribbon" />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>Beranda</Link>
            <span>›</span><span style={{ color: 'white' }}>FAQ</span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: 'white', marginBottom: 12 }}>Tanya Jawab SE2026</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 520 }}>Temukan jawaban atas pertanyaan Anda seputar Sensus Ekonomi 2026 atau chat langsung dengan asisten kami.</p>
        </div>
        <svg viewBox="0 0 1440 80" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#FAF8F5" />
        </svg>
      </section>

      <section style={{ background: '#FAF8F5', padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Chatbot widget — prominent */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 4px 32px rgba(232,117,26,.10)', marginBottom: 56 }}>
            {/* Header */}
            <div style={{ background: '#E8751A', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Asisten SE2026 Musi Rawas</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, background: '#4ADE80', borderRadius: '50%', display: 'inline-block' }} /> Online · Siap membantu
                  </div>
                </div>
              </div>
              <a href="https://wa.me/6281234567890?text=Halo%20BPS%20Musi%20Rawas%2C%20saya%20punya%20pertanyaan%20tentang%20SE2026" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 8, background: '#25D366', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💬</span> Chat via WA
              </a>
            </div>

            {/* Messages */}
            <div style={{ height: 300, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFAFA' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'bot' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF0DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>🤖</div>}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                    background: m.role === 'user' ? '#E8751A' : 'white',
                    color: m.role === 'user' ? 'white' : '#1A1A1A',
                    fontSize: 13, lineHeight: 1.65,
                    boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                    whiteSpace: 'pre-line',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick replies */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #EDE3D8', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'white' }}>
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid #E8751A', color: '#E8751A', fontSize: 12, fontWeight: 600, background: 'white', cursor: 'pointer', transition: 'all .15s' }}
                  className="quick-btn">
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #EDE3D8', display: 'flex', gap: 10, background: 'white' }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder="Ketik pertanyaan Anda…"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 13, outline: 'none' }}
              />
              <button onClick={() => sendMessage(input)} style={{ padding: '10px 20px', borderRadius: 8, background: '#E8751A', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Kirim
              </button>
            </div>
          </div>

          {/* FAQ Accordion */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#E8751A', marginBottom: 8, textAlign: 'center' as const }}>Pertanyaan Umum</p>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#1A1A1A', marginBottom: 40, textAlign: 'center' as const }}>FAQ Lengkap</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }} className="faq-grid">
            {FAQ_DATA.map(cat => (
              <div key={cat.kategori}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{cat.icon}</span> {cat.kategori}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cat.items.map((item, j) => {
                    const key = `${cat.kategori}-${j}`
                    const isOpen = openFaq === key
                    return (
                      <motion.div key={j} layout style={{ background: 'white', borderRadius: 10, border: `1px solid ${isOpen ? '#E8751A' : '#EDE3D8'}`, overflow: 'hidden' }}>
                        <button onClick={() => setOpenFaq(isOpen ? null : key)} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isOpen ? '#E8751A' : '#1A1A1A', flex: 1, marginRight: 12, lineHeight: 1.4 }}>{item.q}</span>
                          <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} style={{ fontSize: 16, color: '#E8751A', flexShrink: 0, display: 'inline-block' }}>+</motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ padding: '0 16px 14px', fontSize: 13, color: '#6B6B6B', lineHeight: 1.7 }}>{item.a}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Contact card */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #EDE3D8', padding: 32, marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, boxShadow: '0 2px 16px rgba(232,117,26,.07)' }} className="contact-grid">
            {[
              { icon: '💬', label: 'WhatsApp', val: '0812-3456-7890', link: 'https://wa.me/6281234567890', color: '#25D366' },
              { icon: '✉️', label: 'Email', val: 'bps1604@bps.go.id', link: 'mailto:bps1604@bps.go.id', color: '#E8751A' },
              { icon: '📞', label: 'Telepon', val: '(0733) 123456', link: 'tel:+62733123456', color: '#1877F2' },
            ].map(c => (
              <a key={c.label} href={c.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' as const, padding: 20, borderRadius: 12, border: '1px solid #EDE3D8', textDecoration: 'none', transition: 'transform .2s' }} className="contact-card">
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.val}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .quick-btn:hover { background: #E8751A !important; color: white !important; }
        .contact-card:hover { transform: translateY(-3px); box-shadow: 0 4px 16px rgba(0,0,0,.08); }
        @media (max-width: 768px) {
          .faq-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
