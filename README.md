# Portal Mutu FTI Universitas Andalas (untuk GPM)

Dibangun dari Renstra FTI UNAND 2026-2030 (SK Dekan No. 67/UN16.15.D/KPT/VIII/2026).
Dashboard memiliki tiga modul: **Monitoring Indikator**, **Monitoring Tindak Lanjut**, dan **Capaian Akreditasi**. Dashboard berada di dalam portal berlogin, dengan akun, sesi, log, pengaturan, dan data yang disimpan di **MySQL**.

Menyiapkan di perangkat lain (clone, XAMPP, menjalankan, commit): lihat [PANDUAN-DEVELOP.md](PANDUAN-DEVELOP.md).

## Mulai cepat (Windows + XAMPP)
1. Nyalakan **MySQL** di XAMPP Control Panel. Apache tidak diperlukan, dan folder proyek **tidak** perlu dipindah ke `htdocs`.
2. Buat database dan pengguna MySQL: buka phpMyAdmin > tab **SQL**, tempel isi [server/sql/buat-database.sql](server/sql/buat-database.sql), lalu ganti `GANTI_PASSWORD_INI` dengan password yang kuat.
3. Siapkan server:
   ```bash
   cd server
   npm install
   copy .env.example .env        # lalu isi DB_PASS dan SESSION_SECRET
   npm run siapkan -- --admin admin --nama "Admin GPM FTI"
   npm start
   ```
4. Buka http://localhost:3000. Masuk dengan password sementara yang ditampilkan `npm run siapkan`; portal langsung meminta password baru.

## Apa yang sudah asli dan apa yang masih contoh
| Bagian | Status |
|---|---|
| 40 IKSS, program P1-P28, sasaran SS1-SS6, baseline 2025, target 2026-2030 | ASLI (Tabel 6 Renstra) |
| 3 prodi dan peringkat akreditasi saat ini (TK: Baik Sekali, SI: Baik Sekali, Informatika: Baik) | ASLI (Bab 2.3) |
| 36 standar SPMI (Pendidikan 14, Penelitian 11, PkM 11) | ASLI (Tabel 8-10) |
| Redaksi temuan tindak lanjut | Diambil dari Renstra Bab 3-4 (rujukan dicantumkan) |
| Realisasi IKSS, status/progres/tenggat tindak lanjut, evidence per standar, progres LED | CONTOH: wajib diganti |

Setelah data asli diisi, ubah `"data_contoh": true` menjadi `false` di `meta`, lalu unggah lewat **Pengaturan > Data Dashboard**.

## Arsitektur
```
Browser ──HTTPS──▶ Node.js Express (server/) ──▶ MySQL / MariaDB (XAMPP)
                    ├─ menyajikan halaman & assets yang diizinkan saja
                    ├─ /api/masuk, /api/saya ...   sesi cookie HttpOnly (tabel sesi)
                    ├─ /api/akun ...               manajemen akun (admin)
                    ├─ /api/mutu ...               data dashboard berversi (tabel data_mutu)
                    └─ /api/pengaturan ...         kebijakan keamanan + log aktivitas
```

**Tabel MySQL** ([server/sql/skema.sql](server/sql/skema.sql)):

| Tabel | Isi |
|---|---|
| `pengguna` | Akun: username, nama, email, peran, prodi, hash password (bcrypt), status aktif, penguncian, waktu masuk terakhir |
| `sesi` | Sesi login. Semua sesi satu akun diputus saat password diganti atau direset, akun dinonaktifkan, atau dihapus |
| `log_aktivitas` | Audit: masuk, gagal masuk, penguncian, pembuatan dan perubahan akun, reset password, pengaturan, unggah data |
| `pengaturan` | Batas tidak aktif, umur sesi, batas salah password, lama penguncian, panjang password minimum |
| `data_mutu` | Versi-versi data dashboard (JSON). Versi terbaru yang ditampilkan; versi lama bisa dipulihkan |

**Peran**

| Peran | Akses |
|---|---|
| `admin` | Semua fitur: Manajemen Akun (daftar, pendaftaran, ubah, reset password, buka kunci, nonaktifkan, hapus), Log Aktivitas, Pengaturan Keamanan, Data Dashboard |
| `gpm` | Dashboard + unggah Data Dashboard |
| `gkm` | Dashboard, terbuka langsung pada prodinya (wajib punya prodi) |
| `pimpinan` | Dashboard (membaca) |

Pendaftaran akun **hanya oleh admin**. Akun baru dan akun yang direset mendapat password sementara yang ditampilkan sekali dan **wajib diganti** saat pertama masuk; sebelum diganti, server menolak semua fitur lain.

**Keamanan yang diterapkan**
- Password di-hash dengan bcrypt (cost 12). Username yang tidak ada diproses dengan waktu yang sama agar tidak bisa ditebak.
- Akun dikunci sementara setelah N kali salah password, ditambah pembatasan 30 percobaan masuk per 15 menit per alamat IP.
- Cookie sesi `HttpOnly` dan `SameSite=Strict` (ditambah `Secure` di produksi), dengan batas tidak aktif dan umur sesi maksimum.
- Perlindungan CSRF: setiap permintaan yang mengubah data wajib membawa header `X-Portal`, dan Origin diperiksa.
- Header keamanan (Helmet): CSP, `frame-ancestors 'none'`, `nosniff`, `no-referrer`. HSTS aktif di produksi.
- Halaman dan API dijaga di server menurut peran. Menu sidebar yang disembunyikan hanyalah kenyamanan, bukan pengamanan.
- Hanya file halaman yang terdaftar dan folder `assets/` yang bisa diakses dari web. `server/`, `sumber/`, `.env`, dan `.git` tidak.
- Admin tidak bisa menonaktifkan, menurunkan, atau menghapus dirinya sendiri, dan sistem selalu menyisakan minimal satu admin aktif.

## Struktur
- **Halaman:** `index.html` (masuk), `portal.html` (beranda), `dashboard.html`, `akun-saya.html` (profil + ganti password), `kelola-akun.html` (daftar, pendaftaran, log), `pengaturan.html` (keamanan, data dashboard)
- **`assets/`**
  - `auth.js`: klien API dan sesi; `ui.js`: sidebar, loader, toast, modal logout, peringatan sesi; `hitung.js`: rumus capaian
  - `login.js`, `landing.css`, `latar.js`, `splash.js`: halaman masuk
  - `portal.js`, `dashboard.js`, `akun-saya.js`, `kelola-akun.js`, `pengaturan.js`: skrip per halaman
  - `ui.css` (tema silver, bilah atas, sidebar), `portal.css`, `halaman.css`, `tabel.css`
  - `img/`: logo FTI transparan (dipecah untuk animasi) dan favicon
- **`server/`**
  - `src/app.js`: server Express, penjaga halaman, header keamanan
  - `src/routes/`: `sesi.js`, `akun.js`, `mutu.js`, `pengaturan.js`
  - `src/auth.js`, `src/sesi-store.js`, `src/db.js`, `src/log.js`, `src/validasi.js`
  - `sql/skema.sql`, `sql/buat-database.sql`
  - `scripts/siapkan.js` (`npm run siapkan`), `scripts/impor-data.js` (`npm run impor-data`)
  - `.env.example`: contoh konfigurasi; `.env` asli **tidak di-commit**
- **Plugin dari CDN jsDelivr** (dengan hash SRI): Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Animate.css 4.1.1, Chart.js 4.5.1
- **Data contoh:** `gen_data.py` membuat `sumber/mutu.json` (tidak di-commit), yang bisa diimpor ke database

## Cara mengisi data
Unduh versi aktif di **Pengaturan > Data Dashboard**, edit file JSON-nya, lalu unggah sebagai versi baru.
- **IKSS**: isi `realisasi` dengan daftar nilai per triwulan, misalnya `[88.0, 91.5, 93.2]`. Indikator pengukuran tahunan (AEE PT, tracer study) boleh `null` sampai datanya ada.
  - `tipe: "kumulatif"`: dibandingkan dengan target pro-rata triwulan.
  - `arah: "turun"`: semakin kecil semakin baik (rasio dosen, laporan pelanggaran).
- **Tindak lanjut**: satu objek per temuan. `sumber` diisi AMI, RTM, atau Evaluasi Perkuliahan. `prodi` diisi nama prodi atau `Fakultas`. `status`: Selesai, Berjalan, atau Belum mulai. Status "Terlambat" dihitung otomatis dari `tenggat`.
- **Akreditasi**: ubah `peringkat_saat_ini` bila hasil akreditasi baru terbit, isi `evidence_pct` per standar dan `led_progres`.

## Menjalankan di server kampus/VPS
- Isi `NODE_ENV=production` dan `HOST=127.0.0.1` di `server/.env`, lalu letakkan portal di belakang reverse proxy HTTPS (Nginx/Apache) dengan `TRUST_PROXY=1`. Mode produksi mewajibkan HTTPS karena cookie bertanda `Secure`.
- Jalankan sebagai layanan agar hidup kembali setelah restart, misalnya dengan PM2 (`pm2 start src/app.js --name portal-mutu`) atau NSSM di Windows.
- Cadangkan database secara berkala: `mysqldump -u root -p portal_mutu > cadangan.sql`.
- Beri password pada akun `root` MySQL. Bawaan XAMPP tanpa password, dan itu hanya aman di komputer pribadi.

GitHub Pages tidak lagi dipakai karena tidak bisa menjalankan server dan database.
