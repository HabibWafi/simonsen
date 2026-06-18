-- =========================================================================
-- SE2026 Portal — Iterasi 7 Migration
-- Multi-tenant per-sensus + import rollback + external API
-- Idempotent: aman dijalankan ulang. MySQL 8+.
-- =========================================================================

-- ---------- SENSUS_CONFIG ----------
-- Config navbar/footer/branding per (sensus_kode, tahun)
CREATE TABLE IF NOT EXISTS sensus_config (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sensus_kode     VARCHAR(10) NOT NULL,
  tahun           INT NOT NULL,
  nama_lengkap    VARCHAR(150) NOT NULL,
  nama_pendek     VARCHAR(50) NOT NULL,
  primary_color   VARCHAR(10) NOT NULL,
  secondary_color VARCHAR(10) NULL,
  navbar_config   JSON NOT NULL,
  footer_config   JSON NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sensus_tahun (sensus_kode, tahun)
) ENGINE=InnoDB;

-- ---------- USER_SENSUS_ACCESS ----------
-- Akun global, akses per-sensus (1 user bisa di-grant role berbeda di sensus berbeda)
CREATE TABLE IF NOT EXISTS user_sensus_access (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  sensus_kode VARCHAR(10) NOT NULL,
  tahun       INT NOT NULL,
  role        ENUM('petugas','koordinator','admin') NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_sensus (user_id, sensus_kode, tahun),
  INDEX idx_sensus (sensus_kode, tahun),
  CONSTRAINT fk_usa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- IMPORT_BATCH_ROW ----------
-- Snapshot per-row tiap import → memungkinkan revoke/rollback
CREATE TABLE IF NOT EXISTS import_batch_row (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  batch_id      INT NOT NULL,
  idsbr         VARCHAR(20) NOT NULL,
  action        ENUM('insert','update','duplicate','error','skip') NOT NULL,
  before_json   JSON NULL,
  after_json    JSON NULL,
  error_message VARCHAR(500) NULL,
  row_index     INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch (batch_id),
  INDEX idx_idsbr (idsbr),
  CONSTRAINT fk_ibr_batch FOREIGN KEY (batch_id) REFERENCES import_batch(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- API_TOKEN ----------
-- Token external API per-sensus per-tahun (defense-in-depth)
CREATE TABLE IF NOT EXISTS api_token (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  label         VARCHAR(150) NOT NULL,
  token_hash    CHAR(64) NOT NULL UNIQUE,
  prefix        VARCHAR(20) NOT NULL,
  sensus_kode   VARCHAR(10) NOT NULL,
  tahun         INT NOT NULL,
  scopes        JSON NOT NULL,
  created_by    INT NOT NULL,
  expires_at    TIMESTAMP NULL,
  last_used_at  TIMESTAMP NULL,
  revoked_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sensus (sensus_kode, tahun),
  INDEX idx_active (revoked_at, expires_at),
  CONSTRAINT fk_token_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------- API_AUDIT_LOG ----------
CREATE TABLE IF NOT EXISTS api_audit_log (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  token_id        INT NULL,
  sensus_kode     VARCHAR(10) NOT NULL,
  tahun           INT NOT NULL,
  method          VARCHAR(10) NOT NULL,
  path            VARCHAR(500) NOT NULL,
  status          INT NOT NULL,
  ip              VARCHAR(45) NULL,
  user_agent      VARCHAR(300) NULL,
  request_summary JSON NULL,
  duration_ms     INT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token_id),
  INDEX idx_sensus_time (sensus_kode, tahun, created_at),
  CONSTRAINT fk_audit_token FOREIGN KEY (token_id) REFERENCES api_token(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- ALTER import_batch: status, revoke, sensus context ----------
-- Cek kolom satu per satu via INFORMATION_SCHEMA dulu (MySQL 8 tidak punya IF NOT EXISTS untuk ADD COLUMN)
-- Statement ini akan di-handle oleh setup-db.mjs dengan idempotent check

-- ---------- ALTER usaha: tambah sensus_kode + tahun (default 'se'/2026) ----------
-- Sama: handle via setup-db.mjs

-- =========================================================================
-- SEED SENSUS_CONFIG — 3 row default (se/2026 oren, sp/2030 biru, st/2033 hijau)
-- =========================================================================
INSERT IGNORE INTO sensus_config
  (sensus_kode, tahun, nama_lengkap, nama_pendek, primary_color, secondary_color, navbar_config, footer_config)
VALUES
(
  'se', 2026,
  'Sensus Ekonomi 2026', 'SE 2026',
  '#E8751A', '#C85E0A',
  JSON_OBJECT(
    'wordmarkAtas', 'Badan Pusat Statistik',
    'wordmarkBawah', 'Kabupaten Musi Rawas',
    'navLinks', JSON_ARRAY(
      JSON_OBJECT('label','Beranda','href','/se/2026'),
      JSON_OBJECT('label','Tahapan','href','/se/2026/tahapan'),
      JSON_OBJECT('label','Progress','href','/se/2026/progress'),
      JSON_OBJECT('label','Sosialisasi','href','/se/2026/sosialisasi'),
      JSON_OBJECT('label','FAQ','href','/se/2026/faq'),
      JSON_OBJECT('label','Tentang','href','/se/2026/tentang')
    ),
    'ctaLabel', 'Login Petugas',
    'ctaHref', '/se/2026/login'
  ),
  JSON_OBJECT(
    'tagline', 'Portal resmi Sensus Ekonomi 2026 Kabupaten Musi Rawas.',
    'kolomLinks', JSON_ARRAY(
      JSON_OBJECT('judul','Sensus Ekonomi 2026','items', JSON_ARRAY(
        JSON_OBJECT('label','Tahapan','href','/se/2026/tahapan'),
        JSON_OBJECT('label','Progress','href','/se/2026/progress'),
        JSON_OBJECT('label','Sosialisasi','href','/se/2026/sosialisasi'),
        JSON_OBJECT('label','FAQ','href','/se/2026/faq'),
        JSON_OBJECT('label','Publikasi','href','/se/2026/publikasi'),
        JSON_OBJECT('label','Tentang','href','/se/2026/tentang')
      )),
      JSON_OBJECT('judul','Portal Sensus', 'items', JSON_ARRAY(
        JSON_OBJECT('label','Sensus Penduduk','href','/sp'),
        JSON_OBJECT('label','Sensus Pertanian','href','/st'),
        JSON_OBJECT('label','Sensus Ekonomi','href','/se')
      ))
    ),
    'kontak', JSON_OBJECT(
      'alamat','Jl. Yos Sudarso No. 1, Muara Beliti, Musi Rawas, Sumatera Selatan',
      'telp','(0733) 1234567',
      'email','bps1605@bps.go.id'
    ),
    'sosmed', JSON_ARRAY(
      JSON_OBJECT('platform','facebook','url','https://facebook.com/bps.musirawas'),
      JSON_OBJECT('platform','instagram','url','https://instagram.com/bps_musirawas'),
      JSON_OBJECT('platform','youtube','url','https://youtube.com/@bpsmusirawas')
    ),
    'copyright', '© 2026 BPS Kabupaten Musi Rawas — Sensus Ekonomi 2026'
  )
),
(
  'sp', 2030,
  'Sensus Penduduk 2030', 'SP 2030',
  '#1877F2', '#0F5BCD',
  JSON_OBJECT(
    'wordmarkAtas', 'Badan Pusat Statistik',
    'wordmarkBawah', 'Kabupaten Musi Rawas',
    'navLinks', JSON_ARRAY(
      JSON_OBJECT('label','Beranda','href','/sp/2030')
    ),
    'ctaLabel', 'Login Petugas',
    'ctaHref', '/sp/2030/login'
  ),
  JSON_OBJECT(
    'tagline', 'Portal resmi Sensus Penduduk 2030 Kabupaten Musi Rawas.',
    'kolomLinks', JSON_ARRAY(),
    'kontak', JSON_OBJECT(
      'alamat','Jl. Yos Sudarso No. 1, Muara Beliti, Musi Rawas, Sumatera Selatan',
      'telp','(0733) 1234567',
      'email','bps1605@bps.go.id'
    ),
    'sosmed', JSON_ARRAY(),
    'copyright', '© 2030 BPS Kabupaten Musi Rawas — Sensus Penduduk 2030'
  )
),
(
  'st', 2033,
  'Sensus Pertanian 2033', 'ST 2033',
  '#00A651', '#007A3D',
  JSON_OBJECT(
    'wordmarkAtas', 'Badan Pusat Statistik',
    'wordmarkBawah', 'Kabupaten Musi Rawas',
    'navLinks', JSON_ARRAY(
      JSON_OBJECT('label','Beranda','href','/st/2033')
    ),
    'ctaLabel', 'Login Petugas',
    'ctaHref', '/st/2033/login'
  ),
  JSON_OBJECT(
    'tagline', 'Portal resmi Sensus Pertanian 2033 Kabupaten Musi Rawas.',
    'kolomLinks', JSON_ARRAY(),
    'kontak', JSON_OBJECT(
      'alamat','Jl. Yos Sudarso No. 1, Muara Beliti, Musi Rawas, Sumatera Selatan',
      'telp','(0733) 1234567',
      'email','bps1605@bps.go.id'
    ),
    'sosmed', JSON_ARRAY(),
    'copyright', '© 2033 BPS Kabupaten Musi Rawas — Sensus Pertanian 2033'
  )
);
