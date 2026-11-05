-- PES SE2026 only. Additive, idempotent; does not modify Fasih/SE2026 records.
-- All DATETIME values below are UTC; tanggal is the source date in Asia/Jakarta.
CREATE TABLE IF NOT EXISTS pes_snapshot (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  observed_at DATETIME(3) NOT NULL,
  token_id INT NULL,
  rows_total INT NOT NULL,
  received_at DATETIME(3) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pes_petugas (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  source_key VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
  nama_ppl VARCHAR(150) NOT NULL DEFAULT '',
  nama_pml VARCHAR(150) NOT NULL DEFAULT '',
  total INT UNSIGNED NOT NULL DEFAULT 0,
  open INT UNSIGNED NOT NULL DEFAULT 0,
  draft INT UNSIGNED NOT NULL DEFAULT 0,
  submitted_pencacah INT UNSIGNED NOT NULL DEFAULT 0,
  submitted_responden INT UNSIGNED NOT NULL DEFAULT 0,
  approved INT UNSIGNED NOT NULL DEFAULT 0,
  rejected INT UNSIGNED NOT NULL DEFAULT 0,
  revoked INT UNSIGNED NOT NULL DEFAULT 0,
  completed_admin INT UNSIGNED NOT NULL DEFAULT 0,
  edited_admin INT UNSIGNED NOT NULL DEFAULT 0,
  edited_pengawas INT UNSIGNED NOT NULL DEFAULT 0,
  selesai_cacah INT UNSIGNED NOT NULL DEFAULT 0,
  selesai_approve INT UNSIGNED NOT NULL DEFAULT 0,
  observed_at DATETIME(3) NULL,
  observed_ms BIGINT UNSIGNED NULL,
  row_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  snapshot_id BIGINT UNSIGNED NULL,
  FOREIGN KEY (snapshot_id) REFERENCES pes_snapshot(id),
  INDEX idx_pes_observed (observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pes_petugas_harian (
  petugas_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  tanggal DATE NOT NULL,
  total INT UNSIGNED NOT NULL,
  selesai_cacah INT UNSIGNED NOT NULL,
  selesai_approve INT UNSIGNED NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  PRIMARY KEY (petugas_id, tanggal),
  FOREIGN KEY (petugas_id) REFERENCES pes_petugas(id),
  INDEX idx_pes_harian_tanggal (tanggal)
) ENGINE=InnoDB;
