-- =========================================================================
-- SE2026 Portal — Iterasi 9 Migration
-- Sosialisasi (posts) ke DB + media, Tim SE (tim_se) + PJ Kecamatan.
-- Idempotent: CREATE TABLE IF NOT EXISTS. MySQL 8+.
-- =========================================================================

-- ---------- POSTS (sosialisasi / berita) ----------
CREATE TABLE IF NOT EXISTS posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  judul       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  kategori    ENUM('berita','sosialisasi','infografis','video','pengumuman') NOT NULL DEFAULT 'berita',
  excerpt     VARCHAR(500) NULL,
  konten      LONGTEXT NULL,
  thumbnail   VARCHAR(500) NULL,
  media_type  ENUM('none','image','video') NOT NULL DEFAULT 'none',
  video_url   VARCHAR(500) NULL,
  author      VARCHAR(150) NOT NULL DEFAULT 'BPS Kab. Musi Rawas',
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_pub (published, kategori, created_at),
  INDEX idx_posts_slug (slug)
) ENGINE=InnoDB;

-- ---------- TIM SE (struktural + PJ Kecamatan) ----------
CREATE TABLE IF NOT EXISTS tim_se (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(150) NOT NULL,
  peran       VARCHAR(150) NOT NULL,
  foto        VARCHAR(500) NULL,
  tipe        ENUM('struktural','pj_kecamatan') NOT NULL DEFAULT 'struktural',
  kdkec       VARCHAR(10) NULL,
  nmkec       VARCHAR(150) NULL,
  urutan      INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tim_tipe (tipe, urutan)
) ENGINE=InnoDB;
