'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePes } from '@/hooks/usePes'
import { dateWib } from '@/lib/pes/dates'
import type { PesPetugas } from '@/lib/pes/domain'
import styles from './pes.module.css'

const Chart = dynamic(() => import('./PesChart'), { ssr: false, loading: () => <p className={styles.placeholder}>Memuat grafik…</p> })
const num = (value: number) => value.toLocaleString('id-ID')
const columns = [
  ['nama_ppl', 'Petugas'], ['nama_pml', 'Pengawas'], ['total', 'Target'], ['draft', 'Draft'], ['submitted', 'Submitted'], ['rejected', 'Rejected'], ['revoked', 'Revoked'], ['edited_pengawas', 'Edited pengawas'], ['selesai_approve', 'Approved / Final'], ['selesai_cacah', 'Selesai cacah'], ['pct_cacah', 'Capaian'],
] as const
type SortKey = typeof columns[number][0]
const sortValue = (row: PesPetugas, key: SortKey) => key === 'submitted' ? row.submitted_pencacah + row.submitted_responden : row[key]
const sourceTime = (value: string) => new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'

export default function PesMonitor() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [pengawas, setPengawas] = useState('')
  const [petugas, setPetugas] = useState('')
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [draftRange, setDraftRange] = useState({ from: '', to: '' })
  const [rangeError, setRangeError] = useState('')
  const [daily, setDaily] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'pct_cacah', desc: true })
  const [page, setPage] = useState(0)
  const [exportError, setExportError] = useState('')
  const chart = useRef<HTMLDivElement>(null)
  useEffect(() => { const timer = setTimeout(() => setSearch(q.trim()), 250); return () => clearTimeout(timer) }, [q])
  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (pengawas) params.set('pengawas', pengawas)
    if (petugas) params.set('petugas', petugas)
    if (range) { params.set('from', range.from); params.set('to', range.to) }
    return params.toString()
  }, [search, pengawas, petugas, range])
  const { data, error, loading } = usePes(query)
  const options = data?.options ?? []
  const supervisors = [...new Set(options.map(p => p.nama_pml).filter(Boolean))].sort()
  const rows = useMemo(() => [...(data?.petugas ?? [])].sort((a, b) => {
    const av = sortValue(a, sort.key), bv = sortValue(b, sort.key)
    const value = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, 'id') : Number(av) - Number(bv)
    return (sort.desc ? -value : value) || a.nama_ppl.localeCompare(b.nama_ppl, 'id') || a.id.localeCompare(b.id)
  }), [data, sort])
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 25) - 1))
  const visibleRows = rows.slice(safePage * 25, (safePage + 1) * 25)
  const hasHistory = data?.history.some(point => point.total !== null) ?? false
  const cell = (row: PesPetugas, key: SortKey) => key === 'pct_cacah' ? `${row.pct_cacah.toFixed(1)}%` : typeof sortValue(row, key) === 'number' ? num(Number(sortValue(row, key))) : String(sortValue(row, key) || '—')
  const context = data ? `${data.summary.petugas} petugas · ${num(data.summary.total)} assignment · ${data.summary.pct_cacah.toFixed(1)}% pendataan · ${data.summary.pct_approve.toFixed(1)}% pemeriksaan · ${search ? `Nama: ${search} · ` : ''}${pengawas ? `Pengawas: ${pengawas} · ` : ''}Sumber: ${data.latest_source_at ? sourceTime(data.latest_source_at) : 'belum ada'}` : ''
  async function download(kind: 'table-csv' | 'table-png' | 'history-csv' | 'chart-png') {
    if (!data) return
    setExportError('')
    try {
      const exporter = await import('@/lib/exportTable')
      if (kind === 'table-csv') exporter.exportCsv('monitoring-pes-petugas.csv', ['Petugas', 'Pengawas', 'Target', 'Draft', 'Submitted', 'Rejected', 'Revoked', 'Edited pengawas', 'Approved / Final', 'Selesai cacah', 'Capaian %', 'Pembaruan sumber'], rows.map(row => [...columns.map(([key]) => key === 'pct_cacah' ? row.pct_cacah : sortValue(row, key)), row.observed_at]))
      else if (kind === 'table-png') await exporter.exportTablePng({ filename: 'monitoring-pes-petugas.png', title: 'Monitoring PES SE2026 per Petugas', subtitle: context, columns: columns.map(([key, label]) => ({ label, width: key.startsWith('nama') ? 180 : 100 })), rows, cell: (row: PesPetugas, index: number) => cell(row, columns[index][0]) })
      else if (kind === 'history-csv') exporter.exportCsv('riwayat-pes.csv', ['Tanggal WIB', 'Target', 'Selesai pendataan', 'Selesai pemeriksaan', 'Perubahan pendataan', 'Perubahan pemeriksaan', 'Petugas diperbarui', 'Baseline baru', 'Melewati jeda'], data.history.map(p => [p.tanggal, p.total ?? '', p.selesai_cacah ?? '', p.selesai_approve ?? '', p.delta_cacah ?? '', p.delta_approve ?? '', p.updated_count, p.baseline_count, p.spans_gap ? 'Ya' : 'Tidak']))
      else {
        // Legend icons also use recharts-surface; export the actual plot.
        const svg = chart.current?.querySelector('svg.recharts-surface[role="application"]') as SVGSVGElement | null
        if (!svg) throw new Error('Grafik belum siap diekspor')
        await exporter.exportSvgNodePng(svg, `pes-${daily ? 'perubahan-harian' : 'kumulatif'}.png`)
      }
    } catch { setExportError('Ekspor belum berhasil. Coba kembali setelah data atau grafik selesai dimuat.') }
  }
  function applyRange() {
    const today = dateWib()
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to || draftRange.to > today || Date.parse(draftRange.to) - Date.parse(draftRange.from) > 89 * 86400000) {
      setRangeError('Pilih rentang 1–90 hari, maksimal hari ini (WIB).'); return
    }
    setRangeError(''); setRange({ ...draftRange })
  }
  return <>
    <section className={`${styles.hero} hero-flush-navbar`}>
      <div className={styles.container}>
        <p className={styles.breadcrumb}><Link href="/se/2026">SE2026</Link><span>/</span>Post Enumeration Survey</p>
        <span className={styles.eyebrow}>PES · SE2026</span>
        <h1>Monitoring pendataan PES</h1>
        <p className={styles.intro}>Pantau assignment, capaian pendataan, dan pemeriksaan petugas pada wilayah sampel Post Enumeration Survey.</p>
        <div className={styles.heroMeta}><span className={styles.live}>● Pembaruan otomatis</span><span>Target mengikuti assignment terkini</span></div>
      </div>
    </section>
    <div className={`${styles.container} ${styles.content}`}>
      <section className={styles.filters} aria-label="Filter monitoring PES">
        <label>Cari petugas<input value={q} maxLength={150} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder="Ketik nama petugas…" /></label>
        <label>Pengawas<select value={pengawas} onChange={e => { setPengawas(e.target.value); setPetugas(''); setPage(0) }}><option value="">Semua pengawas</option>{supervisors.map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Petugas<select value={petugas} onChange={e => { setPetugas(e.target.value); setPage(0) }}><option value="">Semua petugas</option>{options.filter(p => !pengawas || p.nama_pml === pengawas).map(p => <option key={p.id} value={p.id}>{p.nama_ppl}{options.filter(other => other.nama_ppl === p.nama_ppl).length > 1 ? ` · ${p.id.slice(0, 8)}` : ''}</option>)}</select></label>
        <button className={styles.secondary} onClick={() => { setQ(''); setSearch(''); setPengawas(''); setPetugas(''); setPage(0) }}>Reset filter</button>
      </section>
      <p className={styles.source}>{data?.latest_source_at ? <>Pembaruan sumber: <strong>{sourceTime(data.latest_source_at)}</strong> · diperiksa otomatis setiap 60 detik</> : 'Menunggu data sumber PES'}</p>
      {loading && <div role="status" className={styles.notice}>Memuat monitoring PES…</div>}
      {error && <div role="alert" className={styles.notice}>{error}{data && ' Angka terakhir tetap ditampilkan; pembaruan belum berhasil.'}</div>}
      {exportError && <p role="alert" className={styles.notice}>{exportError}</p>}
      {data && !data.options.length && <div role="status" className={styles.empty}><span>◎</span><h2>Belum ada data pendataan PES</h2><p>Monitoring akan terisi setelah scraper PES mengirim snapshot pertamanya. Angka SE2026 utama tidak digunakan pada halaman ini.</p></div>}
      <section className={styles.cards} aria-label="Ringkasan PES">
        {[
          ['Petugas', data?.summary.petugas, 'Dalam filter aktif'], ['Assignment', data?.summary.total, 'Target terkini, dapat bertambah'], ['Selesai pendataan', data?.summary.selesai_cacah, data?.options.length ? `${data.summary.pct_cacah.toFixed(1)}% dari target` : 'Capaian pencacahan'], ['Selesai pemeriksaan', data?.summary.selesai_approve, data?.options.length ? `${data.summary.pct_approve.toFixed(1)}% dari target` : 'Approved / Final'], ['Sisa pendataan', data?.summary.sisa, 'Assignment belum selesai'],
        ].map(([label, value, hint]) => <article key={String(label)} className={styles.card}><p>{label}</p><strong>{typeof value === 'number' && data?.options.length ? num(value) : '—'}</strong><small>{hint}</small></article>)}
      </section>
      <section className={styles.panel} aria-labelledby="pes-table-title">
        <div className={styles.panelHead}><div><p className={styles.eyebrow}>KONDISI TERKINI</p><h2 id="pes-table-title">Progress per petugas</h2><p>Persentase dihitung dari assignment terkini. Target baru dapat menurunkan persentase.</p></div><div className={styles.actions}><button disabled={!rows.length} onClick={() => void download('table-csv')}>CSV</button><button disabled={!rows.length} onClick={() => void download('table-png')}>PNG</button></div></div>
        <div className={styles.tableScroll}><table className={styles.table}><caption className={styles.srOnly}>Rekap PES sesuai filter aktif. Submitted mencakup pencacah dan responden.</caption><thead><tr>{columns.map(([key, title]) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.desc ? 'descending' : 'ascending' : 'none'}><button onClick={() => { setSort(s => ({ key, desc: s.key === key ? !s.desc : true })); setPage(0) }}>{title} {sort.key === key ? sort.desc ? '↓' : '↑' : '↕'}</button></th>)}</tr></thead><tbody>
          {!visibleRows.length && <tr><td colSpan={columns.length} className={styles.placeholder}>{loading ? 'Memuat petugas…' : error && !data ? 'Data belum tersedia' : 'Tidak ada petugas sesuai filter'}</td></tr>}
          {visibleRows.map(row => <tr key={row.id}>{columns.map(([key]) => <td key={key}>{key === 'nama_ppl' ? <><strong>{row.nama_ppl}</strong><small title={sourceTime(row.observed_at)}>Sumber: {sourceTime(row.observed_at)}</small></> : key === 'pct_cacah' ? <div className={styles.progressCell}><strong>{cell(row, key)}</strong><div className={styles.track}><span style={{ width: `${row.pct_cacah}%` }} /></div></div> : cell(row, key)}</td>)}</tr>)}
        </tbody></table></div>
        <div className={styles.tableFoot}><span>{rows.length ? `${safePage * 25 + 1}–${Math.min((safePage + 1) * 25, rows.length)} dari ${rows.length} petugas · ekspor mencakup seluruh hasil filter` : 'Tanpa peta atau rekap kecamatan'}</span><div className={styles.actions}><button aria-label="Halaman sebelumnya" disabled={!safePage} onClick={() => setPage(safePage - 1)}>←</button><button aria-label="Halaman berikutnya" disabled={(safePage + 1) * 25 >= rows.length} onClick={() => setPage(safePage + 1)}>→</button></div></div>
      </section>
      <section className={styles.panel} aria-labelledby="pes-history-title">
        <div className={styles.panelHead}><div><p className={styles.eyebrow}>PERKEMBANGAN DARI WAKTU KE WAKTU</p><h2 id="pes-history-title">Riwayat pendataan PES</h2><p>Ringkasan {rows.length} petugas sesuai filter. Pilih satu petugas untuk melihat riwayat individual.</p></div><div className={styles.actions}><button disabled={!hasHistory} onClick={() => void download('history-csv')}>CSV riwayat</button><button disabled={!hasHistory} onClick={() => void download('chart-png')}>PNG grafik</button></div></div>
        <div className={styles.historyControls}><div className={styles.tabs} role="tablist" aria-label="Tampilan riwayat"><button id="pes-cumulative-tab" role="tab" aria-selected={!daily} aria-controls="pes-chart" className={!daily ? styles.selected : ''} onClick={() => setDaily(false)}>Capaian kumulatif</button><button id="pes-daily-tab" role="tab" aria-selected={daily} aria-controls="pes-chart" className={daily ? styles.selected : ''} onClick={() => setDaily(true)}>Perubahan harian</button></div><div className={styles.dateControls}><label>Dari<input type="date" value={draftRange.from} onChange={e => setDraftRange(r => ({ ...r, from: e.target.value }))} /></label><label>Sampai<input type="date" value={draftRange.to} onChange={e => setDraftRange(r => ({ ...r, to: e.target.value }))} /></label><button onClick={applyRange}>Terapkan</button><button className={styles.secondary} onClick={() => { setRange(null); setDraftRange({ from: '', to: '' }); setRangeError('') }}>14 hari terakhir</button></div></div>
        {rangeError && <p role="alert" className={styles.notice}>{rangeError}</p>}
        <p className={styles.rangeLabel}>{data ? `${data.range.from} — ${data.range.to} · Asia/Jakarta` : 'Rentang default: 14 hari terakhir (WIB)'}</p>
        <div id="pes-chart" role="tabpanel" aria-labelledby={daily ? 'pes-daily-tab' : 'pes-cumulative-tab'} ref={chart} className={styles.chart}>{hasHistory && data ? <Chart points={data.history} daily={daily} /> : <p className={styles.placeholder}>{loading ? 'Memuat riwayat…' : 'Belum ada riwayat pada rentang dan filter ini.'}</p>}</div>
        <p className={styles.historyNote}>Snapshot pertama menjadi baseline. Hari tanpa pembaruan mempertahankan capaian terakhir, tanpa mengasumsikan tambahan harian. Nilai negatif menandai koreksi atau perpindahan assignment; setelah jeda, perubahan dihitung sejak snapshot sebelumnya.</p>
        {hasHistory && data && <details className={styles.historyDetails}><summary>Lihat data riwayat dan penanda pembaruan</summary><div className={styles.tableScroll}><table className={styles.historyTable}><thead><tr>{['Tanggal WIB', 'Target', 'Selesai cacah', 'Diperiksa', 'Δ Cacah', 'Δ Periksa', 'Keterangan'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{data.history.map(point => <tr key={point.tanggal}><td>{point.tanggal}</td>{[point.total, point.selesai_cacah, point.selesai_approve, point.delta_cacah, point.delta_approve].map((value, index) => <td key={index}>{value == null ? '—' : num(value)}</td>)}<td>{point.baseline_count ? `Baseline ${point.baseline_count} petugas baru` : !point.updated_count ? 'Tanpa pembaruan' : point.spans_gap ? 'Pembaruan setelah jeda' : (point.delta_cacah ?? 0) < 0 || (point.delta_approve ?? 0) < 0 ? 'Koreksi / perpindahan' : `${point.updated_count} petugas diperbarui`}</td></tr>)}</tbody></table></div></details>}
      </section>
      <aside className={styles.info}><strong>Tentang target PES</strong><p>Wilayah pelaksanaan dipilih sebagai sampel. Unit monitoring pada halaman ini adalah assignment per petugas, sehingga target dapat berubah mengikuti pembagian tugas terbaru.</p></aside>
    </div>
  </>
}
