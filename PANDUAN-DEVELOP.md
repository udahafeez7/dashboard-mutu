# Panduan Pengembangan Portal Mutu FTI

Panduan ini untuk menyiapkan proyek di perangkat baru (Windows + XAMPP), menjalankannya secara lokal, lalu meng-commit perubahan ke GitHub.
Arsitektur dan fitur portal dijelaskan di [README.md](README.md).

Repositori: https://github.com/udahafeez7/dashboard-mutu (cabang `main`)

---

## 1. Hal penting sebelum mulai

Portal terdiri dari **halaman web** (folder akar dan `assets/`), **server Node.js** (`server/`), dan **database MySQL**.
Akun, sesi, log, pengaturan, dan data dashboard **ada di database**, bukan di git.

| Isi | Di git? | Keterangan |
|---|---|---|
| Halaman, `assets/`, `server/src`, `server/sql`, `server/scripts` | Ya | Kode |
| `server/package.json`, `server/package-lock.json` | Ya | Daftar dependensi dengan versi terkunci |
| `server/.env` | **Tidak** | Password database dan rahasia sesi. Dibuat per perangkat |
| `server/node_modules/` | **Tidak** | Dibuat oleh `npm install` |
| `sumber/mutu.json` | **Tidak** | Data mentah lokal (opsional) |
| Isi database (akun, data, log) | **Tidak** | Ada di MySQL masing-masing perangkat/server |

Artinya, database di perangkat baru masih kosong. Anda membuat admin dan mengimpor data sendiri (langkah 6), atau memindahkan cadangan database (bagian 9).

---

## 2. Prasyarat

1. **Git**: https://git-scm.com/downloads
2. **Node.js 20 atau lebih baru** (LTS): https://nodejs.org. Cek dengan `node --version`.
3. **XAMPP**: https://www.apachefriends.org. Yang dipakai hanya **MySQL**; Apache tidak perlu dinyalakan.
4. **Python 3** (opsional), hanya bila ingin membuat data contoh dengan `gen_data.py`.
5. **Akses tulis** ke repositori `udahafeez7/dashboard-mutu`.

> **Tidak perlu** memindahkan folder proyek ke `C:\xampp\htdocs`. Folder `htdocs` hanya untuk Apache/PHP; portal ini dijalankan oleh Node.js dari folder mana pun (misalnya `D:\dashboard-mutu`).

---

## 3. Clone repositori

```bash
git clone https://github.com/udahafeez7/dashboard-mutu.git
cd dashboard-mutu
git config --global user.name "udahafeez7"
git config --global user.email "mohammadhafizhersyah02@it.unand.ac.id"
```

Saat pertama kali push, Git meminta login GitHub. Di Windows jendela browser Git Credential Manager terbuka; di macOS/Linux gunakan Personal Access Token atau SSH.

---

## 4. Siapkan database MySQL (sekali per perangkat)

1. Buka **XAMPP Control Panel**, lalu klik **Start** pada **MySQL**.
2. Buka phpMyAdmin (http://localhost/phpmyadmin, Apache perlu dinyalakan sementara) > tab **SQL**, atau gunakan terminal:
   ```bash
   C:\xampp\mysql\bin\mysql.exe -u root
   ```
3. Jalankan isi [server/sql/buat-database.sql](server/sql/buat-database.sql) setelah mengganti `GANTI_PASSWORD_INI` dengan password yang kuat. Perintah ini membuat:
   - database `portal_mutu`
   - pengguna MySQL `portal_mutu` yang hanya punya hak atas database itu (aplikasi tidak memakai `root`)

---

## 5. Konfigurasi server

```bash
cd server
npm install
copy .env.example .env
```

Buka `server/.env` lalu isi:
- `DB_PASS`: password dari langkah 4.
- `SESSION_SECRET`: rahasia acak. Buat dengan:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

---

## 6. Buat tabel, admin pertama, dan data awal

Masih di folder `server/`:

```bash
npm run siapkan -- --admin admin --nama "Admin GPM FTI"
```

Perintah ini aman diulang. Isinya:
- membuat tabel (`pengguna`, `sesi`, `log_aktivitas`, `pengaturan`, `data_mutu`)
- mengisi pengaturan bawaan
- membuat admin pertama, **bila belum ada admin**. **Password sementaranya ditampilkan sekali**; catat sebelum menutup terminal
- mengimpor `sumber/mutu.json` bila tabel data masih kosong dan file itu ada

Belum punya `sumber/mutu.json`? Pilih salah satu:
- Buat data contoh: `python gen_data.py` (dari folder akar), lalu `npm run impor-data` (dari `server/`).
- Atau masuk ke portal lalu unggah file JSON lewat **Pengaturan > Data Dashboard**.

---

## 7. Jalankan secara lokal

```bash
cd server
npm run dev        # otomatis restart saat file server diubah
# atau: npm start
```

Buka **http://localhost:3000**. Hentikan server dengan `Ctrl+C`.
- Perubahan pada halaman/`assets/` cukup dimuat ulang di browser (Ctrl+F5).
- Perubahan pada `server/src` membuat `npm run dev` restart otomatis.
- Splash logo tampil sekali per tab. Untuk melihatnya lagi, tutup tab atau jalankan `sessionStorage.clear()` di konsol browser.

> Bila muncul "Database tidak dapat dihubungi", MySQL di XAMPP belum dinyalakan.

---

## 8. Alur kerja harian

### a. Ambil perubahan terbaru
```bash
git pull
cd server
npm install
npm run siapkan
```
`npm install` memasang dependensi baru bila ada; `npm run siapkan` menambahkan tabel baru bila skema berubah. Keduanya aman diulang.

### b. Kerjakan perubahan

| Yang ingin diubah | File |
|---|---|
| Tampilan / logika dashboard | `dashboard.html`, `assets/dashboard.js`, `assets/hitung.js` |
| Halaman masuk | `index.html`, `assets/login.js`, `assets/landing.css`, `assets/splash.js` |
| Sidebar, bilah atas, loader, logout | `assets/ui.js`, `assets/ui.css` |
| Profil / ganti password | `akun-saya.html`, `assets/akun-saya.js` |
| Manajemen akun & log | `kelola-akun.html`, `assets/kelola-akun.js`, `server/src/routes/akun.js` |
| Pengaturan & data dashboard | `pengaturan.html`, `assets/pengaturan.js`, `server/src/routes/pengaturan.js`, `server/src/routes/mutu.js` |
| Login, sesi, ganti password (server) | `server/src/routes/sesi.js`, `server/src/auth.js` |
| Struktur tabel | `server/sql/skema.sql` (lalu `npm run siapkan`) |

### c. Periksa sebelum commit
```bash
git status
git diff
```
Pastikan **tidak ada** `server/.env`, `server/node_modules/`, atau `sumber/` di daftar. Ketiganya sudah diabaikan oleh `.gitignore`.

### d. Commit dan push
```bash
git add -A
git commit -m "Tambah filter prodi di daftar akun"
git push
```

---

## 9. Bekerja di lebih dari satu perangkat

- Kode tersinkron lewat git (`git pull` sebelum mulai, `git push` setelah selesai).
- **Database tidak tersinkron lewat git.** Tiap perangkat punya MySQL sendiri. Untuk memindahkan isi database (akun, data, log) dari perangkat A ke B:
  ```bash
  # di perangkat A
  C:\xampp\mysql\bin\mysqldump.exe -u root portal_mutu > portal_mutu.sql
  # salin file itu ke perangkat B (JANGAN di-commit: berisi hash password), lalu setelah langkah 4:
  C:\xampp\mysql\bin\mysql.exe -u root portal_mutu < portal_mutu.sql
  ```
- Bila hanya data dashboard yang perlu dipindah, gunakan **Unduh versi aktif** di Pengaturan > Data Dashboard di perangkat A, lalu unggah di perangkat B.

---

## 10. Catatan untuk developer

- **Halaman baru yang dilindungi**:
  1. Daftarkan nama file di objek `HALAMAN` pada `server/src/app.js`, beserta peran yang boleh membukanya.
  2. Di halaman itu, muat `auth.js` dan `ui.js` di awal `<body data-loader="…">`, lalu:
     ```js
     const s = await Auth.wajib({peran: ["admin"]});   // opsional: batasi peran
     UI.kerangka(s);    // bilah atas + sidebar
     UI.jagaSesi();     // peringatan sesi hampir habis
     ```
  3. Tambahkan menunya di `MENU` pada `assets/ui.js`.
- **API baru**: tambahkan di `server/src/routes/`. Gunakan `wajibLogin` dan `wajibPeran(...)`. Lempar `new GalatValidasi("pesan", status)` untuk galat yang ditampilkan ke pengguna, dan catat aksi penting dengan `catat(req, "aksi", target, detail)`.
- **Memanggil API dari browser**: selalu lewat `Auth.api(metode, url, isi)`. Fungsi ini menambahkan header `X-Portal` yang diwajibkan server (perlindungan CSRF).
- **Tabel data**: komponen `table()` di `assets/dashboard.js` dan `tabel()` di `assets/kelola-akun.js` memakai gaya `assets/tabel.css`:
  - angka rata kanan dengan digit tabular
  - kolom identitas dan header lengket
  - sel tidak membungkus, dengan tooltip untuk teks terpotong
  - sel kosong menjelaskan alasannya
  - aksi muncul saat hover/fokus
- **CSP**: server mengirim Content-Security-Policy (lihat `server/src/app.js`). Skrip inline dilarang; letakkan JavaScript di `assets/*.js`. Skrip, stylesheet, dan font eksternal hanya dari `cdn.jsdelivr.net` dengan atribut `integrity` (SRI).
- **Modal Bootstrap** harus diletakkan langsung di `<body>`, bukan di dalam `.wrap` atau `.portal`, karena keduanya memakai `z-index` sehingga modal akan tertutup backdrop.
- Peringatan **"LF will be replaced by CRLF"** di Windows tidak berbahaya.

---

## 11. Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| `Database tidak dapat dihubungi` / `ECONNREFUSED` | MySQL di XAMPP belum di-Start |
| `Access denied for user 'portal_mutu'` | `DB_PASS` di `server/.env` tidak sama dengan password di langkah 4 |
| `Variabel SESSION_SECRET belum diisi` | Lengkapi `server/.env` (langkah 5) |
| `EADDRINUSE: port 3000` | Server lain memakai port itu. Ganti `PORT` di `.env`, atau hentikan proses lama |
| Lupa password admin | Admin lain mereset lewat Manajemen Akun. Bila tidak ada admin lain, jalankan di server: `npm run siapkan -- --reset-admin USERNAME` (menampilkan password sementara baru) |
| Akun terkunci | Tunggu sesuai "Lama penguncian", atau admin klik **Buka kunci** di Manajemen Akun |
| Dashboard "Data mutu belum diunggah" | Unggah JSON di Pengaturan > Data Dashboard, atau `npm run impor-data` |
| Tampilan lama setelah mengubah assets | Muat ulang dengan Ctrl+F5 |
| `git push` ditolak (*fetch first*) | `git pull`, selesaikan konflik bila ada, lalu `git push` |

---

## 12. Ringkasan cepat

```bash
# Perangkat baru (sekali)
git clone https://github.com/udahafeez7/dashboard-mutu.git
cd dashboard-mutu/server
npm install
copy .env.example .env                       # isi DB_PASS & SESSION_SECRET
#   jalankan server/sql/buat-database.sql di phpMyAdmin/mysql terlebih dahulu
npm run siapkan -- --admin admin --nama "Admin GPM FTI"

# Setiap sesi kerja
#   XAMPP: Start MySQL
git pull
cd server
npm install
npm run siapkan
npm run dev
#   buka http://localhost:3000 ... edit ...
git status
git add -A
git commit -m "Pesan perubahan"
git push
```
