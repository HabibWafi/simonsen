-- =========================================================================
-- SE2026 Portal — Iterasi 22 Migration
-- Status admin kabupaten yang sebelumnya terlewat di bot (v9.6):
--   completed_admin  = COMPLETED BY Admin Kabupaten
--   edited_admin     = EDITED BY Admin Kabupaten
--   edited_pengawas  = EDITED BY Pengawas
-- Ketiganya = unit yang SUDAH disubmit pencacah (bagian dari selesai_cacah).
--   selesai_cacah   = total - open - draft
--   selesai_approve = approved + completed_admin + edited_admin
--
-- Satu kolom per statement supaya idempotent per-kolom (runner menelan
-- ER_DUP_FIELDNAME bila kolom sudah ada). MySQL 8+.
-- fasih_pengawas TIDAK menyimpan rincian per-status → tak diubah;
-- monitoring PML diagregasi dari fasih_subsls.
-- =========================================================================

ALTER TABLE fasih_kec ADD COLUMN completed_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_kec ADD COLUMN edited_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_kec ADD COLUMN edited_pengawas INT NOT NULL DEFAULT 0;

ALTER TABLE fasih_desa ADD COLUMN completed_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_desa ADD COLUMN edited_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_desa ADD COLUMN edited_pengawas INT NOT NULL DEFAULT 0;

ALTER TABLE fasih_sls ADD COLUMN completed_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_sls ADD COLUMN edited_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_sls ADD COLUMN edited_pengawas INT NOT NULL DEFAULT 0;

ALTER TABLE fasih_subsls ADD COLUMN completed_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_subsls ADD COLUMN edited_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_subsls ADD COLUMN edited_pengawas INT NOT NULL DEFAULT 0;

ALTER TABLE fasih_petugas ADD COLUMN completed_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_petugas ADD COLUMN edited_admin INT NOT NULL DEFAULT 0;
ALTER TABLE fasih_petugas ADD COLUMN edited_pengawas INT NOT NULL DEFAULT 0;
