"use strict";
(async () => {
  let s;
  try { s = await Auth.wajib({peran: ["admin", "gpm"]}); } catch (e) { return; }
  UI.kerangka(s);
  UI.jagaSesi();
  const $ = id => document.getElementById(id);
  const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  const admin = s.peran === "admin";
  const sibuk = (btn, on, teks) => { btn.disabled = on; if (on) { btn.dataset.asli = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + teks; } else if (btn.dataset.asli) btn.innerHTML = btn.dataset.asli; };
  const tgl = v => new Date(v).toLocaleString("id-ID", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"});
  const kb = n => (n / 1024).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " KB";

  /* ---------- keamanan & sesi (admin) ---------- */
  const ATUR = [
    {k: "sesi_idle_menit", label: "Batas tidak aktif", satuan: "menit", ket: "Sesi berakhir bila tidak ada aktivitas selama waktu ini."},
    {k: "sesi_maks_jam", label: "Umur sesi maksimum", satuan: "jam", ket: "Pengguna wajib masuk ulang setelah waktu ini, walau terus aktif."},
    {k: "maks_gagal_login", label: "Batas salah password", satuan: "kali", ket: "Akun dikunci sementara setelah sekian kali salah password berturut-turut."},
    {k: "kunci_menit", label: "Lama penguncian", satuan: "menit", ket: "Akun terkunci terbuka otomatis setelah waktu ini, atau dibuka admin."},
    {k: "sandi_min", label: "Panjang password minimum", satuan: "karakter", ket: "Berlaku saat password diganti. Password lama tetap berlaku sampai diganti."},
  ];
  let BAWAAN = {};
  async function muatAturan(){
    const d = await Auth.api("GET", "/api/pengaturan");
    BAWAAN = d.bawaan;
    $("atur").replaceChildren(...ATUR.map(a => {
      const [min, maks] = d.batas[a.k];
      const w = el("div", "atur-item");
      const lab = el("label", "form-label", a.label); lab.htmlFor = "a-" + a.k;
      const g = el("div", "input-group");
      const inp = el("input", "form-control"); inp.type = "number"; inp.id = "a-" + a.k; inp.min = min; inp.max = maks; inp.step = 1; inp.required = true; inp.value = d.pengaturan[a.k];
      inp.setAttribute("aria-describedby", "k-" + a.k);
      g.append(inp, el("span", "input-group-text", a.satuan));
      const ket = el("div", "form-text", a.ket + " Rentang " + min + "–" + maks + "; bawaan " + d.bawaan[a.k] + "."); ket.id = "k-" + a.k;
      w.append(lab, g, ket);
      return w;
    }));
  }
  $("a-bawaan").addEventListener("click", () => ATUR.forEach(a => { $("a-" + a.k).value = BAWAAN[a.k]; }));
  $("f-aman").addEventListener("submit", async e => {
    e.preventDefault();
    $("a-galat").hidden = true;
    const salah = ATUR.map(a => $("a-" + a.k)).filter(x => !x.checkValidity());
    ATUR.forEach(a => $("a-" + a.k).classList.toggle("is-invalid", !$("a-" + a.k).checkValidity()));
    if (salah.length) { salah[0].focus(); return; }
    const isi = Object.fromEntries(ATUR.map(a => [a.k, Number($("a-" + a.k).value)]));
    sibuk($("b-aman"), true, "Menyimpan…");
    try { const d = await Auth.api("PUT", "/api/pengaturan", isi); UI.toast(d.berubah ? d.berubah + " pengaturan diperbarui." : "Tidak ada perubahan.", "sukses"); }
    catch (er) { $("a-galat").textContent = er.message; $("a-galat").hidden = false; }
    finally { sibuk($("b-aman"), false); }
  });

  /* ---------- data dashboard ---------- */
  let calon = null;
  async function muatRiwayat(){
    const {riwayat} = await Auth.api("GET", "/api/mutu/riwayat");
    const kini = riwayat[0];
    $("versi-kini").replaceChildren(kini
      ? (() => { const d = el("div"); d.append(el("i", "bi bi-check-circle-fill"), " Versi aktif ", el("b", null, "#" + kini.id), " · diunggah " + tgl(kini.diunggah_pada) + " oleh " + (kini.oleh_nama || "sistem") + (kini.catatan ? " · " + kini.catatan : "")); return d; })()
      : el("div", "kosong", "Belum ada data. Unggah file JSON pertama."));
    const tb = el("table", "tbl"); tb.style.width = "980px";
    const cg = el("colgroup"); [90, 170, 320, 180, 110, 110].forEach(w => { const c = el("col"); c.style.width = w + "px"; cg.append(c); });
    const th = el("tr"); [["Versi", 1], ["Diunggah", 1], ["Catatan", 0], ["Oleh", 0], ["Ukuran", 1], ["", 0]].forEach(([t, n]) => { const x = el("th", n ? "num" : "", t); th.append(x); });
    const thead = el("thead"); thead.append(th);
    const tbody = el("tbody");
    riwayat.forEach((r, i) => {
      const tr = el("tr");
      const v = el("td", "num"); v.append(el("span", "kode", "#" + r.id)); if (i === 0) v.append(" ", el("span", "badge b-ok", "aktif"));
      const cat = el("td"); if (r.catatan) { cat.textContent = r.catatan; cat.title = r.catatan; } else cat.append(el("span", "kosong", "tanpa catatan"));
      const oleh = el("td"); if (r.oleh_nama) { oleh.textContent = r.oleh_nama; oleh.title = r.oleh; } else { const k = el("span", "kosong", "sistem"); k.title = "Diimpor lewat skrip server (npm run siapkan / impor-data)"; oleh.append(k); }
      const aksi = el("td", "aksi"), w = el("div", "aksi-isi");
      if (admin && i > 0) {
        const b = el("button"); b.type = "button"; b.title = "Pulihkan versi ini"; b.setAttribute("aria-label", "Pulihkan versi " + r.id);
        b.append(el("i", "bi bi-arrow-counterclockwise"));
        b.addEventListener("click", async () => {
          b.disabled = true;
          try { const d = await Auth.api("POST", "/api/mutu/" + r.id + "/pulihkan"); UI.toast("Versi #" + r.id + " dipulihkan sebagai versi #" + d.id + ".", "sukses"); await muatRiwayat(); }
          catch (er) { UI.toast(er.message, "galat"); b.disabled = false; }
        });
        w.append(b);
      }
      aksi.append(w);
      tr.append(v, el("td", "num", tgl(r.diunggah_pada)), cat, oleh, el("td", "num", kb(r.ukuran_byte)), aksi);
      tbody.append(tr);
    });
    tb.append(cg, thead, tbody);
    const wrap = el("div", "tbl-wrap"); wrap.dataset.densitas = "standar"; wrap.append(tb);
    $("t-riwayat").replaceChildren(wrap);
  }

  const WAJIB = ["meta", "sasaran", "prodi", "indikator", "tindak_lanjut", "akreditasi"];
  async function bacaFile(f){
    $("dt-galat").hidden = true; calon = null; $("b-data").disabled = true; $("d-pratinjau").hidden = true;
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return gagal("Ukuran file melebihi 6 MB.");
    let isi;
    try { isi = JSON.parse(await f.text()); } catch (e) { return gagal("File bukan JSON yang valid: " + e.message); }
    const kurang = WAJIB.filter(k => !(k in (isi || {})));
    if (kurang.length) return gagal("Bagian berikut tidak ada: " + kurang.join(", ") + ".");
    calon = isi;
    const p = $("d-pratinjau");
    p.replaceChildren(el("b", null, f.name + " · " + kb(f.size)), el("span", null,
      `${isi.indikator.length} IKSS · ${isi.tindak_lanjut.length} tindak lanjut · ${isi.prodi.length} prodi · tahun berjalan ${isi.meta.tahun_berjalan} TW${isi.meta.triwulan_berjalan}` + (isi.meta.data_contoh ? " · ditandai DATA CONTOH" : "")));
    p.hidden = false;
    $("b-data").disabled = false;
    function gagal(m){ $("dt-galat").textContent = m; $("dt-galat").hidden = false; }
  }
  $("d-file").addEventListener("change", e => bacaFile(e.target.files[0]));
  const zona = $("d-zona");
  ["dragenter", "dragover"].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add("seret"); }));
  ["dragleave", "drop"].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove("seret"); }));
  zona.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) bacaFile(f); });
  $("f-data").addEventListener("submit", async e => {
    e.preventDefault();
    if (!calon) return;
    sibuk($("b-data"), true, "Mengunggah…");
    try {
      const d = await Auth.api("POST", "/api/mutu", {isi: calon, catatan: $("d-catatan").value.trim()});
      UI.toast("Versi #" + d.id + " aktif: " + d.ringkas.indikator + " IKSS, " + d.ringkas.tindak_lanjut + " tindak lanjut.", "sukses", {lama: 5000});
      $("f-data").reset(); calon = null; $("d-pratinjau").hidden = true;
      await muatRiwayat();
    } catch (er) { $("dt-galat").textContent = er.message; $("dt-galat").hidden = false; }
    finally { sibuk($("b-data"), false); $("b-data").disabled = !calon; }
  });
  $("b-unduh").addEventListener("click", async () => {
    try {
      const d = await Auth.api("GET", "/api/mutu");
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], {type: "application/json"}));
      const a = el("a"); a.href = url; a.download = "mutu-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (er) { UI.toast(er.message, "galat"); }
  });

  /* ---------- tab ---------- */
  if (!admin) $("tab-a-keamanan").hidden = true;
  function tampilTab(){
    let t = location.hash === "#data" ? "data" : "keamanan";
    if (!admin) t = "data";
    $("tab-keamanan").hidden = t !== "keamanan"; $("tab-data").hidden = t !== "data";
    document.querySelectorAll(".tab-hal [data-tab]").forEach(a => a.setAttribute("aria-selected", String(a.dataset.tab === t)));
  }
  addEventListener("hashchange", tampilTab);
  tampilTab();
  try { await Promise.all([admin ? muatAturan() : null, muatRiwayat()]); }
  catch (er) { UI.toast(er.message, "galat"); }
  UI.loader.sembunyi(500);
})();
