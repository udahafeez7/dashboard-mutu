-- Jalankan sekali sebagai root MySQL (phpMyAdmin > SQL, atau: mysql -u root -p < buat-database.sql).
-- Ganti GANTI_PASSWORD_INI dengan password yang kuat, lalu isi nilai yang sama di server/.env (DB_PASS).
CREATE DATABASE IF NOT EXISTS portal_mutu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'portal_mutu'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_INI';
CREATE USER IF NOT EXISTS 'portal_mutu'@'127.0.0.1' IDENTIFIED BY 'GANTI_PASSWORD_INI';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON portal_mutu.* TO 'portal_mutu'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON portal_mutu.* TO 'portal_mutu'@'127.0.0.1';
FLUSH PRIVILEGES;
