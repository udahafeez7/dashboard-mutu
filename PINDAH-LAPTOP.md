# Memindahkan Portal Mutu ke Laptop Lain (kode + database, macOS)

Panduan ini membuat laptop kedua **identik** dengan laptop pertama: kode dari GitHub, isi database (akun, log, data dashboard) dari file cadangan.
Laptop lama memakai Windows (PowerShell + XAMPP), laptop baru memakai macOS (Terminal, zsh). Bagian A dijalankan di Windows, Bagian B di Mac. Untuk pengembangan sehari-hari, lihat [PANDUAN-DEVELOP.md](PANDUAN-DEVELOP.md).

## Mengapa database tidak ada di GitHub?
- Tabel `pengguna` berisi hash password semua akun. Bila ikut ke GitHub, siapa pun yang bisa membaca repo dapat mengunduhnya dan menebak password secara offline.
- Isi database terus berubah (sesi, log), sehingga akan menimbulkan konflik di git.
- **Struktur** tabel sudah ada di git (`server/sql/skema.sql`). Yang dipindahkan lewat cara di bawah hanya **isinya**.

Karena itu isi database dipindah lewat **file cadangan `.sql`** yang Anda bawa sendiri (flashdisk atau penyimpanan pribadi). **Jangan di-commit dan jangan dikirim ke grup.** File `*.sql` sudah diabaikan oleh `.gitignore`.

---

## Bagian A. Di laptop LAMA (Windows): buat file cadangan

1. Nyalakan **MySQL** di XAMPP Control Panel.
2. Buka **PowerShell** dan jalankan (ganti `D:\` bila perlu):

   ```powershell
   & 'C:\xampp\mysql\bin\mysqldump.exe' -u root --host=127.0.0.1 --single-transaction --default-character-set=utf8mb4 --ignore-table=portal_mutu.sesi --result-file='D:\portal_mutu_cadangan.sql' portal_mutu
   ```

   - `--result-file` dipakai **sebagai pengganti `>`**. Di PowerShell 5.1, `>` menyimpan file dalam UTF-16 sehingga gagal diimpor di Mac.
   - Tabel `sesi` (sesi login aktif) sengaja tidak ikut. Di laptop baru semua orang memang perlu masuk ulang.
   - Bila root MySQL Anda memakai password, tambahkan `-p` dan ketik password saat diminta.

3. Salin `D:\portal_mutu_cadangan.sql` ke Mac (flashdisk atau penyimpanan pribadi), lalu simpan sebagai `~/portal_mutu_cadangan.sql`.

> Hanya ingin memindahkan **data dashboard**, bukan akun? Lewati bagian ini. Di laptop lama buka **Pengaturan > Data Dashboard > Unduh versi aktif**, lalu unggah file itu di laptop baru.

---

## Bagian B. Di laptop BARU (macOS)

### 1. Pasang perangkat lunak (sekali)
Pasang [Homebrew](https://brew.sh) bila belum ada, lalu:

```bash
xcode-select --install   # abaikan bila sudah terpasang
brew install git node@22 mysql@8.4
brew link mysql@8.4 --force   # agar perintah mysql dan mysqldump bisa dipanggil langsung
brew services start mysql@8.4
```

- **Git**: bawaan Xcode Command Line Tools, `brew install git` hanya memberi versi lebih baru.
- **Node.js 20+ (LTS)**: `node@22` sudah memenuhi syarat. Bila `node` tidak ditemukan, jalankan `brew link --overwrite node@22`. Alternatif: pasang lewat [nvm](https://github.com/nvm-sh/nvm) atau unduh dari https://nodejs.org.
- **MySQL**: `mysql@8.4` (LTS) hanya dipakai servernya; nama layanannya `mysql@8.4`, bukan `mysql`. Homebrew membuat user `root` **tanpa password** yang hanya bisa diakses dari komputer ini. XAMPP for macOS (https://www.apachefriends.org) juga bisa; ganti `mysql` di perintah di bawah dengan `/Applications/XAMPP/xamppfiles/bin/mysql`.

Periksa:
```bash
git --version && node -v && mysql --version
```

### 2. Ambil kode
```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/udahafeez7/dashboard-mutu.git
cd dashboard-mutu
git config --global user.name "udahafeez7"
git config --global user.email "mohammadhafizhersyah02@it.unand.ac.id"
```

### 3. Buat database kosong dan pengguna MySQL
1. Pastikan MySQL menyala: `brew services list` (status `started`).
2. Buka file `server/sql/buat-database.sql` di editor (misalnya `open -e server/sql/buat-database.sql`). Ganti **kedua** `GANTI_PASSWORD_INI` dengan password baru yang kuat (password ini boleh berbeda dari laptop lama). Catat password itu untuk langkah 4.
3. Jalankan isinya dari folder proyek:
   ```bash
   mysql -u root --host=127.0.0.1 < server/sql/buat-database.sql
   ```
   Bila root memakai password, tambahkan `-p`.

### 4. Isi konfigurasi server
```bash
cd ~/Projects/dashboard-mutu/server
npm install
cp .env.example .env
open -e .env
```
Isi di `.env`:
- `DB_PASS` = password dari langkah 3.
- `SESSION_SECRET` = rahasia acak. Buat dengan:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

### 5. Pulihkan isi database dari cadangan
Salin file cadangan ke laptop ini (misalnya ke `~/portal_mutu_cadangan.sql`), lalu:

```bash
mysql -u root --host=127.0.0.1 --default-character-set=utf8mb4 portal_mutu < ~/portal_mutu_cadangan.sql
```

- Bila ada spasi di path file, apit dengan tanda kutip: `< "$HOME/Folder Saya/portal_mutu_cadangan.sql"`.

### 6. Lengkapi tabel yang tidak ikut dicadangkan
```bash
cd ~/Projects/dashboard-mutu/server
npm run siapkan
```
Perintah ini membuat tabel `sesi` dan memastikan semuanya lengkap. Karena akun admin sudah ada dari cadangan, **tidak ada admin baru yang dibuat** dan data Anda tidak ditimpa.

### 7. Jalankan dan periksa
```bash
npm run dev
```
Buka **http://localhost:3000**, lalu masuk dengan akun dan password yang sama seperti di laptop lama. Periksa:
- [ ] Daftar akun di **Manajemen Akun** sama dengan laptop lama
- [ ] **Dashboard Mutu** menampilkan data terbaru
- [ ] **Log Aktivitas** memuat riwayat lama

---

## Bila belum perlu memindahkan akun
Cukup lewati Bagian A dan langkah B.5, lalu di langkah B.6 jalankan:
```bash
npm run siapkan -- --admin admin --nama "Admin GPM FTI"
```
Perintah itu membuat admin baru (password sementara tampil sekali) dan mengimpor data contoh bila `sumber/mutu.json` ada.

---

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| `ERROR 1049 Unknown database 'portal_mutu'` | Langkah B.3 belum dijalankan |
| `ERROR 1064` / karakter aneh saat impor | File cadangan dibuat dengan `>` di PowerShell (UTF-16). Buat ulang dengan `--result-file` seperti di Bagian A |
| `ERROR 2002 Can't connect to local MySQL server` / `Database tidak dapat dihubungi` | MySQL belum menyala. Jalankan `brew services start mysql@8.4` |
| `ERROR 1045 Access denied for user 'root'` | Root MySQL memakai password. Tambahkan `-p` pada perintah |
| `Access denied for user 'portal_mutu'` | `DB_PASS` di `server/.env` berbeda dari password di langkah B.3 |
| `Error: listen EADDRINUSE :::3000` | Port 3000 sudah dipakai. Cari dengan `lsof -i :3000`, atau ubah `PORT` di `.env` |
| `command not found: node` / `mysql` | Homebrew belum ada di PATH. Jalankan `eval "$(/opt/homebrew/bin/brew shellenv)"` dan tambahkan baris itu ke `~/.zprofile` |
| Tidak bisa masuk setelah impor | Gunakan password dari laptop lama. Bila lupa dan tidak ada admin lain: `npm run siapkan -- --reset-admin admin` (menampilkan password sementara baru) |
| `Variabel SESSION_SECRET belum diisi` | `.env` belum lengkap (langkah B.4) |

## Keamanan file cadangan
- File cadangan berisi **hash password** semua akun. Perlakukan seperti kata sandi: simpan pribadi, jangan di repo atau grup, dan hapus dari flashdisk setelah selesai.
- Bila file bocor, ganti password semua akun (admin dapat memakai **Reset password** di Manajemen Akun).
