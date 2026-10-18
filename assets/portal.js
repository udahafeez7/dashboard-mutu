"use strict";
(async () => {
  const s = Auth.wajib();
  Auth.bilah(s, "portal.html");
  const el = id => document.getElementById(id);
  el("sapa").textContent = "Selamat datang, " + s.nama;
  el("sub").textContent = (Auth.PERAN[s.peran] || s.peran) + (s.prodi ? " · " + s.prodi : "") + " · Portal Mutu FTI Universitas Andalas";

  const kotak = (label, nilai) => {
    const d = document.createElement("div"), sm = document.createElement("small"), b = document.createElement("b");
    sm.textContent = label; b.textContent = nilai; d.append(sm, b); return d;
  };
  try {
    const D = await Auth.muatMutu(), today = new Date().toISOString().slice(0, 10);
    const T = D.tindak_lanjut, I = D.indikator;
    const terisi = I.filter(i => Array.isArray(i.realisasi) && i.realisasi.length).length;
    el("ringkas").replaceChildren(
      kotak("IKSS terisi", terisi + " / " + I.length),
      kotak("Tindak lanjut selesai", T.filter(t => t.status === "Selesai").length + " / " + T.length),
      kotak("Tindak lanjut terlambat", T.filter(t => t.status !== "Selesai" && t.tenggat < today).length),
      kotak("Prodi Unggul", D.akreditasi.filter(a => a.peringkat_saat_ini === "Unggul").length + " / " + D.akreditasi.length));
    el("rujukan").textContent = D.meta.rujukan;
    el("foot").textContent = "Data diperbarui " + D.meta.diperbarui + (D.meta.data_contoh ? " · masih memuat DATA CONTOH" : "");
  } catch (e) {
    el("ringkas").replaceChildren(kotak("Data", "gagal dibuka"));
    el("foot").textContent = e.message;
  }

  if (s.peran === "admin") {
    el("panel-admin").hidden = false;
    try {
      const rows = (await Auth.daftarAkun()).sort((a, b) => a.u.localeCompare(b.u));
      const t = document.createElement("table");
      t.innerHTML = "<thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th>Prodi</th><th>Dibuat</th></tr></thead>";
      const tb = document.createElement("tbody");
      rows.forEach(r => {
        const tr = document.createElement("tr");
        [r.u, r.nama, Auth.PERAN[r.peran] || r.peran, r.prodi || "–", r.dibuat || "–"].forEach(v => {
          const td = document.createElement("td"); td.textContent = v; tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      el("akun").replaceChildren(t);
    } catch (e) { el("akun").textContent = "Gagal membaca daftar akun: " + e.message; }
  }
})();
