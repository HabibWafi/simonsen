import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-guard'
import TaggingDashboardClient from './TaggingDashboardClient'

export const dynamic = 'force-dynamic'

export default async function TaggingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/se/2026/login?callbackUrl=/se/2026/dashboard/tagging')
  if (user.role !== 'admin') redirect('/se/2026/dashboard')
  return <TaggingDashboardClient />
}
