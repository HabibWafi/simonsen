'use client'

import { useState } from 'react'
import type { PesPetugas } from '@/lib/pes/domain'
import { submittedPes, type PesTeamProgress } from '@/lib/pes/progress'
import styles from './pes.module.css'

type Row = { id: string }
type Column<T> = {
  key: string
  label: string
  value: (row: T) => number | string
  kind?: 'name' | 'percent'
}
type TableState = { filterKey: string; loading: boolean; exportContext: string }
const PAGE_SIZE = 25
const number = new Intl.NumberFormat('id-ID')
const percent = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
})
export const percentLabel = (value: number) => percent.format(value) + '%'

const statusColumns = [
  ['open', 'Open'], ['draft', 'Draft'], ['rejected', 'Rejected'], ['revoked', 'Revoked'],
  ['approved', 'Approved'], ['completed_admin', 'Completed admin'], ['edited_admin', 'Edited admin'],
] as const

const details = statusColumns.map(([key, label]) => ({
  key, label, value: (row: Pick<PesPetugas, typeof key>) => row[key],
}))
const submitted = { key: 'submitted', label: 'Submitted', value: submittedPes }
const pencacahCore: Column<PesPetugas>[] = [
  { key: 'nama_ppl', label: 'Pencacah', value: row => row.nama_ppl, kind: 'name' },
  { key: 'total', label: 'Target', value: row => row.total },
  { key: 'selesai_cacah', label: 'Selesai cacah', value: row => row.selesai_cacah },
  { key: 'pct_cacah', label: 'Capaian', value: row => row.pct_cacah, kind: 'percent' },
]
const pencacahDetail: Column<PesPetugas>[] = [
  { key: 'nama_pml', label: 'Pengawas', value: row => row.nama_pml },
  submitted,
  ...details,
  { key: 'selesai_approve', label: 'Approved / Final', value: row => row.selesai_approve },
]
const pengawasCore: Column<PesTeamProgress>[] = [
  { key: 'nama_pml', label: 'Pengawas', value: row => row.nama_pml, kind: 'name' },
  { key: 'total', label: 'Target', value: row => row.total },
  submitted,
  { key: 'selesai_approve', label: 'Approved / Final', value: row => row.selesai_approve },
  { key: 'pct_approve', label: 'Capaian approve', value: row => row.pct_approve, kind: 'percent' },
]
const pengawasDetail: Column<PesTeamProgress>[] = [
  { key: 'jumlah_pencacah', label: 'Jumlah pencacah', value: row => row.jumlah_pencacah },
  { key: 'selesai_cacah', label: 'Selesai cacah', value: row => row.selesai_cacah },
  ...details,
]

export function PesEnumeratorTable({ rows, ...state }: TableState & { rows: PesPetugas[] }) {
  return <ProgressTable
    {...state} rows={rows} role="pencacah" title="Progres pencacah"
    description="Selesai cacah mencakup assignment yang sudah dikerjakan, termasuk yang disubmit, dikembalikan, atau disetujui."
    core={pencacahCore} detail={pencacahDetail} sourceAt={row => row.observed_at}
  />
}

export function PesSupervisorTable({ rows, ...state }: TableState & { rows: PesTeamProgress[] }) {
  return <ProgressTable
    {...state} rows={rows} role="pengawas" title="Progres pengawas"
    description="Submitted menunjukkan assignment berstatus submit. Capaian approve dihitung dari Approved / Final dibagi target tim."
    core={pengawasCore} detail={pengawasDetail}
  />
}

function format<T>(column: Column<T>, row: T) {
  const value = column.value(row)
  if (typeof value !== 'number') return value || '—'
  return column.kind === 'percent' ? percentLabel(value) : number.format(value)
}

function ProgressTable<T extends Row>({
  rows, role, title, description, core, detail, sourceAt, filterKey, loading, exportContext,
}: TableState & {
  rows: T[]
  role: 'pencacah' | 'pengawas'
  title: string
  description: string
  core: Column<T>[]
  detail: Column<T>[]
  sourceAt?: (row: T) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState({ key: core[core.length - 1].key, desc: true })
  const [page, setPage] = useState({ filterKey, index: 0 })
  const [error, setError] = useState('')
  const columns = expanded ? [...core, ...detail] : core
  const name = core[0]
  const activeSort = columns.find(column => column.key === sort.key)
  const sortColumn = activeSort ?? core[core.length - 1]
  const descending = activeSort ? sort.desc : true
  const sorted = [...rows].sort((a, b) => {
    const av = sortColumn.value(a), bv = sortColumn.value(b)
    const diff = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'id')
    return (descending ? -diff : diff) || String(name.value(a)).localeCompare(String(name.value(b)), 'id') || a.id.localeCompare(b.id)
  })
  const safePage = page.filterKey === filterKey ? Math.min(page.index, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1)) : 0
  const start = safePage * PAGE_SIZE
  const visible = sorted.slice(start, start + PAGE_SIZE)
  const id = `pes-${role}`

  async function download(kind: 'csv' | 'png') {
    setError('')
    try {
      const exporter = await import('@/lib/exportTable')
      const filename = `monitoring-pes-${role}${expanded ? '-detail' : ''}`
      if (kind === 'csv') {
        const header = columns.map(column => column.label + (column.kind === 'percent' ? ' %' : ''))
        if (sourceAt) header.push('Pembaruan sumber')
        exporter.exportCsv(`${filename}.csv`, header, sorted.map(row => [
          ...columns.map(column => column.value(row)), ...(sourceAt ? [sourceAt(row)] : []),
        ]))
      } else {
        await exporter.exportTablePng({
          filename: `${filename}.png`, title: `${title} PES SE2026`, subtitle: exportContext,
          rows: sorted,
          columns: columns.map(column => ({ label: column.label, width: column.kind === 'name' ? 210 : 125 })),
          cell: (row: T, index: number) => format(columns[index], row),
        })
      }
    } catch {
      setError('Ekspor tabel belum berhasil. Silakan coba lagi.')
    }
  }

  return <section id={id} className={styles.panel} data-role={role} aria-labelledby={`${id}-title`}>
    <div className={styles.panelHead}>
      <div>
        <p className={styles.eyebrow}>{role === 'pencacah' ? 'Pendataan lapangan' : 'Pemeriksaan data'}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.detailButton} aria-expanded={expanded} aria-controls={`${id}-table`} onClick={() => setExpanded(value => !value)}>
          <span aria-hidden="true">{expanded ? '−' : '+'}</span> {expanded ? 'Tutup detail' : 'Lihat detail'}
        </button>
        <button type="button" aria-label={`Unduh CSV ${role}`} disabled={!rows.length} onClick={() => void download('csv')}>CSV</button>
        <button type="button" aria-label={`Unduh PNG ${role}`} disabled={!rows.length} onClick={() => void download('png')}>PNG</button>
      </div>
    </div>
    {error && <p role="alert" className={styles.notice}>{error}</p>}
    <div className={styles.tableScroll} role="region" aria-label={`Tabel ${role}`} tabIndex={0}>
      <table id={`${id}-table`} className={styles.table} data-expanded={expanded}>
        <caption className={styles.srOnly}>{title} sesuai filter aktif</caption>
        <thead><tr>{columns.map(column => <th
          key={column.key} scope="col"
          aria-sort={sortColumn.key === column.key ? (descending ? 'descending' : 'ascending') : undefined}
        ><button type="button" onClick={() => {
          setSort({ key: column.key, desc: sortColumn.key === column.key ? !descending : column.kind !== 'name' })
          setPage({ filterKey, index: 0 })
        }}>{column.label}<span aria-hidden="true">{sortColumn.key === column.key ? (descending ? '↓' : '↑') : '↕'}</span></button></th>)}</tr></thead>
        <tbody>
          {!visible.length && <tr><td colSpan={columns.length} className={styles.placeholder}>{loading ? 'Memuat data…' : `Tidak ada ${role} sesuai filter`}</td></tr>}
          {visible.map(row => <tr key={row.id}>{columns.map(column => {
            const label = format(column, row)
            if (column.kind === 'name') {
              const initials = label.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
              return <th key={column.key} scope="row"><div className={styles.person}><span aria-hidden="true">{initials}</span><strong>{label}</strong></div></th>
            }
            if (column.kind === 'percent') return <td key={column.key}><div className={styles.progressCell}>
              <strong>{label}</strong><div className={styles.track} aria-hidden="true"><span style={{ width: `${Number(column.value(row))}%` }} /></div>
            </div></td>
            return <td key={column.key}>{label}</td>
          })}</tr>)}
        </tbody>
      </table>
    </div>
    <div className={styles.tableFoot}>
      <span>{rows.length > PAGE_SIZE ? `${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} dari ` : ''}{number.format(rows.length)} {role}</span>
      {rows.length > PAGE_SIZE && <div className={styles.actions}>
        <button type="button" aria-label={`Halaman ${role} sebelumnya`} disabled={!safePage} onClick={() => setPage({ filterKey, index: safePage - 1 })}>←</button>
        <button type="button" aria-label={`Halaman ${role} berikutnya`} disabled={start + PAGE_SIZE >= rows.length} onClick={() => setPage({ filterKey, index: safePage + 1 })}>→</button>
      </div>}
    </div>
  </section>
}
