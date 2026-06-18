/**
 * Layout (admin) untuk /se/2026/dashboard/* dan /se/2026/login.
 * Sengaja KOSONG (passthrough) — tidak punya Navbar publik / Footer publik.
 * Tiap sub-route (dashboard, login) punya chrome-nya sendiri.
 */
export default function SE2026AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
