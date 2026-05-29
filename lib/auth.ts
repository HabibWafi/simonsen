import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import pool from './db'

/**
 * next-auth v5 (Auth.js) — Next.js 16 compatible.
 * Migrasi dari v4: API pakai centralized config export `{ auth, signIn, signOut, handlers }`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        nip:      { label: 'NIP', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const nip = credentials?.nip as string | undefined
        const password = credentials?.password as string | undefined
        if (!nip || !password) return null

        try {
          const [rows] = await pool.execute(
            'SELECT id, nip, nama, role, kecamatan, kdkec, password FROM users WHERE nip = ? LIMIT 1',
            [nip],
          ) as [any[], any]

          if (!rows.length) return null
          const user = rows[0]

          const storedHash = String(user.password ?? '')
          let valid = false

          if (storedHash.startsWith('$2')) {
            valid = await bcrypt.compare(password, storedHash)
          } else {
            // legacy sha256 — verify then auto-upgrade
            const { createHash } = await import('node:crypto')
            const sha = createHash('sha256').update(password).digest('hex')
            if (sha === storedHash) {
              valid = true
              const newHash = await bcrypt.hash(password, 10)
              await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id])
            }
          }

          if (!valid) return null

          return {
            id: String(user.id),
            name: user.nama,
            email: user.nip,
            role: user.role,
            kecamatan: user.kecamatan,
            kdkec: user.kdkec,
          } as any
        } catch (e: any) {
          console.error('[auth] authorize error:', e?.message ?? e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as any
        token.role = u.role
        token.kecamatan = u.kecamatan
        token.kdkec = u.kdkec
        token.uid = u.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const su = session.user as any
        su.id = token.uid
        su.role = token.role
        su.kecamatan = token.kecamatan
        su.kdkec = token.kdkec
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
