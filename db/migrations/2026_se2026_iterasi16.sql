-- =========================================================================
-- SE2026 Portal — Iterasi 16 Migration
-- Tabel rekap progress hasil scraper Fasih (agregat per wilayah & petugas).
-- Idempotent: CREATE TABLE IF NOT EXISTS. MySQL 8+.
--
-- Metrik kolom (semua level wilayah memakai set yang sama):
--   total, open, draft, submitted_pencacah, submitted_responden,
--   approved, rejected, revoked, selesai_cacah, selesai_approve,
--   pct_cacah, pct_approve
-- =========================================================================

-- Metadata tiap kali bot/operator push snapshot
CREATE TABLE IF NOT EXISTS fasih_snapshot (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_ts  VARCHAR(20) NULL,             -- "20260617_0500" dari nama file scraper
  source       ENUM('json','excel') NOT NULL DEFAULT 'json',
  token_id     INT NULL,
  rows_total   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fsnap_created (created_at)
) ENGINE=InnoDB;

-- Rekap Kecamatan
CREATE TABLE IF NOT EXISTS fasih_kec (
  kode_kec            VARCHAR(7) PRIMARY KEY,
  total               INT NOT NULL DEFAULT 0,
  open                INT NOT NULL DEFAULT 0,
  draft               INT NOT NULL DEFAULT 0,
  submitted_pencacah  INT NOT NULL DEFAULT 0,
  submitted_responden INT NOT NULL DEFAULT 0,
  approved            INT NOT NULL DEFAULT 0,
  rejected            INT NOT NULL DEFAULT 0,
  revoked             INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Rekap Desa
CREATE TABLE IF NOT EXISTS fasih_desa (
  kode_desa           VARCHAR(10) PRIMARY KEY,
  kode_kec            VARCHAR(7) NOT NULL,
  total               INT NOT NULL DEFAULT 0,
  open                INT NOT NULL DEFAULT 0,
  draft               INT NOT NULL DEFAULT 0,
  submitted_pencacah  INT NOT NULL DEFAULT 0,
  submitted_responden INT NOT NULL DEFAULT 0,
  approved            INT NOT NULL DEFAULT 0,
  rejected            INT NOT NULL DEFAULT 0,
  revoked             INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fdesa_kec (kode_kec)
) ENGINE=InnoDB;

-- Rekap SLS
CREATE TABLE IF NOT EXISTS fasih_sls (
  kode_sls            VARCHAR(14) PRIMARY KEY,
  kode_kec            VARCHAR(7) NOT NULL,
  kode_desa           VARCHAR(10) NOT NULL,
  total               INT NOT NULL DEFAULT 0,
  open                INT NOT NULL DEFAULT 0,
  draft               INT NOT NULL DEFAULT 0,
  submitted_pencacah  INT NOT NULL DEFAULT 0,
  submitted_responden INT NOT NULL DEFAULT 0,
  approved            INT NOT NULL DEFAULT 0,
  rejected            INT NOT NULL DEFAULT 0,
  revoked             INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fsls_desa (kode_desa),
  INDEX idx_fsls_kec (kode_kec)
) ENGINE=InnoDB;

-- Detail SUBSLS (granular + link petugas)
CREATE TABLE IF NOT EXISTS fasih_subsls (
  kode_terkecil       VARCHAR(20) PRIMARY KEY,
  kode_kec            VARCHAR(7) NOT NULL,
  kode_desa           VARCHAR(10) NOT NULL,
  kode_sls            VARCHAR(14) NULL,
  nama_desa           VARCHAR(150) NULL,
  nama_sls            VARCHAR(150) NULL,
  level_terkecil      VARCHAR(20) NULL,
  kode_unit16         VARCHAR(20) NULL,
  pencacah            VARCHAR(150) NULL,
  nama_ppl            VARCHAR(150) NULL,
  pengawas            VARCHAR(150) NULL,
  nama_pml            VARCHAR(150) NULL,
  total               INT NOT NULL DEFAULT 0,
  open                INT NOT NULL DEFAULT 0,
  draft               INT NOT NULL DEFAULT 0,
  submitted_pencacah  INT NOT NULL DEFAULT 0,
  submitted_responden INT NOT NULL DEFAULT 0,
  approved            INT NOT NULL DEFAULT 0,
  rejected            INT NOT NULL DEFAULT 0,
  revoked             INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fsubsls_kec (kode_kec),
  INDEX idx_fsubsls_desa (kode_desa),
  INDEX idx_fsubsls_pencacah (pencacah)
) ENGINE=InnoDB;

-- Progress Petugas (per pencacah/PPL)
CREATE TABLE IF NOT EXISTS fasih_petugas (
  pencacah            VARCHAR(150) PRIMARY KEY,   -- email pencacah
  nama_ppl            VARCHAR(150) NULL,
  nama_pml            VARCHAR(150) NULL,
  jumlah_unit         INT NOT NULL DEFAULT 0,
  target              INT NOT NULL DEFAULT 0,
  open                INT NOT NULL DEFAULT 0,
  draft               INT NOT NULL DEFAULT 0,
  submitted_pencacah  INT NOT NULL DEFAULT 0,
  submitted_responden INT NOT NULL DEFAULT 0,
  approved            INT NOT NULL DEFAULT 0,
  rejected            INT NOT NULL DEFAULT 0,
  revoked             INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Progress Pengawas (per PML)
CREATE TABLE IF NOT EXISTS fasih_pengawas (
  pengawas            VARCHAR(150) PRIMARY KEY,   -- email pengawas
  nama_pml            VARCHAR(150) NULL,
  jumlah_ppl          INT NOT NULL DEFAULT 0,
  jumlah_unit         INT NOT NULL DEFAULT 0,
  target              INT NOT NULL DEFAULT 0,
  selesai_cacah       INT NOT NULL DEFAULT 0,
  selesai_approve     INT NOT NULL DEFAULT 0,
  pct_cacah           DECIMAL(6,2) NOT NULL DEFAULT 0,
  pct_approve         DECIMAL(6,2) NOT NULL DEFAULT 0,
  snapshot_id         INT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
