'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TaggingFilterState, TaggingMapResponse, TaggingOption } from '@/types/tagging'
import styles from './tagging.module.css'

const TaggingMap = dynamic(() => import('@/components/tagging/TaggingMap'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Menyiapkan kanvas kartografis…</div>,
})

type SummaryPayload = {
  batch: null | { id: number; filename: string; completed_at: string; raw_rows: number; unique_assignments: number }
  summary: null | Record<string, number | string | null>
  statuses?: Array<{ status: string; total: number }>
  kinds?: Record<string, number>
}

type OptionsPayload = {
  kecamatan: TaggingOption[]
  desa: TaggingOption[]
  sls: TaggingOption[]
  subsls: TaggingOption[]
  statuses: TaggingOption[]
}

type RecordRow = {
  assignment_id: string
  status_alias: string
  level_6_full_code: string
  idsls: string | null
  nmkec: string | null
  nmdesa: string | null
  nmsls: string | null
  geotag_accuracy: number | null
  warning_count: number
  duplicate_occurrences: number
  exact_cluster_size: number
  near_cluster_size: number
}

const EMPTY_FILTERS: TaggingFilterState = {
  kdkec: '', kddesa: '', idsls: '', idsubsls: '', status: '', warning: '', kind: '', accuracy: '', search: '',
}

const WARNING_OPTIONS = [
  ['record_duplicate', 'Record berulang'], ['status_conflict', 'Status konflik'],
  ['exact_point_duplicate', 'Titik identik'], ['near_point_duplicate', 'Titik ≤10 m'],
  ['missing_coordinate', 'Koordinat kosong'], ['low_accuracy', 'Akurasi >50 m'],
  ['unmapped_code', 'Kode tak terpetakan'], ['outside_subsls', 'Di luar Sub-SLS'],
]

const STATUS_COLORS = ['#E8751A', '#10B981', '#2563EB', '#D946EF', '#EF4444', '#F59E0B', '#64748B', '#0EA5E9', '#8B5CF6']

function number(value: unknown) { return Number(value ?? 0) }
function format(value: unknown) { return number(value).toLocaleString('id-ID') }

function buildQuery(filters: TaggingFilterState, extra?: Record<string, string | number>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, String(value))
  return params.toString()
}

export default function TaggingDashboardClient() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [options, setOptions] = useState<OptionsPayload>({ kecamatan: [], desa: [], sls: [], subsls: [], statuses: [] })
  const [summary, setSummary] = useState<SummaryPayload>({ batch: null, summary: null })
  const [mapData, setMapData] = useState<TaggingMapResponse>({ mode: 'empty', data: [] })
  const [records, setRecords] = useState<RecordRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [zoom, setZoom] = useState(11)
  const [metric, setMetric] = useState<'total' | 'warnings' | 'approved'>('total')
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailWarnings, setDetailWarnings] = useState<Array<Record<string, unknown>>>([])

  const query = useMemo(() => buildQuery(filters), [filters])
  const mapQuery = useMemo(() => buildQuery(filters, { zoom }), [filters, zoom])
  const recordsQuery = useMemo(() => buildQuery(filters, { page, limit: 25 }), [filters, page])

  useEffect(() => {
    const controller = new AbortController()
    const q = new URLSearchParams()
    if (filters.kdkec) q.set('kdkec', filters.kdkec)
    if (filters.kddesa) q.set('kddesa', filters.kddesa)
    if (filters.idsls) q.set('idsls', filters.idsls)
    void fetch(`/api/admin/tagging/options?${q}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Gagal memuat hierarki wilayah')
        return response.json()
      })
      .then(payload => setOptions(payload))
      .catch(requestError => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat hierarki wilayah')
      })
    return () => controller.abort()
  }, [filters.kdkec, filters.kddesa, filters.idsls])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSummaryLoading(true); setError('')
      try {
        const response = await fetch(`/api/admin/tagging/summary?${query}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Ringkasan tagging belum dapat dimuat')
        setSummary(await response.json())
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat ringkasan')
      } finally {
        if (!controller.signal.aborted) setSummaryLoading(false)
      }
    }, filters.search ? 350 : 100)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [query, filters.search])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/tagging/records?${recordsQuery}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Daftar audit belum dapat dimuat')
        const payload = await response.json()
        setRecords(payload.data ?? [])
        setTotalRecords(payload.total ?? 0)
        setPages(payload.pages ?? 0)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat daftar audit')
      }
    }, filters.search ? 350 : 120)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [recordsQuery, filters.search])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setMapLoading(true)
      try {
        const response = await fetch(`/api/admin/tagging/map?${mapQuery}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Lapisan peta belum dapat dimuat')
        setMapData(await response.json())
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Gagal memuat lapisan peta')
      } finally {
        if (!controller.signal.aborted) setMapLoading(false)
      }
    }, filters.search ? 350 : 30)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [mapQuery, filters.search])

  const patchFilter = useCallback((patch: Partial<TaggingFilterState>, preferredZoom?: number) => {
    setFilters(current => ({ ...current, ...patch }))
    setPage(1)
    if (preferredZoom) setZoom(preferredZoom)
  }, [])

  const openDetail = useCallback(async (assignmentId: string) => {
    setDetail({ assignment_id: assignmentId, loading: true }); setDetailWarnings([])
    const res = await fetch(`/api/admin/tagging/records/${encodeURIComponent(assignmentId)}`)
    const json = await res.json()
    if (!res.ok) { setDetail({ assignment_id: assignmentId, error: json.error ?? 'Gagal memuat detail' }); return }
    setDetail(json.data); setDetailWarnings(json.warnings ?? [])
  }, [])

  const selectSubSls = useCallback((code: string) => patchFilter({
    kdkec: code.slice(0, 7),
    kddesa: code.slice(0, 10),
    idsls: code.slice(0, 14),
    idsubsls: code,
  }, 17), [patchFilter])

  const s = summary.summary ?? {}
  const warningRate = number(s.total) ? (number(s.with_warning) / number(s.total)) * 100 : 0
  const statusData = (summary.statuses ?? []).map(row => ({ name: row.status, value: number(row.total) }))

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>SE2026 · GEOSPATIAL AUDIT DESK</div>
          <h1>Data Tagging</h1>
          <p>Membaca pola lapangan, kualitas GPS, dan anomali assignment hingga tingkat Sub-SLS.</p>
        </div>
        <div className={styles.heroActions}>
          {summary.batch && <div className={styles.snapshot}><span>Snapshot aktif</span><strong>#{summary.batch.id}</strong><small>{summary.batch.filename}</small></div>}
          <Link href="/se/2026/dashboard/import" className={styles.importLink}>Impor snapshot baru ↗</Link>
        </div>
      </section>

      {error && <div className={styles.errorBanner}>⚠ {error}</div>}
      {!summary.batch && !summaryLoading ? (
        <section className={styles.emptyState}>
          <span>◌</span><h2>Belum ada snapshot tagging aktif</h2>
          <p>Impor file Excel tagging dari menu Import Data untuk mengaktifkan peta dan audit.</p>
          <Link href="/se/2026/dashboard/import">Buka Import Data</Link>
        </section>
      ) : (
        <>
          <section className={styles.kpiGrid} aria-label="Ringkasan tagging">
            <MetricCard label="Assignment unik" value={format(s.total)} note={`${format(summary.batch?.raw_rows)} baris sumber`} tone="orange" />
            <MetricCard label="Memiliki warning" value={format(s.with_warning)} note={`${warningRate.toFixed(1)}% perlu audit`} tone="red" />
            <MetricCard label="Titik identik" value={format(s.exact_point_duplicates)} note="assignment terdampak" tone="navy" />
            <MetricCard label="Akurasi rendah" value={format(s.low_accuracy)} note="lebih dari 50 meter" tone="amber" />
            <MetricCard label="Di luar Sub-SLS" value={format(s.outside_subsls)} note="perlu verifikasi wilayah" tone="teal" />
          </section>

          <section className={styles.filters} aria-label="Filter data tagging">
            <FilterSelect label="Kecamatan" value={filters.kdkec} options={options.kecamatan} onChange={value => patchFilter({ kdkec: value, kddesa: '', idsls: '', idsubsls: '' }, 11)} />
            <FilterSelect label="Desa/Kelurahan" value={filters.kddesa} options={options.desa} disabled={!filters.kdkec} onChange={value => patchFilter({ kddesa: value, idsls: '', idsubsls: '' }, value ? 13 : 11)} />
            <FilterSelect label="SLS" value={filters.idsls} options={options.sls} disabled={!filters.kddesa} onChange={value => patchFilter({ idsls: value, idsubsls: '' }, value ? 15 : 13)} />
            <FilterSelect label="Sub-SLS" value={filters.idsubsls} options={options.subsls} disabled={!filters.idsls} onChange={value => patchFilter({ idsubsls: value }, value ? 17 : 15)} />
            <label><span>Status</span><select value={filters.status} onChange={e => patchFilter({ status: e.target.value })}><option value="">Semua status</option>{options.statuses.map(o => <option key={o.code} value={o.code}>{o.code} ({format(o.total)})</option>)}</select></label>
            <label><span>Warning</span><select value={filters.warning} onChange={e => patchFilter({ warning: e.target.value })}><option value="">Semua kondisi</option>{WARNING_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Jenis tagging</span><select value={filters.kind} onChange={e => patchFilter({ kind: e.target.value })}><option value="">Keluarga & usaha</option><option value="keluarga">Keluarga</option><option value="usaha">Bangunan usaha</option></select></label>
            <label><span>Kualitas GPS</span><select value={filters.accuracy} onChange={e => patchFilter({ accuracy: e.target.value })}><option value="">Semua akurasi</option><option value="good">Baik (≤50 m)</option><option value="low">Rendah (&gt;50 m)</option><option value="missing">Koordinat kosong</option></select></label>
            <label className={styles.searchField}><span>Cari assignment / kode</span><input value={filters.search} onChange={e => patchFilter({ search: e.target.value })} placeholder="UUID atau full code…" /></label>
            <button className={styles.resetButton} onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); setZoom(11) }} disabled={!Object.values(filters).some(Boolean)}>Reset filter</button>
          </section>

          <section className={styles.mapSection}>
            <div className={styles.mapHeader}>
              <div><span className={styles.sectionIndex}>01</span><div><h2>Peta digital tagging</h2><p>Zoom untuk berpindah dari poligon ke cluster dan titik individual.</p></div></div>
              <div className={styles.metricToggle} aria-label="Metrik warna poligon">
                {([['total','Volume'],['warnings','Warning'],['approved','Approved']] as const).map(([value, label]) => <button key={value} className={metric === value ? styles.active : ''} onClick={() => setMetric(value)}>{label}</button>)}
              </div>
            </div>
            <div className={styles.mapFrame}>
              <TaggingMap
                data={mapData}
                dataVersion={mapQuery}
                metric={metric}
                onZoom={setZoom}
                onSelectAssignment={openDetail}
                onSelectSubSls={selectSubSls}
              />
              {mapLoading && <div className={styles.mapBusy}>Memperbarui lapisan…</div>}
              {'truncated' in mapData && mapData.truncated && <div className={styles.mapNotice}>{mapData.mode === 'points' ? 'Maksimum 2.000 titik ditampilkan.' : 'Cluster dipadatkan untuk menjaga performa.'} Persempit filter untuk audit lengkap.</div>}
              <div className={styles.legend}><strong>Mode {mapData.mode === 'polygons' ? 'poligon' : mapData.mode === 'clusters' ? 'cluster' : 'titik'}</strong><span><i className={styles.legendOrange} /> volume/normal</span><span><i className={styles.legendRed} /> warning tinggi</span><span><i className={styles.legendInk} /> konflik/duplikat</span></div>
            </div>
          </section>

          <section className={styles.analysisGrid}>
            <article className={styles.panel}>
              <div className={styles.panelTitle}><span className={styles.sectionIndex}>02</span><div><h2>Komposisi status</h2><p>Assignment konflik tidak dimasukkan ke status operasional.</p></div></div>
              <div className={styles.statusBody}>
                <div className={styles.donutWrap}>
                  <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={94} paddingAngle={2}>{statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => format(value)} /></PieChart></ResponsiveContainer>
                  <div className={styles.donutCenter}><strong>{format(s.total)}</strong><span>assignment</span></div>
                </div>
                <div className={styles.statusList}>{statusData.map((row, i) => <div key={row.name}><i style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} /><span>{row.name}</span><strong>{format(row.value)}</strong></div>)}</div>
              </div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelTitle}><span className={styles.sectionIndex}>03</span><div><h2>Sinyal kualitas</h2><p>Prioritas audit berdasarkan risiko data.</p></div></div>
              <div className={styles.signalList}>
                <Signal label="Record berulang" value={number(s.record_duplicates)} total={number(s.total)} color="#E8751A" />
                <Signal label="Titik ≤10 meter" value={number(s.near_point_duplicates)} total={number(s.total)} color="#F59E0B" />
                <Signal label="Koordinat kosong" value={number(s.missing_coordinates)} total={number(s.total)} color="#64748B" />
                <Signal label="Kode tak terpetakan" value={number(s.unmapped_codes)} total={number(s.total)} color="#8B5CF6" />
                <Signal label="Status konflik" value={number(s.status_conflicts)} total={number(s.total)} color="#EF4444" />
              </div>
            </article>
          </section>

          <section className={styles.tableSection}>
            <div className={styles.tableHeader}><div><span className={styles.sectionIndex}>04</span><div><h2>Daftar audit assignment</h2><p>{format(totalRecords)} record sesuai filter · klik baris untuk detail aman.</p></div></div><div className={styles.pager}><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button><span>{page} / {Math.max(1, pages)}</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>→</button></div></div>
            <div className={styles.tableScroll}><table><thead><tr><th>Assignment ID</th><th>Wilayah</th><th>Status</th><th>Akurasi</th><th>Warning</th></tr></thead><tbody>{records.map(row => <tr key={row.assignment_id} tabIndex={0} onClick={() => openDetail(row.assignment_id)} onKeyDown={e => { if (e.key === 'Enter') void openDetail(row.assignment_id) }}><td><code>{row.assignment_id}</code><small>{row.level_6_full_code}</small></td><td><strong>{row.nmdesa ?? 'Tidak terpetakan'}</strong><small>{row.nmkec ?? '—'} · {row.nmsls ?? row.idsls}</small></td><td><StatusBadge status={row.status_alias} /></td><td>{row.geotag_accuracy == null ? '—' : `${number(row.geotag_accuracy).toFixed(1)} m`}</td><td>{row.warning_count > 0 ? <span className={styles.warningPill}>{row.warning_count} sinyal</span> : <span className={styles.cleanPill}>Bersih</span>}</td></tr>)}</tbody></table>{!records.length && <div className={styles.noRows}>Tidak ada assignment yang cocok dengan filter.</div>}</div>
          </section>
        </>
      )}

      {detail && <DetailDrawer detail={detail} warnings={detailWarnings} onClose={() => setDetail(null)} />}
    </div>
  )
}

function MetricCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article className={`${styles.metricCard} ${styles[tone]}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function FilterSelect({ label, value, options, disabled, onChange }: { label: string; value: string; options: TaggingOption[]; disabled?: boolean; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}><option value="">Semua {label.toLowerCase()}</option>{options.map(option => <option key={option.code} value={option.code}>{option.name ?? option.code} ({format(option.total)})</option>)}</select></label>
}

function Signal({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.min(100, value / total * 100) : 0
  return <div><div><span>{label}</span><strong>{format(value)} <small>({pct.toFixed(1)}%)</small></strong></div><div className={styles.signalTrack}><i style={{ width: `${pct}%`, background: color }} /></div></div>
}

function StatusBadge({ status }: { status: string }) {
  const critical = status === 'CONFLICT' || /REJECTED|REVOKED/.test(status)
  const good = /APPROVED|COMPLETED/.test(status)
  return <span className={`${styles.statusBadge} ${critical ? styles.statusCritical : good ? styles.statusGood : styles.statusNeutral}`}>{status}</span>
}

function DetailDrawer({ detail, warnings, onClose }: { detail: Record<string, unknown>; warnings: Array<Record<string, unknown>>; onClose: () => void }) {
  const loading = detail.loading === true
  const rows = Array.isArray(detail.source_rows_json) ? detail.source_rows_json.join(', ') : '—'
  return <div className={styles.drawerBackdrop} onClick={onClose}><aside className={styles.drawer} onClick={e => e.stopPropagation()} aria-label="Detail assignment"><button className={styles.drawerClose} onClick={onClose} aria-label="Tutup">×</button>{loading ? <div className={styles.drawerLoading}>Memuat detail assignment…</div> : detail.error ? <div className={styles.errorBanner}>{String(detail.error)}</div> : <><div className={styles.drawerHead}><span>ASSIGNMENT DOSSIER</span><h2>{String(detail.assignment_id)}</h2><StatusBadge status={String(detail.status_alias)} /></div><div className={styles.drawerGrid}><Detail label="Kecamatan" value={detail.nmkec} /><Detail label="Desa/Kelurahan" value={detail.nmdesa} /><Detail label="SLS" value={detail.nmsls} /><Detail label="Full code" value={detail.level_6_full_code} mono /><Detail label="Nama kepala keluarga" value={detail.nama_kk} /><Detail label="Nama bangunan usaha" value={detail.nama_usaha_bang} /><Detail label="Label keluarga" value={detail.ada_keluarga_label} /><Detail label="Label usaha" value={detail.ada_bang_usaha_label} /><Detail label="Akurasi" value={detail.geotag_accuracy == null ? null : `${number(detail.geotag_accuracy).toFixed(2)} meter`} /><Detail label="Koordinat" value={detail.geotag_latitude == null ? null : `${detail.geotag_latitude}, ${detail.geotag_longitude}`} mono /><Detail label="Baris sumber Excel" value={rows} /><Detail label="Kemunculan tambahan" value={detail.duplicate_occurrences} /></div><div className={styles.warningBox}><h3>Warning audit ({warnings.length})</h3>{warnings.length ? warnings.map((warning, i) => <div key={`${warning.warning_type}-${i}`}><strong>{String(warning.warning_type).replaceAll('_',' ')}</strong><span>{String(warning.severity)} · {format(warning.related_count)} terkait</span></div>) : <p>Tidak ada warning untuk assignment ini.</p>}</div></>}</aside></div>
}

function Detail({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return <div><span>{label}</span><strong className={mono ? styles.mono : ''}>{value == null || value === '' ? '—' : String(value)}</strong></div>
}
