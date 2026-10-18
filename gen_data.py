# Membangun data/mutu.json dari Renstra FTI UNAND 2026-2030 (SK Dekan 67/UN16.15.D/KPT/VIII/2026)
# Target & baseline = dari Tabel 6 Renstra. Realisasi, status tindak lanjut, evidence = DATA CONTOH.
import json, random

TARGET_YEARS = [2026, 2027, 2028, 2029, 2030]
sasaran = [
 ("SS1","Meningkatnya mutu pendidikan dan daya saing lulusan"),
 ("SS2","Meningkatnya produktivitas, kualitas, dan dampak penelitian serta pengabdian kepada masyarakat"),
 ("SS3","Meningkatnya kualitas dan profesionalisme sumber daya manusia"),
 ("SS4","Terwujudnya sarana dan prasarana yang memadai dan berkelanjutan"),
 ("SS5","Terwujudnya tata kelola dan sistem informasi yang efektif, transparan, dan terintegrasi"),
 ("SS6","Meningkatnya kerja sama strategis dan komersialisasi hasil tridarma"),
]
prog = {
 "P1":"Peningkatan mutu lulusan dan masa studi tepat waktu","P2":"Peningkatan jumlah lulusan bersertifikat kompetensi",
 "P3":"Peningkatan partisipasi mahasiswa di luar prodi dan kompetisi","P4":"Peningkatan MK dengan case method / team-based project",
 "P5":"Peningkatan jumlah MK pembelajaran digital","P6":"Peningkatan persentase prodi terakreditasi unggul",
 "P7":"Peningkatan prodi berakreditasi/bersertifikasi internasional","P8":"Peningkatan mahasiswa asing dan kelas internasional",
 "P9":"Optimalisasi mahasiswa kelompok afirmasi","P10":"Penguatan kualitas layanan akademik dan kemahasiswaan",
 "P11":"Peningkatan keluaran dosen berekognisi/diterapkan","P12":"Peningkatan pengabdian berbasis potensi lokal, kebencanaan, teknologi",
 "P13":"Penguatan kontribusi riset dan pengabdian berbasis SDGs","P14":"Peningkatan dosen berkegiatan tridharma di PT lain/praktisi",
 "P15":"Peningkatan jumlah dosen bergelar doktor","P16":"Peningkatan kompetensi, sertifikasi, rekognisi dosen",
 "P17":"Optimalisasi rasio SDM terhadap mahasiswa","P18":"Peningkatan kompetensi tenaga kependidikan",
 "P19":"Penguatan lingkungan kerja dan dukungan profesional dosen","P20":"Penguatan sistem kerja dan kesejahteraan tendik",
 "P21":"Peningkatan unit layanan tersertifikasi","P22":"Pembangunan Zona Integritas menuju WBK/WBBM",
 "P23":"Optimalisasi kinerja pengelolaan keuangan","P24":"Optimalisasi kinerja pendapatan (PN-UNAND)",
 "P25":"Penguatan peran alumni","P26":"Peningkatan kerja sama nasional dan internasional",
 "P27":"Pengembangan unit bisnis dan hilirisasi hasil riset","P28":"Pemantapan kualitas hubungan dan layanan kerja sama",
}
# (program, sasaran, IKSS, IKU, IKU-DIKTI, satuan, baseline, target[5], arah, tipe, periode, ekstra)
T = [
 ("P1","SS1","Angka Efisiensi Edukasi PT (AEE PT)","IKU 1","IKU 1","%",26,[44]*5,"naik","snapshot","Tahunan",{}),
 ("P1","SS1","Persentase lulusan langsung bekerja / melanjutkan studi / berwirausaha dalam 1 tahun","IKU 1","IKU 2","%",None,[85,86,87,88,89],"naik","snapshot","Tahunan",{}),
 ("P1","SS1","Persentase lulusan memiliki pekerjaan; melanjutkan studi; atau menjadi wiraswasta","IKU 1","IKU 2","%",None,[85,86,87,88,89],"naik","snapshot","Tahunan",{}),
 ("P2","SS1","Persentase lulusan yang memiliki sertifikat kompetensi","IKU 1","IKU 2","%",25,[25,26,27,28,29],"naik","snapshot","Tahunan",{}),
 ("P3","SS1","Persentase mahasiswa berkegiatan/meraih prestasi di luar program studi","IKU 2","IKU 3","%",None,[30,30,30,35,35],"naik","snapshot","Triwulan",{}),
 ("P4","SS1","Persentase MK dengan case method / team-based project sebagai bagian bobot evaluasi","IKU 7","IKU 3","%",None,[28,30,32,34,36],"naik","snapshot","Triwulan",{}),
 ("P5","SS1","Jumlah mata kuliah dengan pembelajaran digital","IKU 7","IKU 3","MK",2,[2,3,4,5,6],"naik","snapshot","Triwulan",{}),
 ("P6","SS1","Persentase program studi terakreditasi unggul","IKU 8","IKU 4","%",0,[66,66,66,100,100],"naik","snapshot","Triwulan",{"kunci":"akreditasi_unggul"}),
 ("P7","SS1","Persentase prodi dengan akreditasi/sertifikasi internasional yang diakui pemerintah","IKU 8","IKU 4","%",66,[66,66,66,100,100],"naik","snapshot","Triwulan",{}),
 ("P8","SS1","Persentase mahasiswa internasional","IKU 8","IKU 1","%",0.5,[1,1,1,2,2],"naik","snapshot","Triwulan",{}),
 ("P9","SS1","Rasio afirmasi","IKU 8","IKU 7","%",None,[25]*5,"naik","snapshot","Triwulan",{}),
 ("P10","SS1","Indeks Kepuasan Mahasiswa","IKU 8","IKU 11","skala 4",None,[3.05,3.1,3.15,3.2,3.25],"naik","snapshot","Triwulan",{"kelompok":"kepuasan","label":"Mahasiswa"}),
 ("P11","SS2","Jumlah keluaran dosen berekognisi internasional / diterapkan (per dosen)","IKU 5","IKU 6","per dosen",None,[2.5,2.5,2.5,3,3],"naik","kumulatif","Triwulan",{}),
 ("P11","SS2","Total publikasi internasional","IKU 5","IKU 6","artikel",None,[26,28,30,32,34],"naik","kumulatif","Triwulan",{}),
 ("P11","SS2","Persentase publikasi top tier","IKU 5","IKU 6","%",None,[1,1,1,2,2],"naik","snapshot","Triwulan",{}),
 ("P11","SS2","Persentase publikasi internasional Q1","IKU 5","IKU 6","%",None,[27,27,28,28,29],"naik","snapshot","Triwulan",{}),
 ("P11","SS2","Persentase penelitian berkolaborasi internasional","IKU 5","IKU 6","%",None,[27,27,28,28,29],"naik","snapshot","Triwulan",{}),
 ("P12","SS2","Jumlah kegiatan pengabdian berbasis potensi lokal, kebencanaan, dan teknologi","IKU 5","IKU 7","kegiatan",1,[1,2,2,3,3],"naik","kumulatif","Triwulan",{}),
 ("P13","SS2","Persentase keterlibatan PT dalam SDG 1, 4, 17 dan 2 SDGs lain","IKU 5","IKU 7","%",80,[80]*5,"naik","snapshot","Triwulan",{}),
 ("P14","SS3","Persentase dosen berkegiatan tridharma di PT lain / praktisi / membimbing di luar prodi","IKU 3","IKU 4","%",None,[43]*5,"naik","snapshot","Triwulan",{}),
 ("P15","SS3","Persentase dosen berpendidikan S3","IKU 4","IKU 4","%",48.18,[49.01,51.76,54.41,57.25,57.5],"naik","snapshot","Triwulan",{}),
 ("P16","SS3","Persentase dosen bersertifikat kompetensi/profesi atau pengajar praktisi","IKU 4","IKU 4","%",None,[27]*5,"naik","snapshot","Triwulan",{}),
 ("P16","SS3","Persentase dosen PT yang mendapatkan rekognisi internasional","IKU 4","IKU 4","%",None,[67]*5,"naik","snapshot","Triwulan",{}),
 ("P16","SS3","Persentase SDM terlibat langsung dalam penyusunan kebijakan","IKU 4","IKU 8","%",None,[5,5,6,6,7],"naik","snapshot","Triwulan",{}),
 ("P17","SS3","Rasio dosen dan tendik terhadap mahasiswa (1 : n, makin kecil makin baik)","IKU 4","IKU 4","1:n",30,[28,25,23,20,18],"turun","snapshot","Triwulan",{"fmt":"rasio"}),
 ("P18","SS3","Jumlah tenaga kependidikan bersertifikat kompetensi","IKU 4","IKU 4","orang",21,[21,23,25,27,29],"naik","kumulatif","Triwulan",{}),
 ("P19","SS3","Indeks Kepuasan Dosen","IKU 8","IKU 11","skala 4",3.05,[3.15,3.25,3.5,3.75,4],"naik","snapshot","Triwulan",{"kelompok":"kepuasan","label":"Dosen"}),
 ("P20","SS3","Indeks Kepuasan Tenaga Kependidikan","IKU 8","IKU 11","skala 4",3.05,[3.15,3.25,3.5,3.75,4],"naik","snapshot","Triwulan",{"kelompok":"kepuasan","label":"Tendik"}),
 ("P21","SS4","Jumlah unit layanan (prodi, lab, perpustakaan, unit) tersertifikasi","IKU 1","IKU 11","unit",1,[1,1,1,1,2],"naik","snapshot","Triwulan",{}),
 ("P22","SS5","Jumlah usulan Zona Integritas WBK/WBBM","IKU 8","IKU 10","unit kerja",1,[1]*5,"naik","kumulatif","Triwulan",{}),
 ("P22","SS5","Jumlah laporan pelanggaran integritas akademik (target 0)","IKU 8","IKU 11","laporan",0,[0]*5,"turun","kumulatif","Triwulan",{}),
 ("P22","SS5","Pencegahan dan penanganan anti kekerasan, anti narkoba, anti korupsi","IKU 8","IKU 11","%",100,[100]*5,"naik","snapshot","Triwulan",{}),
 ("P23","SS5","Alokasi pendapatan dana masyarakat untuk peningkatan riset","IKU 8","IKU 9","%",0,[5]*5,"naik","snapshot","Triwulan",{}),
 ("P23","SS5","Alokasi pendapatan dana masyarakat untuk upskilling dan upgrading dosen","IKU 8","IKU 9","%",0,[5]*5,"naik","snapshot","Triwulan",{}),
 ("P23","SS5","Alokasi pendapatan dana masyarakat untuk updating laboratorium","IKU 8","IKU 9","%",0,[5]*5,"naik","snapshot","Triwulan",{}),
 ("P24","SS5","Persentase pendapatan non-pendidikan/UKT terhadap total pendapatan","IKU 8","IKU 9","%",0,[1,1,1,1,2],"naik","snapshot","Triwulan",{}),
 ("P25","SS5","Jumlah kontribusi dana dari alumni","IKU 8","IKU 9","Rp juta",20,[20,25,25,30,30],"naik","kumulatif","Triwulan",{}),
 ("P26","SS6","Jumlah kerja sama per program studi","IKU 6","IKU 5","per prodi",1.2,[3,3,4,4,5],"naik","kumulatif","Triwulan",{}),
 ("P27","SS6","Tingkat pengembangan bisnis berbasis hasil riset","IKU 5","IKU 5","Rp juta",None,[20,25,25,30,30],"naik","kumulatif","Triwulan",{}),
 ("P28","SS6","Indeks Kepuasan Mitra Kerja Sama","IKU 6","IKU 11","skala 4",3.05,[3.15,3.25,3.5,3.75,4],"naik","snapshot","Triwulan",{"kelompok":"kepuasan","label":"Mitra"}),
]
INT_UNITS = {"MK","kegiatan","unit","unit kerja","orang","laporan","artikel"}

def sample_realisasi(i, row):
    prog_, sas, nama, iku, ikud, sat, base, tgt, arah, tipe, per, ex = row
    if per == "Tahunan": return None
    r = random.Random(f"r{i}")
    t = tgt[0]
    if t == 0 and base == 0 and arah == "turun": final = 0
    elif arah == "turun": final = base - (base - t) * r.uniform(0.25, 0.9)
    elif tipe == "kumulatif": final = t * r.uniform(0.6, 1.15)
    elif base is not None and base != t: final = base + (t - base) * r.uniform(0.4, 1.1)
    else: final = t * r.uniform(0.82, 1.06)
    if t == 100: final = min(100, final)
    if tipe == "kumulatif": f = [0.3, 0.65, 1.0]
    else: f = [r.uniform(.9,.95), r.uniform(.96,.99), 1.0]
    vals = [final * x for x in f]
    if sat in INT_UNITS: vals = [int(round(v)) for v in vals]
    elif sat == "skala 4": vals = [round(v, 2) for v in vals]
    else: vals = [round(v, 1) for v in vals]
    return vals

indikator = []
for i, row in enumerate(T):
    prog_, sas, nama, iku, ikud, sat, base, tgt, arah, tipe, per, ex = row
    d = {"id": f"{prog_}-{i+1:02d}", "program": prog_, "program_nama": prog[prog_], "sasaran": sas, "nama": nama,
         "iku": iku, "iku_dikti": ikud, "satuan": sat, "baseline": base, "target": tgt, "arah": arah,
         "tipe": tipe, "periode_ukur": per, "realisasi": sample_realisasi(i, row)}
    d.update(ex)
    indikator.append(d)

prodi = [{"id":"TK","nama":"Teknik Komputer","gkm":"GKM Teknik Komputer"},
         {"id":"SI","nama":"Sistem Informasi","gkm":"GKM Sistem Informasi"},
         {"id":"IF","nama":"Informatika","gkm":"GKM Informatika"}]

# Tindak lanjut: temuan diambil dari Renstra (rujukan disertakan); status/progres = contoh
FAK = "Fakultas"
tl_src = [
 (FAK,"RTM","Pemahaman visi-misi belum optimal di seluruh sivitas akademika","Renstra §3.2","Ketua GPM"),
 (FAK,"Evaluasi Perkuliahan","Skor TOEFL mahasiswa masih terbatas","Renstra §3.2","Wakil Dekan I"),
 (FAK,"AMI","Sistem tracer study belum berjalan efektif","Renstra §3.2","Ketua GPM"),
 (FAK,"AMI","Proses penjaminan mutu belum terintegrasi sehingga evaluasi perkuliahan belum optimal","Renstra §4.4 (g)","Ketua GPM"),
 (FAK,"AMI","Dokumentasi proses mutu berbasis digital dan eviden audit mutu internal perlu penguatan","Renstra §4.4","Ketua GPM"),
 (FAK,"RTM","Budaya mutu dan evaluasi berkelanjutan belum terinternalisasi merata di seluruh unit kerja","Renstra §3.2","Ketua GPM"),
 (FAK,"AMI","SOP layanan belum seragam; harmonisasi prosedur kerja perlu dipercepat","Renstra §4.4","Wakil Dekan II"),
 (FAK,"RTM","Evidence dampak kegiatan pengabdian belum terdokumentasi optimal","Bahan Raker GPM","Koordinator Pengabdian"),
 (FAK,"AMI","Pemetaan luaran penelitian belum terintegrasi","Bahan Raker GPM","Koordinator Penelitian"),
 (FAK,"Evaluasi Perkuliahan","Dokumentasi tindak lanjut evaluasi perkuliahan perlu diperkuat","Bahan Raker GPM","Ketua GPM"),
]
tl_prodi = [
 ("AMI","Implementasi OBE dan eviden (CPL-CPMK, RPS, rubrik) belum merata","Renstra §4.4 (W6)","Ketua GKM"),
 ("Evaluasi Perkuliahan","Pembelajaran berbasis proyek dan standardisasi asesmen/praktikum belum seragam","Renstra §4.1 (c)","Ketua Departemen"),
 ("AMI","Kelengkapan evidence standar akreditasi (LED) perlu dikonsolidasikan","Renstra §6.4.6","Ketua GKM"),
 ("RTM","Retensi tahun pertama dan ketepatan lulus: matrikulasi kompetensi dasar","Renstra §4.1 (a), §6.4.1","Ketua Departemen"),
]
rt = random.Random(7)
tl = []; n = 1
def mk(unit, src, temuan, ruj, pic):
    global n
    st = rt.choices(["Selesai","Berjalan","Belum mulai"], [0.3,0.45,0.25])[0]
    prog_ = 100 if st=="Selesai" else (rt.randint(15,85) if st=="Berjalan" else 0)
    m = rt.choice([8,9,10,11,12,1,2,3]); y = 2026 if m >= 8 else 2027
    tl.append({"id":f"TL-{n:03d}","prodi":unit,"sumber":src,"temuan":temuan,"rujukan":ruj,"pic":pic,
        "tenggat":f"{y}-{m:02d}-{rt.choice([15,28]):02d}","status":st,"progres":prog_,
        "evidence": (st=="Selesai" and rt.random()<0.8) or (st=="Berjalan" and rt.random()<0.25)})
    n += 1
for u, s, t_, r_, p in tl_src: mk(u, s, t_, r_, p)
for p in prodi:
    for s, t_, r_, pic in tl_prodi: mk(p["nama"], s, t_, r_, pic + " " + p["nama"])

# Standar SPMI (Tabel 8, 9, 10 Renstra)
std = {
 "pendidikan": ["Profil & Kompetensi Lulusan","Evaluasi & Pengembangan Kurikulum","Isi Pembelajaran","Proses Pembelajaran",
   "Penilaian Pembelajaran","Dosen & Tendik","Sarpras Pembelajaran","Pengelolaan Pembelajaran","Pembiayaan Pembelajaran",
   "Suasana Akademik","Input Mahasiswa","Output Pendidikan","Outcomes Pendidikan","Impact Pembelajaran"],
 "penelitian": ["Perencanaan Penelitian","Isi Penelitian","Proses Penelitian","Penilaian Penelitian","Peneliti","Sarpras Penelitian",
   "Pengelolaan Penelitian","Pendanaan & Pembiayaan","Output Penelitian","Outcomes Penelitian","Impact Penelitian"],
 "pkm": ["Rencana PkM","Isi PkM","Proses PkM","Penilaian PkM","Pengabdi","Sarpras PkM","Pengelolaan PkM",
   "Pendanaan & Pembiayaan","Output PkM","Outcomes PkM","Impact PkM"],
}
ra = random.Random(11)
akr = []
for p, now, led, bias in [("Teknik Komputer","Baik Sekali",72,0),("Sistem Informasi","Baik Sekali",68,2),("Informatika","Baik",55,-8)]:
    akr.append({"prodi":p,"peringkat_saat_ini":now,"peringkat_target":"Unggul","led_progres":led,
        "standar":{k:[{"nama":nm,"evidence_pct":max(25,min(98,ra.randint(50,92)+bias))} for nm in v] for k,v in std.items()}})

catatan = [
 "Baseline P15 (dosen S3) tercatat 48,18%, sedangkan Tabel 2 Renstra menunjukkan 8 dosen S3 + 1 profesor dari 43 dosen (sekitar 21%). Perlu verifikasi definisi dan denominator.",
 "Baseline P7 (prodi berakreditasi/bersertifikasi internasional) tercatat 66%, padahal Bab 2 menyebut prodi masih dalam proses memenuhi standar akreditasi internasional. Perlu verifikasi.",
 "Target P6 (66% prodi Unggul pada 2026) setara 2 dari 3 prodi, sementara baseline 2025 adalah 0. Status per prodi dipantau pada tab Capaian Akreditasi.",
 "Dua IKSS di P1 (lulusan bekerja/melanjutkan/wiraswasta) memiliki target identik dan redaksi hampir sama. Perlu dipastikan apakah ini satu atau dua indikator.",
 "Judul Tabel 10 di Lampiran Renstra tertulis \"Tabel 80\" (kemungkinan salah ketik untuk Tabel 10).",
]
out = {"meta":{"judul":"Dashboard Mutu FTI Universitas Andalas","subjudul":"Gugus Penjamin Mutu (GPM) · Renstra 2026-2030",
   "rujukan":"Renstra FTI UNAND 2026-2030, SK Dekan No. 67/UN16.15.D/KPT/VIII/2026 (19 Mei 2026)",
   "diperbarui":"2026-10-18","data_contoh":True,"tahun_berjalan":2026,"triwulan_berjalan":3,"tahun_target":TARGET_YEARS,
   "sumber":"Target & baseline dari Renstra; realisasi, status tindak lanjut, dan evidence adalah DATA CONTOH"},
 "milestone":[{"tahun":2026,"nama":"Fondasi Tata Kelola"},{"tahun":2027,"nama":"Penguatan Akademik & SDM"},
   {"tahun":2028,"nama":"Reputasi & Internasionalisasi"},{"tahun":2029,"nama":"Hilirisasi & Inovasi"},{"tahun":2030,"nama":"Keberlanjutan & Daya Saing"}],
 "sasaran":[{"kode":k,"nama":v} for k,v in sasaran],"prodi":prodi,"indikator":indikator,"tindak_lanjut":tl,
 "akreditasi":akr,"catatan_validasi":catatan}
json.dump(out, open("sumber/mutu.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(indikator), "indikator;", len(tl), "tindak lanjut;", len(akr), "prodi;", sum(1 for x in indikator if x["realisasi"] is None), "tanpa realisasi")
