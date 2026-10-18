import json, random
r = random.Random(2026)
periode = [f"2026-{m:02d}" for m in range(1, 10)]
prodi = [
  {"id":"P1","nama":"Prodi A","gkm":"GKM A"},
  {"id":"P2","nama":"Prodi B","gkm":"GKM B"},
  {"id":"P3","nama":"Prodi C","gkm":"GKM C"},
  {"id":"P4","nama":"Prodi D","gkm":"GKM D"},
]
tpl = [
 ("IKU-01","Kehadiran dosen dalam perkuliahan","Akademik","%",90,"naik",0.93),
 ("IKU-02","Kepuasan mahasiswa terhadap pembelajaran","Akademik","skala 4",3.5,"naik",0.95),
 ("IKU-03","Ketepatan waktu kelulusan","Akademik","%",70,"naik",0.88),
 ("IKU-04","Publikasi terindeks per dosen (kumulatif)","Penelitian","artikel",1.2,"naik",0.8),
 ("IKU-05","Kegiatan pengabdian dengan evidence dampak","Pengabdian","%",80,"naik",0.78),
 ("AMI-01","Temuan AMI masih terbuka","Tata Kelola","temuan",2,"turun",1.8),
]
indikator = []
for p in prodi:
    for kode,nama,bid,sat,tgt,arah,base in tpl:
        bias = r.uniform(-0.08, 0.12)
        vals = []
        for i in range(len(periode)):
            if kode == "IKU-04":
                v = tgt*(i+1)/len(periode)*(base+bias+0.25)
            elif arah == "turun":
                v = max(0, tgt*(base+bias)*(1.6-0.08*i) + r.uniform(-0.3,0.3))
            else:
                v = tgt*(base+bias+0.012*i) + r.uniform(-0.01,0.01)*tgt
            vals.append(round(v, 2))
        indikator.append({"id":f"{p['id']}-{kode}","prodi":p["nama"],"kode":kode,"nama":nama,
            "bidang":bid,"satuan":sat,"target":tgt,"arah":arah,"nilai":vals})
temuan = [
 ("AMI","Dokumen RPS belum seragam antar dosen","Wakil Dekan I"),
 ("AMI","Bukti rapat evaluasi kurikulum belum diarsipkan","Ketua GKM"),
 ("AMI","Pemetaan luaran penelitian belum terintegrasi","Koordinator Penelitian"),
 ("RTM","Evidence dampak pengabdian belum lengkap","Koordinator Pengabdian"),
 ("RTM","Tindak lanjut survei kepuasan belum terdokumentasi","Ketua GKM"),
 ("Evaluasi Perkuliahan","Kehadiran dosen di bawah target pada beberapa mata kuliah","Ketua Prodi"),
 ("Evaluasi Perkuliahan","Evaluasi pembelajaran belum selesai diinput","Ketua Prodi"),
]
tl = []
n = 1
for p in prodi:
    for sumber, t, pic in r.sample(temuan, 7):
        st = r.choices(["Selesai","Berjalan","Belum mulai"], [0.4,0.4,0.2])[0]
        prog = 100 if st=="Selesai" else (r.randint(20,80) if st=="Berjalan" else 0)
        month = r.randint(6, 12)
        yr = 2026 if month <= 12 else 2027
        tl.append({"id":f"TL-{n:03d}","prodi":p["nama"],"sumber":sumber,"temuan":t,"pic":pic,
            "tenggat":f"{yr}-{month:02d}-{r.choice([10,20,28]):02d}","status":st,"progres":prog,
            "evidence": (st=="Selesai" and r.random()<0.75) or (st=="Berjalan" and r.random()<0.3)})
        n += 1
kriteria = ["K1 Visi, Misi, Tujuan, Strategi","K2 Tata Pamong, Tata Kelola, Kerja Sama","K3 Mahasiswa",
 "K4 Sumber Daya Manusia","K5 Keuangan, Sarana, Prasarana","K6 Pendidikan","K7 Penelitian",
 "K8 Pengabdian kepada Masyarakat","K9 Luaran dan Capaian Tridharma"]
akreditasi = []
for p, (lem, now, tgt, thn) in zip(prodi, [("BAN-PT","Baik Sekali","Unggul",2028),("BAN-PT","Baik","Baik Sekali",2027),
                                            ("LAM","Baik Sekali","Unggul",2029),("BAN-PT","Unggul","Unggul",2030)]):
    akreditasi.append({"prodi":p["nama"],"lembaga":lem,"peringkat_saat_ini":now,"peringkat_target":tgt,
        "berlaku_sd":thn,"led_progres":r.randint(45,92),
        "kriteria":[{"nama":k,"evidence_pct":r.randint(40,98)} for k in kriteria]})
out = {"meta":{"judul":"Dashboard Mutu Fakultas","diperbarui":"2026-10-18","data_contoh":True,
        "periode":periode,"sumber":"Data contoh - ganti dengan data GKM/GPM"},
       "prodi":prodi,"indikator":indikator,"tindak_lanjut":tl,"akreditasi":akreditasi}
json.dump(out, open("data/mutu.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(indikator), len(tl), len(akreditasi))
