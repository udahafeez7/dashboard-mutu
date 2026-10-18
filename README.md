# Dashboard Mutu FTI Universitas Andalas (untuk GPM)

Dibangun dari Renstra FTI UNAND 2026-2030 (SK Dekan No. 67/UN16.15.D/KPT/VIII/2026).
Tiga modul: **Monitoring Indikator**, **Monitoring Tindak Lanjut**, **Capaian Akreditasi**.

Mengembangkan di perangkat lain (clone, setup, commit): lihat [PANDUAN-DEVELOP.md](PANDUAN-DEVELOP.md).

## Apa yang sudah asli dan apa yang masih contoh
| Bagian | Status |
|---|---|
| 40 IKSS, program P1-P28, sasaran SS1-SS6, baseline 2025, target 2026-2030 | ASLI (Tabel 6 Renstra) |
| 3 prodi dan peringkat akreditasi saat ini (TK: Baik Sekali, SI: Baik Sekali, Informatika: Baik) | ASLI (Bab 2.3) |
| 36 standar SPMI (Pendidikan 14, Penelitian 11, PkM 11) | ASLI (Tabel 8-10) |
| Redaksi temuan tindak lanjut | Diambil dari Renstra Bab 3-4 (rujukan dicantumkan) |
| Realisasi IKSS, status/progres/tenggat tindak lanjut, evidence per standar, progres LED | CONTOH: wajib diganti |

Setelah data asli diisi, ubah `"data_contoh": true` menjadi `false` di `meta`.

## Portal dengan login
Dashboard berada di dalam **Portal Mutu FTI** yang mewajibkan login:
`index.html` (masuk) → `portal.html` (beranda) → `dashboard.html` (dashboard mutu).

Situs tetap statis di GitHub Pages, jadi login dijaga dengan **enkripsi**, bukan server:
- `data/mutu.enc.json`: data dashboard terenkripsi AES-256-GCM dengan kunci data.
- `data/akun.json`: tiap akun menyimpan kunci data yang dibungkus password-nya (PBKDF2-SHA256, 600.000 iterasi). Username pun disimpan dalam bentuk hash.
- Tanpa password yang benar, data tidak dapat dibaca, walaupun file-nya bisa diunduh siapa saja.
- Sesi disimpan di tab browser (sessionStorage), berakhir saat tab ditutup, setelah 30 menit tanpa aktivitas, atau maksimal 8 jam.

Peran: `admin` (kelola akun, enkripsi data), `gpm` (enkripsi data), `gkm` (wajib `--prodi`; dashboard terbuka langsung pada prodinya), `pimpinan`.
Peran hanya mengatur tampilan dan alat admin; semua akun yang login dapat membaca seluruh data dashboard.

## Struktur
- `index.html`, `portal.html`, `dashboard.html`: halaman portal
- `assets/`:
  - `auth.js` (login & dekripsi), `hitung.js` (rumus capaian bersama beranda dan dashboard)
  - `ui.js` (loader, toast, modal logout, peringatan sesi, latar logo FTI), `splash.js` (animasi logo awal)
  - `login.js` + `landing.css` + `latar.js` (halaman masuk: sambutan → logo → menu bulatan → modal login)
  - `portal.js`, `dashboard.js`, `ui.css` (tema silver), `portal.css` (beranda: hero, icon tile, bayangan)
- `assets/img/`: logo FTI transparan, dipecah menjadi `logo-unand.png`, `logo-fti-mark.png`, `logo-fti-teks.png` untuk animasi, plus `logo-fti.png` utuh dan `favicon.png`
- Plugin dari CDN jsDelivr (dengan hash SRI): Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Animate.css 4.1.1, Chart.js 4.5.1
- `sumber/mutu.json`: data mentah yang diedit GPM/GKM. **Tidak di-commit** (ada di `.gitignore`)
- `data/mutu.enc.json`, `data/akun.json`: hasil `tools/portal_admin.py`, inilah yang di-commit
- `tools/portal_admin.py`: kelola akun dan enkripsi data
- `.github/workflows/pages.yml`: publikasi otomatis; hanya file publik yang diunggah, dan build gagal bila data mentah ikut ter-commit
- `gen_data.py`: pembuat data contoh ke `sumber/mutu.json` (referensi bentuk data)

## Alat admin
Persiapan sekali: `pip install cryptography`. Semua perintah dijalankan dari folder repositori; password diminta lewat prompt.

```
python tools/portal_admin.py tambah-akun gkm.si --nama "GKM Sistem Informasi" --peran gkm --prodi "Sistem Informasi"
python tools/portal_admin.py tambah-akun gpm.ketua --nama "Ketua GPM" --peran gpm
python tools/portal_admin.py daftar-akun
python tools/portal_admin.py ubah-sandi gkm.si      # oleh pemilik akun (password lama) atau admin
python tools/portal_admin.py hapus-akun gkm.si
python tools/portal_admin.py enkripsi               # setelah mengubah sumber/mutu.json
python tools/portal_admin.py dekripsi               # perangkat baru: pulihkan sumber/mutu.json
```
Setelah perintah apa pun, commit `data/akun.json` dan/atau `data/mutu.enc.json`.

Password minimal 10 karakter. Kunci data tidak disimpan di disk; alat membukanya dari akun admin/GPM yang sedang login.
**Simpan minimal dua akun admin.** Bila semua password admin hilang, jalankan `init --admin USER --nama "..." --paksa` (membuat kunci baru; semua akun lama harus dibuat ulang). Langkah yang sama dipakai bila sebuah akun dicabut karena alasan keamanan, sebab pengguna yang pernah login bisa saja telah menyimpan kunci data.

## Cara mengisi data (`sumber/mutu.json`)
- **IKSS**: isi `realisasi` dengan daftar nilai per triwulan, misalnya `[88.0, 91.5, 93.2]`. Indikator pengukuran tahunan (AEE PT, tracer study) boleh `null` sampai datanya ada.
  - `tipe: "kumulatif"`: dibandingkan dengan target pro-rata triwulan.
  - `arah: "turun"`: semakin kecil semakin baik (rasio dosen, laporan pelanggaran).
- **Tindak lanjut**: satu objek per temuan. `sumber` diisi AMI, RTM, atau Evaluasi Perkuliahan. `prodi` diisi nama prodi atau `Fakultas`. `status`: Selesai, Berjalan, atau Belum mulai. Status "Terlambat" dihitung otomatis dari `tenggat`.
- **Akreditasi**: ubah `peringkat_saat_ini` bila hasil akreditasi baru terbit, isi `evidence_pct` per standar dan `led_progres`.

## Memperbarui data
1. Edit `sumber/mutu.json`.
2. `python tools/portal_admin.py enkripsi`
3. Commit `data/mutu.enc.json` ke `main`. Situs diperbarui otomatis.

## Publikasi di GitHub Pages
Settings > Pages > Source: **GitHub Actions**. Setiap push ke `main` memublikasikan portal.

## Uji lokal
`python -m http.server 8000` lalu buka http://localhost:8000 (login memerlukan `http://localhost` atau `https://`, bukan `file://`).
