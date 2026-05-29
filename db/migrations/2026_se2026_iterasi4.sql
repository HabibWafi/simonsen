-- =========================================================================
-- SE2026 Portal — Iterasi 4 Migration
-- Idempotent: aman dijalankan ulang. Pakai MySQL 8+.
-- =========================================================================

-- ---------- USERS (existing, alter aman) ----------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nip         VARCHAR(30) NOT NULL UNIQUE,
  nama        VARCHAR(150) NOT NULL,
  role        ENUM('petugas','koordinator','admin') NOT NULL DEFAULT 'petugas',
  kecamatan   VARCHAR(150) NULL,
  kdkec       VARCHAR(10)  NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tambahkan kolom kdkec kalau migrasi dari versi lama (idempotent)
-- MySQL 8 belum dukung ADD COLUMN IF NOT EXISTS, jadi pakai INFORMATION_SCHEMA check via stored proc
DROP PROCEDURE IF EXISTS se2026_add_col_kdkec;
DELIMITER //
CREATE PROCEDURE se2026_add_col_kdkec()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'kdkec'
  ) THEN
    ALTER TABLE users ADD COLUMN kdkec VARCHAR(10) NULL AFTER kecamatan;
  END IF;
END //
DELIMITER ;
CALL se2026_add_col_kdkec();
DROP PROCEDURE se2026_add_col_kdkec;

-- ---------- TAHAPAN ----------
CREATE TABLE IF NOT EXISTS tahapan (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  judul      VARCHAR(200) NOT NULL,
  periode    VARCHAR(100) NOT NULL,
  start_date DATE NULL,
  end_date   DATE NULL,
  status     ENUM('selesai','aktif','akan-datang') NOT NULL DEFAULT 'akan-datang',
  deskripsi  TEXT,
  icon       VARCHAR(10),
  urutan     INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_urutan (urutan)
) ENGINE=InnoDB;

-- ---------- TAHAPAN_AKSES ----------
CREATE TABLE IF NOT EXISTS tahapan_akses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tahapan_id  INT NOT NULL,
  nama        VARCHAR(200) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  tipe        ENUM('drive','dokumen','spreadsheet','form','link') NOT NULL DEFAULT 'link',
  urutan      INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tahapan (tahapan_id),
  CONSTRAINT fk_akses_tahapan FOREIGN KEY (tahapan_id) REFERENCES tahapan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- DESA ----------
CREATE TABLE IF NOT EXISTS desa (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  kddesa  VARCHAR(15) NOT NULL UNIQUE,
  nama    VARCHAR(150) NOT NULL,
  kdkec   VARCHAR(10)  NOT NULL,
  nmkec   VARCHAR(150) NOT NULL,
  INDEX idx_kec (kdkec)
) ENGINE=InnoDB;

-- ---------- USAHA (master + progress per IDSBR) ----------
CREATE TABLE IF NOT EXISTS usaha (
  idsbr             VARCHAR(20) PRIMARY KEY,
  nama              VARCHAR(255) NOT NULL,
  alamat            TEXT,
  kdprov            VARCHAR(5),
  kdkab             VARCHAR(10),
  kdkec             VARCHAR(10) NOT NULL,
  kddesa            VARCHAR(15) NOT NULL,
  kdsls             VARCHAR(20),
  nmprov            VARCHAR(100),
  nmkab             VARCHAR(100),
  nmkec             VARCHAR(150) NOT NULL,
  nmdesa            VARCHAR(150) NOT NULL,
  nmsls             VARCHAR(150),
  skala_usaha       ENUM('UMK','UM','UB') NOT NULL,

  status_pencacahan ENUM('belum','proses','selesai','tolak','tutup','ganda') NOT NULL DEFAULT 'belum',
  petugas_id        INT NULL,
  tanggal_cacah     DATE NULL,
  catatan           TEXT NULL,
  lat               DECIMAL(10,7) NULL,
  lng               DECIMAL(10,7) NULL,

  imported_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_kec (kdkec),
  INDEX idx_desa (kddesa),
  INDEX idx_skala (skala_usaha),
  INDEX idx_status (status_pencacahan),
  INDEX idx_kec_skala (kdkec, skala_usaha),
  CONSTRAINT fk_usaha_petugas FOREIGN KEY (petugas_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- IMPORT_BATCH ----------
CREATE TABLE IF NOT EXISTS import_batch (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  jenis           ENUM('master_usaha','progress_fasih') NOT NULL,
  filename        VARCHAR(255),
  total_rows      INT DEFAULT 0,
  inserted_rows   INT DEFAULT 0,
  updated_rows    INT DEFAULT 0,
  duplicate_rows  INT DEFAULT 0,
  error_rows      INT DEFAULT 0,
  error_summary   TEXT,
  imported_by     INT NOT NULL,
  imported_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jenis (jenis),
  INDEX idx_imported_at (imported_at),
  CONSTRAINT fk_batch_user FOREIGN KEY (imported_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================================
-- SEED TAHAPAN (6 row dari mockData) — INSERT IGNORE supaya re-run aman
-- =========================================================================
INSERT IGNORE INTO tahapan (id, judul, periode, status, deskripsi, icon, urutan) VALUES
(1, 'Sosialisasi & Persiapan',  'Jan – Apr 2026',     'selesai',     'Sosialisasi kepada pelaku usaha, pelatihan petugas, dan persiapan peta blok sensus.', '📢', 1),
(2, 'Pelatihan Petugas',        'Apr – Mei 2026',     'selesai',     'Pelatihan teknis pencacahan bagi 34 petugas lapangan dan 6 koordinator kecamatan.',    '🎓', 2),
(3, 'Pencacahan Online',        'Mei – Agt 2026',     'aktif',       'Pengisian kuesioner SE2026 secara mandiri oleh pelaku usaha melalui portal online.',   '💻', 3),
(4, 'Pendataan Door to Door',   '15 Jun – 31 Agt 2026','aktif',      'Kunjungan langsung petugas ke lokasi usaha untuk pendataan menyeluruh.',               '📍', 4),
(5, 'Pengolahan & Validasi',    'Sep – Nov 2026',     'akan-datang', 'Pengolahan data hasil pencacahan, validasi, dan koreksi data oleh tim BPS.',          '🗄️', 5),
(6, 'Publikasi Hasil',          'Des 2026',           'akan-datang', 'Rilis publikasi resmi hasil Sensus Ekonomi 2026 Kabupaten Musi Rawas.',                '📊', 6);
