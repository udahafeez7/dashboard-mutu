# Panduan Pengembangan Portal Mutu FTI

Panduan ini untuk menyiapkan proyek di perangkat baru, menjalankannya secara lokal, lalu meng-commit perubahan ke GitHub.
Cara kerja portal dan perintah admin selengkapnya ada di [README.md](README.md).

Repositori: https://github.com/udahafeez7/dashboard-mutu (cabang `main`)

---

## 1. Hal penting sebelum mulai

Tidak semua file ikut di git. Data mentah sengaja **tidak** di-commit supaya tidak bocor:

| File | Di git? | Keterangan |
|---|---|---|
| `index.html`, `portal.html`, `dashboard.html`, `assets/` | Ya | Kode portal |
| `tools/portal_admin.py`, `gen_data.py` | Ya | Alat admin dan pembuat data contoh |
| `data/mutu.enc.json` | Ya | Data dashboard **terenkripsi** |
| `data/akun.json` | Ya | Daftar akun (kunci terbungkus password) |
| `sumber/mutu.json` | **Tidak** | Data mentah. Dipulihkan dengan `dekripsi` (langkah 5) |
| Password akun | **Tidak pernah** | Simpan di password manager, jangan di file proyek |

Artinya, setelah clone di perangkat baru, `sumber/mutu.json` belum ada. Anda butuh **username dan password akun admin atau GPM** untuk memulihkannya.

---

## 2. Prasyarat

Pasang di perangkat baru:

1. **Git**: https://git-scm.com/downloads (di Windows sudah termasuk Git Credential Manager untuk login GitHub).
2. **Python 3.10 atau lebih baru**: https://www.python.org/downloads/ (centang *Add python.exe to PATH* saat instalasi di Windows).
3. **Editor**, misalnya VS Code.
4. **Akses tulis** ke repositori `udahafeez7/dashboard-mutu`.

Periksa instalasi:

```bash
git --version
python --version
```

> Di macOS/Linux, perintah Python bisa bernama `python3` dan `pip3`. Sesuaikan semua perintah di panduan ini.

---

## 3. Clone repositori

```bash
git clone https://github.com/udahafeez7/dashboard-mutu.git
cd dashboard-mutu
```

Saat pertama kali push, Git akan meminta login GitHub:
- **Windows**: jendela browser Git Credential Manager terbuka; masuk dengan akun GitHub.
- **macOS/Linux**: gunakan *Personal Access Token* (GitHub > Settings > Developer settings > Personal access tokens, izin `repo`) sebagai password, atau pakai SSH:
  ```bash
  git remote set-url origin git@github.com:udahafeez7/dashboard-mutu.git
  ```

---

## 4. Atur identitas Git (sekali per perangkat)

```bash
git config --global user.name "udahafeez7"
git config --global user.email "mohammadhafizhersyah02@it.unand.ac.id"
```

---

## 5. Pasang dependensi dan pulihkan data mentah

```bash
pip install cryptography
python tools/portal_admin.py dekripsi
```

Perintah `dekripsi` menanyakan username dan password (akun peran `admin` atau `gpm`), lalu membuat `sumber/mutu.json` dari `data/mutu.enc.json`.

Bila `sumber/mutu.json` sudah ada dan ingin diganti dengan versi terbaru dari git:

```bash
python tools/portal_admin.py dekripsi --timpa
```

---

## 6. Jalankan secara lokal

```bash
python -m http.server 8000
```

Buka http://localhost:8000 lalu login. Hentikan server dengan `Ctrl+C`.

> Jangan membuka `index.html` langsung dengan klik dua kali (`file://`): login memerlukan `http://localhost` atau `https://`.

---

## 7. Alur kerja harian

Lakukan urutan ini setiap kali mulai bekerja, terutama bila berganti perangkat.

### a. Ambil perubahan terbaru
```bash
git pull
```
Bila `data/mutu.enc.json` ikut berubah (terlihat di keluaran `git pull`), segarkan data mentah lokal sebelum mengeditnya:
```bash
python tools/portal_admin.py dekripsi --timpa
```

### b. Kerjakan perubahan

| Yang ingin diubah | File yang diedit | Langkah tambahan |
|---|---|---|
| Tampilan / logika dashboard | `dashboard.html`, `assets/dashboard.js` | Tidak ada |
| Halaman login / beranda | `index.html`, `portal.html`, `assets/login.js`, `assets/portal.js`, `assets/portal.css` | Tidak ada |
| Tema silver, splash, loader, logout | `assets/ui.css`, `assets/ui.js`, `assets/splash.js` | Tidak ada |
| Isi data (realisasi, tindak lanjut, akreditasi) | `sumber/mutu.json` | `python tools/portal_admin.py enkripsi` |
| Akun | (tidak diedit manual) | `tambah-akun`, `hapus-akun`, `ubah-sandi` |

Uji di http://localhost:8000. Setelah mengubah data, jalankan `enkripsi` dulu, lalu muat ulang browser, karena portal hanya membaca `data/mutu.enc.json`.

### c. Periksa sebelum commit
```bash
git status
git diff
```
Pastikan **tidak ada** `sumber/` atau `mutu.json` (tanpa `.enc`) di daftar. Keduanya sudah diabaikan oleh `.gitignore`. Workflow GitHub juga akan gagal bila data mentah terlanjur ter-commit.

### d. Commit dan push
```bash
git add -A
git commit -m "Perbarui realisasi IKSS triwulan 3"
git push
```

Contoh pesan commit yang jelas:
- `Perbarui data tindak lanjut AMI 2026`
- `Tambah akun GKM Informatika`
- `Perbaiki urutan kolom tabel IKSS`

### e. Cek publikasi
Buka tab **Actions** di repositori GitHub. Workflow *Deploy Portal Mutu* berjalan otomatis setelah push. Bila hijau, portal sudah diperbarui (biasanya 1-2 menit).

---

## 8. Bekerja di lebih dari satu perangkat

- **Selalu `git pull` sebelum mulai** dan **`git push` setelah selesai**. Cara ini mencegah sebagian besar konflik.
- `sumber/mutu.json` **tidak tersinkron lewat git**. Satu-satunya jalur sinkron adalah `data/mutu.enc.json`. Jadi alurnya selalu: edit `sumber` → `enkripsi` → commit/push. Di perangkat lain: pull → `dekripsi --timpa`.
- **Konflik pada `data/mutu.enc.json` atau `data/akun.json` tidak bisa digabung baris per baris**, karena isinya terenkripsi. Bila `git pull` melaporkan konflik pada file tersebut:
  ```bash
  # simpan dulu sumber/mutu.json lokal Anda bila berisi perubahan penting
  cp sumber/mutu.json sumber/mutu.lokal.json

  git checkout --theirs data/mutu.enc.json      # ambil versi dari GitHub
  python tools/portal_admin.py dekripsi --timpa  # buka versi itu
  # terapkan ulang perubahan Anda ke sumber/mutu.json (bandingkan dengan mutu.lokal.json)
  python tools/portal_admin.py enkripsi
  git add data/mutu.enc.json
  git commit
  git push
  ```
  Untuk `data/akun.json`: ambil versi GitHub (`git checkout --theirs data/akun.json`), lalu ulangi perintah akun yang Anda jalankan (misalnya `tambah-akun`).

---

## 9. Catatan untuk developer

- **Format enkripsi ada di dua tempat** dan harus selalu sejalan: `assets/auth.js` (browser) dan `tools/portal_admin.py` (CLI). Bila mengubah salah satunya (iterasi PBKDF2, susunan JSON, *additional data* AES-GCM), ubah keduanya, lalu uji login.
- **Halaman baru yang dilindungi** cukup memuat `assets/auth.js` lalu memanggil:
  ```js
  const s = Auth.wajib();          // alihkan ke login bila belum masuk
  Auth.bilah(s, "halaman.html");   // bilah portal + tombol Keluar
  const data = await Auth.muatMutu();
  ```
  Tambahkan tautannya di `Auth.bilah` dan di kartu modul `portal.html`, lalu tambahkan nama filenya ke langkah `cp` di `.github/workflows/pages.yml`. Workflow hanya mengunggah file yang disebut di sana.
- **Content-Security-Policy** di tiap halaman melarang skrip inline. Letakkan JavaScript di `assets/*.js`. Skrip, stylesheet, dan font eksternal hanya diizinkan dari `cdn.jsdelivr.net`. Setiap pustaka CDN memakai atribut `integrity` (SRI). Bila menaikkan versi, hitung ulang hash-nya:
  ```bash
  curl -sL https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css | openssl dgst -sha384 -binary | openssl base64 -A
  ```
- **Tampilan & animasi**:
  - `assets/ui.css` berisi tema silver, splash, loader, dan gaya halaman login. Warna diatur lewat variabel `--sv-*` di bagian atas file.
  - Splash logo (`assets/splash.js`) tampil sekali per tab. Untuk melihatnya lagi saat mengembangkan, tutup tab atau jalankan `sessionStorage.clear()` di konsol browser.
  - Loader dipanggil lewat `UI.loader.tampil(judul, pesan)`, `UI.loader.pesan(teks)`, `UI.loader.sukses(judul, pesan)`, `UI.loader.sembunyi(minimalMs)`. Toast lewat `UI.toast(teks, "sukses"|"info"|"peringatan"|"galat")`.
  - Halaman terlindungi memakai `<body data-loader="Judul loader">` serta memuat `auth.js` dan `ui.js` di awal `<body>`, supaya loader muncul sebelum isi halaman terlihat. Panggil `UI.jagaSesi()` untuk peringatan sesi hampir habis.
  - Pengguna yang mengaktifkan *reduce motion* di sistem operasinya otomatis mendapat versi tanpa animasi.
- **Dashboard & Bootstrap**: `dashboard.html` memiliki kelas `.card` dan `.badge` sendiri. Gaya Bootstrap yang bentrok dinetralkan di blok `<style>` dashboard (cari komentar "netralkan gaya Bootstrap").
- **Data contoh**: `python gen_data.py` menulis ulang `sumber/mutu.json` dengan data contoh. Jangan jalankan bila data asli sudah diisi.
- **Peringatan "LF will be replaced by CRLF"** di Windows tidak berbahaya dan boleh diabaikan.

---

## 10. Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| `Paket 'cryptography' belum terpasang` | `pip install cryptography` |
| `sumber/mutu.json tidak ditemukan` saat `enkripsi` | Belum dipulihkan. Jalankan `dekripsi` |
| `Username atau password salah` di CLI | Periksa ejaan; username huruf kecil. Akun harus berperan `admin` atau `gpm` |
| Login di browser gagal padahal password benar | Pastikan `data/akun.json` terbaru sudah di-pull/push, dan halaman dibuka lewat `http://localhost` |
| Dashboard menampilkan data lama | Lupa `enkripsi` setelah mengedit `sumber/mutu.json`, atau cache browser: muat ulang dengan `Ctrl+F5` |
| `git push` ditolak (*rejected, fetch first*) | Ada commit baru di GitHub. Jalankan `git pull`, selesaikan konflik bila ada, lalu `git push` |
| Workflow gagal: "Data mentah ikut ter-commit" | Hapus dari git: `git rm -r --cached sumber data/mutu.json`, commit, push |
| Semua password admin hilang | `python tools/portal_admin.py init --admin USER --nama "..." --paksa`, lalu buat ulang semua akun. Data mentah harus tersedia di `sumber/mutu.json` |

---

## 11. Ringkasan cepat

```bash
# Perangkat baru (sekali)
git clone https://github.com/udahafeez7/dashboard-mutu.git
cd dashboard-mutu
pip install cryptography
python tools/portal_admin.py dekripsi

# Setiap sesi kerja
git pull
python tools/portal_admin.py dekripsi --timpa   # bila data/mutu.enc.json berubah
python -m http.server 8000                      # uji di http://localhost:8000
# ... edit ...
python tools/portal_admin.py enkripsi           # bila sumber/mutu.json diedit
git status
git add -A
git commit -m "Pesan perubahan"
git push
```
