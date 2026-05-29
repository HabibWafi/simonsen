import mysql from 'mysql2/promise'

if (!process.env.DB_USER) {
  console.warn('[db] DB_USER tidak di-set di env. Pool akan gagal connect.')
}
if (!process.env.DB_NAME) {
  console.warn('[db] DB_NAME tidak di-set di env.')
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST     ?? 'localhost',
  port:               Number(process.env.DB_PORT ?? 3306),
  user:               process.env.DB_USER,
  // Hostinger: password wajib diisi. Laragon lokal: boleh kosong.
  password:           process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '',
  database:           process.env.DB_NAME,
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
})

export default pool
