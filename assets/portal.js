"use strict";
(async () => {
  const s = Auth.wajib();
  Auth.bilah(s, "portal.html");
  UI.jagaSesi();
  const el = id => document.getElementById(id);
  const mk = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  const fmt = (n, d = 0) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});

  /* ---------- sapaan ---------- */
  const tglPanjang = ms => new Date(ms).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric"});
  el("tanggal").textContent = tglPanjang(Date.now());
  const h1 = el("sapa"); h1.textContent = "Selamat Datang Kembali, ";
  h1.append(mk("span", null, s.nama));
  el("sub").textContent = (Auth.PERAN[s.peran] || s.peran) + (s.prodi ? " · " + s.prodi : "") + " · Portal Mutu FTI Universitas Andalas";
  if (s.terakhir) {
    el("terakhir").hidden = false;
    el("terakhir").querySelector("span").textContent = "Terakhir masuk di perangkat ini: " + tglPanjang(s.terakhir) + ", pukul " +
      new Date(s.terakhir).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"});
  }

  /* ---------- ringkasan ---------- */
  const tile = (ikon, nada, label, nilai, ket) => {
    const t = mk("div", "tile");
    const i = mk("span", "ikon-tile t-" + nada); i.setAttribute("aria-hidden", "true"); i.append(mk("i", "bi " + ikon));
    const isi = mk("div"); isi.append(mk("div", "l", label), mk("div", "v", nilai), mk("div", "s", ket));
    t.append(i, isi);
    return t;
  };
  const TAHAP = {unduh: "Mengunduh data terenkripsi…", dekripsi: "Mendekripsi data (AES-256-GCM)…"};
  try {
    const D = await Auth.muatMutu(t => UI.loader.pesan(TAHAP[t]));
    const R = Mutu.ringkas(D), yr = D.meta.tahun_berjalan;
    el("periode").textContent = "Tahun berjalan " + yr + " · Triwulan " + D.meta.triwulan_berjalan;

    // Satu angka utama per tampilan: capaian rata-rata IKSS.
    const utama = mk("div", "tile tile-utama");
    const atas = mk("div", "atas");
    const ik = mk("span", "ikon-tile t-utama"); ik.setAttribute("aria-hidden", "true"); ik.append(mk("i", "bi bi-speedometer2"));
    atas.append(ik, mk("div", "l", "Capaian rata-rata IKSS terhadap target " + yr));
    const meter = mk("div", "meter"); meter.setAttribute("role", "meter"); meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", "100");
    meter.setAttribute("aria-valuenow", Math.min(100, Math.round(R.capaianRata))); meter.setAttribute("aria-label", "Capaian rata-rata IKSS");
    const isi = mk("i"); isi.style.width = Math.min(100, R.capaianRata) + "%"; meter.append(isi);
    const rinci = mk("div", "rincian");
    [["Sesuai target", R.ikssSesuai + " IKSS"], ["Sudah terisi", R.ikssTerisi + " / " + R.ikssTotal], ["Belum terisi", (R.ikssTotal - R.ikssTerisi) + " IKSS"]]
      .forEach(([k, v]) => { const sp = mk("span", null, k + ": "); sp.append(mk("b", null, v)); rinci.append(sp); });
    utama.append(atas, mk("div", "v", fmt(R.capaianRata) + "%"), meter,
      mk("div", "s", "Indikator kumulatif dibandingkan dengan target pro-rata triwulan berjalan."), rinci);

    const telat = R.tlTerlambat, kurang = R.p6Butuh != null && R.prodiUnggul < R.p6Butuh;
    el("ringkas").replaceChildren(utama,
      tile("bi-bullseye", "biru", "IKSS sesuai target", R.ikssTerisi ? fmt(R.ikssSesuai / R.ikssTerisi * 100) + "%" : "–", R.ikssSesuai + " dari " + R.ikssTerisi + " yang terisi"),
      tile("bi-check2-circle", "ok", "Tindak lanjut selesai", R.tlSelesai + " / " + R.tlTotal, R.tlTotal ? fmt(R.tlSelesai / R.tlTotal * 100) + "% dari seluruh temuan" : "belum ada temuan"),
      tile("bi-alarm", telat ? "bad" : "ok", "Tindak lanjut terlambat", telat, telat ? "melewati tenggat, perlu perhatian" : "tidak ada yang terlambat"),
      tile("bi-award", kurang ? "warn" : "ok", "Prodi akreditasi Unggul", R.prodiUnggul + " / " + R.prodiTotal, R.p6Target != null ? "target " + yr + ": ≥ " + R.p6Butuh + " prodi" : ""));
    el("rujukan").textContent = D.meta.rujukan;
    el("foot").textContent = "Data diperbarui " + D.meta.diperbarui + (D.meta.data_contoh ? " · masih memuat DATA CONTOH" : "");
  } catch (e) {
    el("ringkas").replaceChildren(tile("bi-exclamation-triangle", "bad", "Data", "Gagal dibuka", e.message));
  }

  /* ---------- akun (admin) ---------- */
  UI.loader.pesan("Menyusun beranda…");
  if (s.peran === "admin") {
    el("panel-admin").hidden = false;
    try {
      const rows = (await Auth.daftarAkun()).sort((a, b) => a.u.localeCompare(b.u));
      const t = mk("table");
      const head = mk("tr");
      ["Username", "Nama", "Peran", "Prodi", "Dibuat"].forEach(x => head.append(mk("th", null, x)));
      const thead = mk("thead"); thead.append(head);
      const tb = mk("tbody");
      rows.forEach(r => {
        const tr = mk("tr");
        [r.u, r.nama, Auth.PERAN[r.peran] || r.peran, r.prodi || "–", r.dibuat || "–"].forEach(v => tr.append(mk("td", null, v)));
        tb.append(tr);
      });
      t.append(thead, tb);
      el("akun").replaceChildren(t);
    } catch (e) { el("akun").textContent = "Gagal membaca daftar akun: " + e.message; }
  }
  UI.loader.sembunyi(900);
})();
