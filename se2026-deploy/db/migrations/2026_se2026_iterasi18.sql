-- =========================================================================
-- SE2026 Portal — Iterasi 18 Migration
-- Snapshot cumulative progress petugas per HARI (untuk hitung progress harian).
--
-- Mekanisme cron-free: tiap ingest dari bot meng-upsert baris untuk
-- (tanggal_WIB, pencacah, kode_kec) dengan nilai cumulative TERBARU hari itu.
-- Progress harian = cum_cacah(tanggal) - cum_cacah(tanggal sebelumnya).
-- Idempotent: CREATE TABLE IF NOT EXISTS. MySQL 8+.
-- =========================================================================

CREATE TABLE IF NOT EXISTS fasih_petugas_harian (
  tanggal       DATE NOT NULL,                 -- tanggal WIB (Asia/Jakarta)
  pencacah      VARCHAR(150) NOT NULL,         -- email pencacah
  kode_kec      VARCHAR(7) NOT NULL,
  nama_ppl      VARCHAR(150) NULL,
  nama_pml      VARCHAR(150) NULL,
  total         INT NOT NULL DEFAULT 0,        -- total assignment (cumulative hari itu)
  cum_cacah     INT NOT NULL DEFAULT 0,        -- cumulative selesai_cacah s/d saat itu
  cum_approve   INT NOT NULL DEFAULT 0,        -- cumulative selesai_approve
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tanggal, pencacah, kode_kec),
  INDEX idx_fph_kec_tgl (kode_kec, tanggal),
  INDEX idx_fph_tgl (tanggal),
  INDEX idx_fph_pencacah (pencacah)
) ENGINE=InnoDB;
