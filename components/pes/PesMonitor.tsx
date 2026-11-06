'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import WaveLoop from '@/components/decor/WaveLoop'
import { usePes } from '@/hooks/usePes'
import { dateWib } from '@/lib/pes/dates'
import { groupPesBySupervisor } from '@/lib/pes/progress'
import { PesEnumeratorTable, PesSupervisorTable, percentLabel } from './PesProgressTable'
import styles from './pes.module.css'

const Chart = dynamic(() => import('./PesChart'), { ssr: false, loading: () => <p className={styles.placeholder}>Memuat grafik…</p> })
const num = (value: number) => value.toLocaleString('id-ID')
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
  const rows = data?.petugas ?? []
  const teams = useMemo(() => groupPesBySupervisor(data?.petugas ?? []), [data])
  const hasHistory = data?.history.some(point => point.total !== null) ?? false
  const source = data?.latest_source_at ? sourceTime(data.latest_source_at) : null
  const summary = data?.options.length ? data.summary : null
  const tableState = { filterKey: query, loading, exportContext: `${num(rows.length)} pencacah · ${num(data?.summary.total ?? 0)} assignment · ${source ?? 'Menunggu data'}` }
  async function download(kind: 'history-csv' | 'chart-png') {
    if (!data) return
    setExportError('')
    try {
      const exporter = await import('@/lib/exportTable')
      if (kind === 'history-csv') exporter.exportCsv('riwayat-pes.csv', ['Tanggal WIB', 'Target', 'Selesai pendataan', 'Selesai pemeriksaan', 'Perubahan pendataan', 'Perubahan pemeriksaan', 'Petugas diperbarui', 'Baseline baru', 'Melewati jeda'], data.history.map(p => [p.tanggal, p.total ?? '', p.selesai_cacah ?? '', p.selesai_approve ?? '', p.delta_cacah ?? '', p.delta_approve ?? '', p.updated_count, p.baseline_count, p.spans_gap ? 'Ya' : 'Tidak']))
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
      <WaveLoop position="top-right" size={500} opacity={0.24} variant="ribbon" />
      <div className={`${styles.container} ${styles.heroLayout}`}>
        <div>
          <p className={styles.breadcrumb}><Link href="/se/2026">SE2026</Link><span aria-hidden="true">›</span>Monitoring PES</p>
          <p className={styles.heroBadge}>POST ENUMERATION SURVEY</p>
          <h1>Monitoring PES <span>SE2026</span></h1>
          <p className={styles.intro}>Pantau capaian pendataan dan pemeriksaan di wilayah sampel Kabupaten Musi Rawas.</p>
          <nav className={styles.heroLinks} aria-label="Bagian monitoring PES">
            <a href="#pes-pencacah">Progres pencacah <span aria-hidden="true">↓</span></a>
            <a href="#pes-pengawas">Progres pengawas <span aria-hidden="true">↓</span></a>
          </nav>
        </div>
        <div className={styles.heroSummary}>
          <p>CAPAIAN PENDATAAN</p>
          <strong>{summary ? percentLabel(summary.pct_cacah) : '—'}</strong>
          <div className={styles.heroTrack} aria-hidden="true"><span style={{ width: `${summary?.pct_cacah ?? 0}%` }} /></div>
          <small>{summary ? `${num(summary.selesai_cacah)} dari ${num(summary.total)} assignment selesai cacah` : 'Menunggu data sumber PES'}</small>
        </div>
      </div>
    </section>
    <div className={`${styles.container} ${styles.content}`}>
      <section className={styles.cards} aria-label="Ringkasan PES">
        {([
          ['Target assignment', summary?.total, summary ? `${num(summary.petugas)} pencacah` : 'Target terkini', 'target'],
          ['Selesai cacah', summary?.selesai_cacah, summary ? `${percentLabel(summary.pct_cacah)} dari target` : 'Capaian pendataan', 'cacah'],
          ['Approved / Final', summary?.selesai_approve, summary ? `${percentLabel(summary.pct_approve)} dari target` : 'Capaian pemeriksaan', 'approve'],
          ['Sisa pendataan', summary?.sisa, 'Assignment belum selesai', 'sisa'],
        ] as const).map(([label, value, hint, metric]) => <article key={metric} className={styles.card} data-metric={metric}>
          <p>{label}</p><strong>{value === undefined ? '—' : num(value)}</strong><small>{hint}</small>
        </article>)}
      </section>
      <div className={styles.monitorHeader}>
        <h2>Rekap lapangan</h2>
        <p className={styles.source}>{source ? <>Data FASIH <strong>{source}</strong></> : 'Menunggu data sumber PES'}</p>
      </div>
      <section className={styles.filters} aria-label="Filter monitoring PES">
        <div><label htmlFor="pes-search">Cari pencacah</label><input id="pes-search" value={q} maxLength={150} onChange={e => setQ(e.target.value)} placeholder="Ketik nama pencacah…" /></div>
        <div><label htmlFor="pes-filter-pengawas">Pengawas</label><select id="pes-filter-pengawas" value={pengawas} onChange={e => { setPengawas(e.target.value); setPetugas('') }}><option value="">Semua pengawas</option>{supervisors.map(name => <option key={name}>{name}</option>)}</select></div>
        <div><label htmlFor="pes-filter-pencacah">Pencacah</label><select id="pes-filter-pencacah" value={petugas} onChange={e => setPetugas(e.target.value)}><option value="">Semua pencacah</option>{options.filter(p => !pengawas || p.nama_pml === pengawas).map(p => <option key={p.id} value={p.id}>{p.nama_ppl}{options.filter(other => other.nama_ppl === p.nama_ppl).length > 1 ? ` · ${p.id.slice(0, 8)}` : ''}</option>)}</select></div>
        <button className={styles.secondary} onClick={() => { setQ(''); setSearch(''); setPengawas(''); setPetugas('') }}>Reset filter</button>
      </section>
      {loading && <div role="status" className={styles.notice}>Memuat monitoring PES…</div>}
      {error && <div role="alert" className={styles.notice}>{error}{data && ' Angka terakhir tetap ditampilkan; pembaruan belum berhasil.'}</div>}
      {exportError && <p role="alert" className={styles.notice}>{exportError}</p>}
      {data && !data.options.length && <div role="status" className={styles.empty}><h2>Belum ada data pendataan PES</h2><p>Monitoring akan terisi setelah bot PES mengirim pembaruan pertamanya.</p></div>}
      <PesEnumeratorTable {...tableState} rows={rows} />
      <PesSupervisorTable {...tableState} rows={teams} />
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
