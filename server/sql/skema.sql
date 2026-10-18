-- Skema Portal Mutu FTI. Dijalankan otomatis oleh `npm run siapkan` (aman diulang).

CREATE TABLE IF NOT EXISTS pengguna (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(32)  NOT NULL,
  nama             VARCHAR(120) NOT NULL,
  email            VARCHAR(160) NULL,
  peran            ENUM('admin','gpm','gkm','pimpinan') NOT NULL,
  prodi            VARCHAR(80)  NULL,
  sandi_hash       VARCHAR(100) NOT NULL,
  aktif            TINYINT(1)   NOT NULL DEFAULT 1,
  wajib_ganti_sandi TINYINT(1)  NOT NULL DEFAULT 1,
  gagal_login      INT UNSIGNED NOT NULL DEFAULT 0,
  terkunci_sampai  DATETIME     NULL,
  login_terakhir   DATETIME     NULL,
  sandi_diubah_pada DATETIME    NULL,
  dibuat_oleh      INT UNSIGNED NULL,
  dibuat_pada      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diubah_pada      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pengguna_username (username),
  KEY ix_pengguna_peran (peran, aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sesi (
  sid        VARCHAR(128) NOT NULL PRIMARY KEY,
  pengguna_id INT UNSIGNED NULL,
  data       MEDIUMTEXT   NOT NULL,
  kedaluwarsa BIGINT UNSIGNED NOT NULL,
  KEY ix_sesi_kedaluwarsa (kedaluwarsa),
  KEY ix_sesi_pengguna (pengguna_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS log_aktivitas (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pengguna_id INT UNSIGNED NULL,
  username    VARCHAR(32)  NULL,
  aksi        VARCHAR(40)  NOT NULL,
  target      VARCHAR(120) NULL,
  detail      VARCHAR(255) NULL,
  ip          VARCHAR(45)  NULL,
  waktu       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_log_waktu (waktu),
  KEY ix_log_pengguna (pengguna_id, waktu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci  VARCHAR(60)  NOT NULL PRIMARY KEY,
  nilai  VARCHAR(255) NOT NULL,
  diubah_oleh INT UNSIGNED NULL,
  diubah_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_mutu (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  isi          LONGTEXT     NOT NULL,
  catatan      VARCHAR(255) NULL,
  ukuran_byte  INT UNSIGNED NOT NULL,
  diunggah_oleh INT UNSIGNED NULL,
  diunggah_pada DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_data_waktu (diunggah_pada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
