/**
 * FooterDashboard — footer minimalis 1-baris untuk halaman admin.
 * Tidak ada link banyak, tidak ada sosmed. Hanya brand kecil + versi.
 */
interface Props {
  sensusLabel?: string  // "SE 2026", "SP 2030", dst
  primary?: string
}

export default function FooterDashboard({ sensusLabel = 'SE 2026', primary = '#E8751A' }: Props) {
  return (
    <footer style={{
      background: '#FAF8F5',
      borderTop: '1px solid #EDE3D8',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B6B6B' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: primary, boxShadow: `0 0 0 3px ${primary}22` }} />
        <span><b style={{ color: '#1A1A1A' }}>{sensusLabel}</b> · Mode Admin · BPS Kabupaten Musi Rawas</span>
      </div>
      <div style={{ fontSize: 11, color: '#8C7B6B' }}>v1.0 · {new Date().getFullYear()}</div>
    </footer>
  )
}
