'use client'

import { mockStats, mockProgress } from '@/lib/mockData'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const barData = mockProgress.slice(0, 8).map(k => ({
  name: k.kecamatan.split(' ')[0],
  target: k.target_usaha,
  realisasi: k.realisasi,
}))

const trendData = Array.from({ length: 14 }, (_, i) => {
  const d = new Date('2026-05-02')
  d.setDate(d.getDate() - 13 + i)
  return {
    date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    usaha: Math.round(Math.random() * 80 + 40),
    kumulatif: 2000 + Math.round(i * 17 + Math.random() * 30),
  }
})

const recentActivity = [
  { waktu: '14:32', text: 'Ahmad (Muara Beliti) mengirim laporan 62 usaha', type: 'laporan' },
  { waktu: '13:15', text: 'Progress Tugumulyo diperbarui ke 40.7%', type: 'progress' },
  { waktu: '11:48', text: 'Budi (BTS Ulu) mengirim laporan 38 usaha', type: 'laporan' },
  { waktu: '10:22', text: 'Petugas baru ditambahkan di kec. Rawas Ulu', type: 'info' },
  { waktu: '09:05', text: 'Siti (Muara Lakitan) mengirim laporan 55 usaha', type: 'laporan' },
]

const activityColors: Record<string, string> = { laporan: '#E8751A', progress: '#00A651', info: '#1877F2' }

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="kpi-grid">
        {[
          { label: 'Total Usaha Target', val: mockStats.total_target.toLocaleString('id-ID'), sub: '14 kecamatan', icon: '🏪', change: null },
          { label: 'Sudah Dicacah', val: mockStats.total_realisasi.toLocaleString('id-ID'), sub: `${mockStats.persentase}% dari target`, icon: '✅', change: '+148 hari ini' },
          { label: 'Petugas Aktif', val: String(mockStats.petugas_aktif), sub: 'Lapor hari ini', icon: '👥', change: '+3 vs kemarin' },
          { label: 'Hari Tersisa', val: String(mockStats.hari_tersisa), sub: 'Hingga 31 Agt 2026', icon: '⏳', change: null },
        ].map((k, i) => (
          <div key={k.label} style={{ background: 'white', borderRadius: 12, padding: '20px 18px', border: '1px solid #EDE3D8', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF0DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#C85E0A', lineHeight: 1, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: k.change ? 8 : 0 }}>{k.label}</div>
            {k.change && <div style={{ fontSize: 11, fontWeight: 700, color: '#00A651', background: '#E8FFF3', padding: '3px 8px', borderRadius: 99, display: 'inline-block' }}>{k.change}</div>}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }} className="chart-grid">
        {/* Bar chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #EDE3D8', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Progress per Kecamatan (Top 8)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D8" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 12 }} />
              <Bar dataKey="target" name="Target" fill="#FFF0DC" stroke="#E8751A" strokeWidth={1} radius={[3,3,0,0]} />
              <Bar dataKey="realisasi" name="Realisasi" fill="#E8751A" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #EDE3D8', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Tren 14 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 0, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE3D8" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #EDE3D8', fontSize: 11 }} />
              <Line type="monotone" dataKey="kumulatif" name="Kumulatif" stroke="#E8751A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="usaha" name="Per hari" stroke="#F5A623" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }} className="bottom-grid">
        {/* Tabel rekap */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDE3D8' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Rekap Kecamatan</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FDF6EE' }}>
                  {['Kecamatan', 'Target', 'Realisasi', 'Progress', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase' as const, letterSpacing: .3, borderBottom: '1px solid #EDE3D8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockProgress.map((k, i) => (
                  <tr key={k.kecamatan} style={{ background: i % 2 ? '#FAFAFA' : 'white' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{k.kecamatan}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#3D3D3D' }}>{k.target_usaha.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#3D3D3D' }}>{k.realisasi.toLocaleString('id-ID')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, background: '#FFF0DC', borderRadius: 99, overflow: 'hidden', minWidth: 40 }}>
                          <div style={{ height: '100%', background: '#E8751A', width: `${k.persentase}%`, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#E8751A' }}>{k.persentase}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: k.status === 'berlangsung' ? '#FFF0DC' : k.status === 'selesai' ? '#E8FFF3' : '#F5F5F5', color: k.status === 'berlangsung' ? '#E8751A' : k.status === 'selesai' ? '#00A651' : '#6B6B6B' }}>
                        {k.status === 'berlangsung' ? 'Berlangsung' : k.status === 'selesai' ? 'Selesai' : 'Belum'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE3D8', overflow: 'hidden', boxShadow: '0 2px 12px rgba(232,117,26,.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDE3D8' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Aktivitas Terbaru</h3>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid #EDE3D8' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: activityColors[a.type] ?? '#6B6B6B', flexShrink: 0, marginTop: 5 }} />
                <div>
                  <p style={{ fontSize: 12, color: '#3D3D3D', lineHeight: 1.5, marginBottom: 2 }}>{a.text}</p>
                  <span style={{ fontSize: 11, color: '#6B6B6B' }}>{a.waktu} WIB</span>
                </div>
              </div>
            ))}
          </div>

          {/* Alert lagging */}
          <div style={{ margin: '0 16px 16px', background: '#FFF1F2', borderRadius: 8, padding: '12px 14px', border: '1px solid #FECDD3' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#E8192C', marginBottom: 4 }}>⚠️ Kecamatan Perlu Perhatian</p>
            <p style={{ fontSize: 11, color: '#6B6B6B', lineHeight: 1.5 }}>10 kecamatan belum memulai pencacahan. Segera koordinasikan dengan koordinator lapangan.</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2,1fr) !important; }
          .chart-grid, .bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
