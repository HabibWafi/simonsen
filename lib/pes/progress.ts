import { percent, type PesCounts, type PesPetugas } from './domain'

const teamFields = [
  'total', 'open', 'draft', 'submitted_pencacah', 'submitted_responden', 'approved',
  'rejected', 'revoked', 'completed_admin', 'edited_admin', 'selesai_cacah', 'selesai_approve',
] as const satisfies readonly (keyof PesCounts)[]

type TeamCounts = Pick<PesCounts, typeof teamFields[number]>
type Team = TeamCounts & { id: string; nama_pml: string; jumlah_pencacah: number }
export type PesTeamProgress = Team & { pct_approve: number }

export const submittedPes = (row: Pick<PesCounts, 'submitted_pencacah' | 'submitted_responden'>) =>
  row.submitted_pencacah + row.submitted_responden

export function groupPesBySupervisor(rows: readonly PesPetugas[]): PesTeamProgress[] {
  const teams = new Map<string, Team>()
  const zero = Object.fromEntries(teamFields.map(field => [field, 0])) as TeamCounts

  for (const row of rows) {
    const name = row.nama_pml.trim()
    let team = teams.get(name)
    if (!team) {
      team = { ...zero, id: `pengawas:${name}`, nama_pml: name || 'Belum ditetapkan', jumlah_pencacah: 0 }
      teams.set(name, team)
    }
    team.jumlah_pencacah += 1
    for (const field of teamFields) team[field] += row[field]
  }

  return Array.from(teams.values(), team => ({ ...team, pct_approve: percent(team.selesai_approve, team.total) }))
}
