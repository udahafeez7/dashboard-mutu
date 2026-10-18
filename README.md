# Dashboard Mutu Fakultas (GPM)

Tiga modul: **Monitoring Indikator**, **Monitoring Tindak Lanjut**, **Capaian Akreditasi**.
Situs statis: tidak perlu server. Data dipisahkan dari tampilan.

## Struktur
- `index.html`  : tampilan (jarang diubah)
- `data/mutu.json` : SATU-SATUNYA file data yang perlu diedit GKM/GPM
- `.github/workflows/pages.yml` : publikasi otomatis ke GitHub Pages
- `gen_data.py` : pembuat data contoh (boleh dihapus)

## Model data (`data/mutu.json`)
| Koleksi | Isi | Kolom kunci |
|---|---|---|
| `prodi` | daftar prodi dan GKM | id, nama, gkm |
| `indikator` | IKU/AMI/kepuasan per prodi, nilai per bulan | prodi, kode, bidang, target, arah (naik/turun), nilai[] |
| `tindak_lanjut` | temuan AMI, RTM, evaluasi | sumber, pic, tenggat, status, progres, evidence |
| `akreditasi` | LED dan evidence per kriteria | lembaga, peringkat, led_progres, kriteria[] |

`prodi` menjadi kunci penghubung antar koleksi. Jangan salin nama prodi dengan ejaan berbeda.

## Cara pakai
1. Buat repo di GitHub, unggah seluruh isi folder ini ke cabang `main`.
2. Settings > Pages > Source: **GitHub Actions**.
3. Edit `data/mutu.json`, commit. Situs terbarui otomatis dalam 1-2 menit.
4. Set `"data_contoh": false` di bagian `meta` untuk menghilangkan banner data contoh.

## Uji lokal
`python3 -m http.server 8000` lalu buka http://localhost:8000
(Jika `index.html` dibuka langsung, dashboard memakai data contoh tertanam.)
