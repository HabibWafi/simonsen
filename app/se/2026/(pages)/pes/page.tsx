import type { Metadata } from 'next'
import PesMonitor from '@/components/pes/PesMonitor'

export const metadata: Metadata = { title: 'Monitoring PES SE2026 — BPS Kabupaten Musi Rawas', description: 'Monitoring assignment, capaian pendataan, pemeriksaan, dan riwayat petugas Post Enumeration Survey SE2026 Kabupaten Musi Rawas.' }
export default function PesPage() { return <PesMonitor /> }
