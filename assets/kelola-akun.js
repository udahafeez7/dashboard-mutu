"use strict";
(async () => {
  let s;
  try { s = await Auth.wajib({peran: ["admin"]}); } catch (e) { return; }
  UI.kerangka(s);
  UI.jagaSesi();
  const $ = id => document.getElementById(id);
  const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  const PERAN = Auth.PERAN;
  const AKSES = {
    gkm: "Dashboard Mutu; filter otomatis ke prodinya. Hanya membaca.",
    gpm: "Dashboard Mutu dan unggah Data Dashboard di menu Pengaturan.",
    pimpinan: "Dashboard Mutu untuk pemantauan. Hanya membaca.",
    admin: "Semua fitur, termasuk Manajemen Akun, Log Aktivitas, dan Pengaturan Keamanan.",
  };
  const AKSI_LOG = {
    masuk: ["Masuk", "ok"], keluar: ["Keluar", "neutral"], masuk_gagal: ["Gagal masuk", "warn"],
    akun_terkunci: ["Akun terkunci", "bad"], masuk_ditolak_terkunci: ["Ditolak: terkunci", "bad"], masuk_ditolak_nonaktif: ["Ditolak: nonaktif", "bad"],
    akun_dibuat: ["Akun dibuat", "info"], akun_diubah: ["Akun diubah", "info"], akun_diaktifkan: ["Akun diaktifkan", "ok"],
    akun_dinonaktifkan: ["Akun dinonaktifkan", "warn"], akun_dihapus: ["Akun dihapus", "bad"], akun_dibuka_kuncinya: ["Kunci dibuka", "info"],
    sandi_direset: ["Password direset", "warn"], sandi_diganti: ["Password diganti", "ok"], profil_diubah: ["Profil diubah", "info"],
    pengaturan_diubah: ["Pengaturan diubah", "info"], data_diunggah: ["Data diunggah", "info"], data_dipulihkan: ["Data dipulihkan", "info"],
  };
  const tgl = v => v ? new Date(v).toLocaleString("id-ID", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}) : null;
  const badge = (t, k) => el("span", "badge b-" + k, t);
  const kosong = (t, alasan) => { const x = el("span", "kosong", t); x.title = alasan; return x; };
  const sibuk = (btn, on, teks) => { btn.disabled = on; if (on) { btn.dataset.asli = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + teks; } else if (btn.dataset.asli) btn.innerHTML = btn.dataset.asli; };

  /* ---------- tabel sederhana bergaya .tbl (urut, lengket, aksi saat hover/fokus) ---------- */
  const urut = {};
  function tabel(host, id, kolom, baris, aksi, satuan){
    const st = urut[id] || (urut[id] = {key: null, dir: 1});
    if (st.key) {
      const c = kolom.find(k => k.key === st.key);
      baris = baris.slice().sort((a, b) => { const x = c.val ? c.val(a) : a[c.key], y = c.val ? c.val(b) : b[c.key]; return ((x == null) - (y == null)) || (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    }
    let kiri = 0;
    const tb = el("table", "tbl");
    tb.style.width = kolom.reduce((a, k) => a + k.w, 0) + (aksi ? 150 : 0) + "px";
    const cg = el("colgroup"); kolom.forEach(k => { const c = el("col"); c.style.width = k.w + "px"; cg.append(c); }); if (aksi) { const c = el("col"); c.style.width = "150px"; cg.append(c); }
    const lengket = kolom.filter(k => k.lengket), akhir = lengket[lengket.length - 1];
    const sel = (tag, k) => { const x = el(tag, [k.num ? "num" : "", k.lengket ? "lengket" : "", k === akhir ? "lengket-akhir" : ""].join(" ").trim()); if (k.lengket) x.style.left = k._kiri + "px"; return x; };
    kolom.forEach(k => { if (k.lengket) { k._kiri = kiri; kiri += k.w; } });
    const tr = el("tr");
    kolom.forEach(k => {
      const th = sel("th", k); th.scope = "col";
      const b = el("button"); b.type = "button"; b.append(el("span", null, k.label));
      const ikon = el("i", "bi " + (st.key === k.key ? (st.dir > 0 ? "bi-caret-up-fill" : "bi-caret-down-fill") : "bi-chevron-expand")); ikon.setAttribute("aria-hidden", "true"); b.append(ikon);
      b.addEventListener("click", () => { st.dir = st.key === k.key ? -st.dir : 1; st.key = k.key; tabel(host, id, kolom, baris, aksi, satuan); });
      if (st.key === k.key) th.setAttribute("aria-sort", st.dir > 0 ? "ascending" : "descending");
      th.append(b); tr.append(th);
    });
    if (aksi) { const th = el("th", "aksi"); th.append(el("span", "visually-hidden", "Aksi")); tr.append(th); }
    const thead = el("thead"); thead.append(tr);
    const tbody = el("tbody");
    baris.forEach(r => {
      const row = el("tr");
      kolom.forEach(k => {
        const td = sel("td", k), isi = k.cell ? k.cell(r) : r[k.key];
        if (isi instanceof Node) td.append(isi); else td.textContent = isi == null ? "" : isi;
        const teks = k.teks ? k.teks(r) : typeof isi === "string" ? isi : null;
        if (teks && !k.num) td.title = teks;
        row.append(td);
      });
      if (aksi) {
        const td = el("td", "aksi"), w = el("div", "aksi-isi");
        aksi(r).forEach(a => { const b = el("button"); b.type = "button"; b.title = a.label; b.setAttribute("aria-label", a.label + " " + (r.username || "")); if (a.bahaya) b.classList.add("bahaya"); const i = el("i", "bi " + a.ikon); i.setAttribute("aria-hidden", "true"); b.append(i); b.addEventListener("click", () => a.klik(r)); w.append(b); });
        td.append(w); row.append(td);
      }
      tbody.append(row);
    });
    if (!baris.length) { const row = el("tr"), td = el("td", "kosong-baris"); td.colSpan = kolom.length + (aksi ? 1 : 0); td.textContent = "Tidak ada data yang cocok dengan pencarian atau saringan."; row.append(td); tbody.append(row); }
    tb.append(cg, thead, tbody);
    const wrap = el("div", "tbl-wrap"); wrap.dataset.densitas = "standar"; wrap.tabIndex = 0; wrap.setAttribute("role", "region"); wrap.setAttribute("aria-label", satuan);
    wrap.append(tb);
    const tanda = () => { wrap.classList.toggle("tergulir", wrap.scrollLeft > 0); wrap.classList.toggle("bisa-kanan", wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth - 1); };
    wrap.addEventListener("scroll", tanda, {passive: true});
    const jml = el("div", "tbl-alat"); const sp = el("span", "tbl-jumlah"); sp.append(el("b", null, baris.length), " " + satuan); jml.append(sp);
    $(host).replaceChildren(jml, wrap);
    tanda();
  }

  /* ---------- data akun ---------- */
  let AKUN = [], PRODI = [];
  const statusAkun = a => !a.aktif ? "nonaktif" : a.terkunci ? "terkunci" : a.wajib_ganti_sandi ? "wajib" : "aktif";
  async function muatAkun(){
    const d = await Auth.api("GET", "/api/akun");
    AKUN = d.akun; PRODI = d.prodi;
    $("n-akun").textContent = AKUN.length;
    isiProdi($("d-prodi")); isiProdi($("u-prodi"));
    renderAkun();
  }
  function isiProdi(sel){
    sel.replaceChildren(...PRODI.map(p => { const o = el("option", null, p); o.value = p; return o; }));
  }
  function renderAkun(){
    const q = $("cari").value.trim().toLowerCase(), fp = $("f-peran").value, fs = $("f-status").value;
    const rows = AKUN.filter(a => (!fp || a.peran === fp) && (!fs || (fs === "terkunci" ? a.terkunci : fs === "wajib" ? a.wajib_ganti_sandi && a.aktif : statusAkun(a) === fs || (fs === "aktif" && a.aktif && !a.terkunci)))
      && (!q || [a.username, a.nama, a.email, a.prodi].some(x => x && x.toLowerCase().includes(q))));
    tabel("t-akun", "akun", [
      {key: "username", label: "Username", w: 150, lengket: true, cell: a => { const x = el("span", "kode", a.username); if (a.id === s.id) { const y = el("span", "anda", "Anda"); const w = el("span"); w.append(x, " ", y); return w; } return x; }, teks: a => a.username},
      {key: "nama", label: "Nama", w: 230},
      {key: "peran", label: "Peran", w: 130, cell: a => badge(PERAN[a.peran] || a.peran, a.peran === "admin" ? "info" : "neutral"), teks: a => PERAN[a.peran]},
      {key: "prodi", label: "Prodi", w: 160, cell: a => a.prodi || kosong("—", "Peran " + (PERAN[a.peran] || a.peran) + " tidak terikat prodi")},
      {key: "email", label: "Email", w: 210, cell: a => a.email || kosong("tidak diisi", "Email belum diisi; opsional")},
      {key: "status", label: "Status", w: 190, val: statusAkun, cell: a => {
        const w = el("span", "status-gabung");
        w.append(a.aktif ? badge("Aktif", "ok") : badge("Nonaktif", "neutral"));
        if (a.terkunci) w.append(" ", badge("Terkunci", "bad"));
        if (a.aktif && a.wajib_ganti_sandi) w.append(" ", badge("Password awal", "warn"));
        return w;
      }, teks: a => [a.aktif ? "Aktif" : "Nonaktif", a.terkunci ? "terkunci sampai " + tgl(a.terkunci_sampai) : "", a.wajib_ganti_sandi ? "belum mengganti password sementara" : ""].filter(Boolean).join(" · ")},
      {key: "login_terakhir", label: "Masuk terakhir", w: 160, num: true, val: a => a.login_terakhir, cell: a => tgl(a.login_terakhir) || kosong("belum pernah", "Akun ini belum pernah dipakai masuk")},
      {key: "dibuat_pada", label: "Dibuat", w: 150, num: true, cell: a => tgl(a.dibuat_pada)},
    ], rows, a => [
      {ikon: "bi-pencil-square", label: "Ubah akun", klik: ubah},
      {ikon: "bi-key", label: "Reset password", klik: a => konfirmasi(a, "reset")},
      ...(a.terkunci ? [{ikon: "bi-unlock", label: "Buka kunci", klik: bukaKunci}] : []),
      ...(a.id !== s.id ? [{ikon: a.aktif ? "bi-person-dash" : "bi-person-check", label: a.aktif ? "Nonaktifkan" : "Aktifkan", klik: a => konfirmasi(a, a.aktif ? "nonaktif" : "aktif")},
        {ikon: "bi-trash3", label: "Hapus akun", bahaya: true, klik: a => konfirmasi(a, "hapus")}] : []),
    ], "akun");
  }
  ["cari", "f-peran", "f-status"].forEach(id => $(id).addEventListener("input", renderAkun));

  /* ---------- modal: password sementara ---------- */
  const mSandi = new bootstrap.Modal($("m-sandi"));
  function tampilSandi(username, sandi){
    $("ms-user").textContent = username; $("ms-sandi").textContent = sandi;
    mSandi.show();
  }
  $("m-sandi").addEventListener("hidden.bs.modal", () => { $("ms-sandi").textContent = ""; });
  $("ms-salin").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("ms-sandi").textContent); UI.toast("Password sementara disalin.", "sukses", {lama: 2500}); }
    catch (e) { UI.toast("Browser menolak akses clipboard; salin manual.", "peringatan"); }
  });

  /* ---------- modal: ubah ---------- */
  const mUbah = new bootstrap.Modal($("m-ubah"));
  let sedangDiubah = null;
  const togelProdi = (sel, wrap) => { wrap.hidden = sel.value !== "gkm"; };
  $("u-peran").addEventListener("change", () => togelProdi($("u-peran"), $("u-prodi-wrap")));
  function ubah(a){
    sedangDiubah = a;
    $("mu-judul").textContent = "Ubah akun " + a.username;
    $("u-nama").value = a.nama; $("u-email").value = a.email || ""; $("u-peran").value = a.peran; $("u-aktif").checked = a.aktif;
    if (a.prodi) $("u-prodi").value = a.prodi;
    const diri = a.id === s.id;
    $("u-peran").disabled = diri; $("u-aktif").disabled = diri;
    $("u-peran").title = diri ? "Peran akun Anda sendiri tidak bisa diubah" : "";
    togelProdi($("u-peran"), $("u-prodi-wrap"));
    $("u-galat").hidden = true;
    mUbah.show();
  }
  $("f-ubah").addEventListener("submit", async e => {
    e.preventDefault();
    const a = sedangDiubah, isi = {nama: $("u-nama").value.trim(), email: $("u-email").value.trim(), peran: $("u-peran").value, aktif: $("u-aktif").checked};
    if (isi.peran === "gkm") isi.prodi = $("u-prodi").value;
    if (!isi.nama) { $("u-nama").classList.add("is-invalid"); return; }
    sibuk($("b-ubah"), true, "Menyimpan…");
    try { await Auth.api("PATCH", "/api/akun/" + a.id, isi); mUbah.hide(); UI.toast("Akun " + a.username + " diperbarui.", "sukses"); await muatAkun(); }
    catch (er) { $("u-galat").textContent = er.message; $("u-galat").hidden = false; }
    finally { sibuk($("b-ubah"), false); }
  });
  $("u-nama").addEventListener("input", () => $("u-nama").classList.remove("is-invalid"));

  /* ---------- modal: konfirmasi ---------- */
  const mKonf = new bootstrap.Modal($("m-konfirmasi"));
  const KONF = {
    reset: {judul: "Reset password?", ikon: "bi-key", teks: a => `Password ${a.username} diganti dengan password sementara baru, sesi aktifnya diakhiri, dan kuncinya (bila ada) dibuka.`, tombol: "Reset password", kelas: "btn-silver",
      jalan: async a => { const d = await Auth.api("POST", "/api/akun/" + a.id + "/reset-sandi"); mKonf.hide(); await muatAkun(); setTimeout(() => tampilSandi(a.username, d.sandi_sementara), 350); }},
    nonaktif: {judul: "Nonaktifkan akun?", ikon: "bi-person-dash", teks: a => `${a.nama} tidak bisa masuk lagi dan sesi aktifnya diakhiri. Akun bisa diaktifkan kembali kapan saja.`, tombol: "Nonaktifkan", kelas: "btn-warning",
      jalan: async a => { await Auth.api("PATCH", "/api/akun/" + a.id, {aktif: false}); mKonf.hide(); UI.toast("Akun " + a.username + " dinonaktifkan.", "sukses"); await muatAkun(); }},
    aktif: {judul: "Aktifkan akun?", ikon: "bi-person-check", teks: a => `${a.nama} dapat masuk kembali dengan password yang sama.`, tombol: "Aktifkan", kelas: "btn-success",
      jalan: async a => { await Auth.api("PATCH", "/api/akun/" + a.id, {aktif: true}); mKonf.hide(); UI.toast("Akun " + a.username + " diaktifkan.", "sukses"); await muatAkun(); }},
    hapus: {judul: "Hapus akun permanen?", ikon: "bi-trash3", ketik: true, teks: a => `Akun ${a.username} (${a.nama}) dihapus dari database. Riwayat log tetap tersimpan. Bila hanya ingin mencabut akses sementara, gunakan Nonaktifkan.`, tombol: "Hapus permanen", kelas: "btn-danger",
      jalan: async a => { await Auth.api("DELETE", "/api/akun/" + a.id, {konfirmasi: $("mk2-input").value.trim()}); mKonf.hide(); UI.toast("Akun " + a.username + " dihapus.", "sukses"); await muatAkun(); }},
  };
  let konfAktif = null;
  function konfirmasi(a, jenis){
    const k = KONF[jenis]; konfAktif = {a, k};
    $("mk2-judul").textContent = k.judul; $("mk2-teks").textContent = k.teks(a);
    $("mk2-ikon").firstElementChild.className = "bi " + k.ikon;
    $("mk2-ya").textContent = k.tombol; $("mk2-ya").className = "btn px-4 " + k.kelas;
    $("mk2-ketik").hidden = !k.ketik; $("mk2-user").textContent = a.username; $("mk2-input").value = "";
    $("mk2-ya").disabled = !!k.ketik;
    $("mk2-galat").hidden = true;
    mKonf.show();
  }
  $("mk2-input").addEventListener("input", () => { $("mk2-ya").disabled = $("mk2-input").value.trim() !== konfAktif.a.username; });
  $("m-konfirmasi").addEventListener("shown.bs.modal", () => (konfAktif.k.ketik ? $("mk2-input") : $("mk2-ya")).focus());
  $("mk2-ya").addEventListener("click", async () => {
    const btn = $("mk2-ya"); sibuk(btn, true, "Memproses…");
    try { await konfAktif.k.jalan(konfAktif.a); }
    catch (er) { $("mk2-galat").textContent = er.message; $("mk2-galat").hidden = false; }
    finally { sibuk(btn, false); }
  });
  async function bukaKunci(a){
    try { await Auth.api("POST", "/api/akun/" + a.id + "/buka-kunci"); UI.toast("Kunci akun " + a.username + " dibuka.", "sukses"); await muatAkun(); }
    catch (er) { UI.toast(er.message, "galat"); }
  }

  /* ---------- pendaftaran ---------- */
  function infoPeran(){
    const p = $("d-peran").value;
    $("d-prodi-wrap").hidden = p !== "gkm";
    $("peran-info").replaceChildren(...(p ? [el("dt", null, "Akses " + PERAN[p]), el("dd", null, AKSES[p])] : []));
  }
  $("d-peran").addEventListener("change", infoPeran);
  $("d-username").addEventListener("input", () => { $("d-username").value = $("d-username").value.toLowerCase().replace(/\s+/g, ""); $("d-username").classList.remove("is-invalid"); });
  $("f-daftar").addEventListener("reset", () => setTimeout(() => { infoPeran(); $("d-galat").hidden = true; document.querySelectorAll("#f-daftar .is-invalid").forEach(x => x.classList.remove("is-invalid")); }));
  $("f-daftar").addEventListener("submit", async e => {
    e.preventDefault();
    $("d-galat").hidden = true;
    const wajib = ["d-username", "d-nama", "d-peran"].map($).filter(x => !x.value.trim() || !x.checkValidity());
    if ($("d-email").value && !$("d-email").checkValidity()) wajib.push($("d-email"));
    wajib.forEach(x => x.classList.add("is-invalid"));
    if (wajib.length) { wajib[0].focus(); return; }
    const isi = {username: $("d-username").value.trim(), nama: $("d-nama").value.trim(), email: $("d-email").value.trim(), peran: $("d-peran").value};
    if (isi.peran === "gkm") isi.prodi = $("d-prodi").value;
    sibuk($("b-daftar"), true, "Mendaftarkan…");
    try {
      const d = await Auth.api("POST", "/api/akun", isi);
      $("f-daftar").reset();
      await muatAkun();
      location.hash = "#akun";
      setTimeout(() => tampilSandi(d.akun.username, d.sandi_sementara), 250);
    } catch (er) { $("d-galat").textContent = er.message; $("d-galat").hidden = false; }
    finally { sibuk($("b-daftar"), false); }
  });
  document.querySelectorAll("#f-daftar input, #f-daftar select").forEach(x => x.addEventListener("input", () => x.classList.remove("is-invalid")));

  /* ---------- log ---------- */
  let tundaCari = null;
  async function muatLog(){
    try {
      const q = $("cari-log").value.trim();
      const {log} = await Auth.api("GET", "/api/pengaturan/log?batas=300" + (q ? "&q=" + encodeURIComponent(q) : ""));
      tabel("t-log", "log", [
        {key: "waktu", label: "Waktu", w: 170, num: true, lengket: true, cell: l => tgl(l.waktu)},
        {key: "username", label: "Pengguna", w: 150, cell: l => l.username || kosong("tanpa nama", "Aksi sistem")},
        {key: "aksi", label: "Aksi", w: 180, cell: l => { const [t, k] = AKSI_LOG[l.aksi] || [l.aksi, "neutral"]; return badge(t, k); }, teks: l => (AKSI_LOG[l.aksi] || [l.aksi])[0]},
        {key: "target", label: "Target", w: 160, cell: l => l.target || kosong("—", "Tidak ada target")},
        {key: "detail", label: "Detail", w: 320, cell: l => l.detail || kosong("—", "Tidak ada detail tambahan")},
        {key: "ip", label: "Alamat IP", w: 140, cell: l => l.ip || kosong("—", "Tidak tercatat")},
      ], log, null, "entri log (300 terbaru)");
    } catch (er) { $("t-log").textContent = "Gagal memuat log: " + er.message; }
  }
  $("cari-log").addEventListener("input", () => { clearTimeout(tundaCari); tundaCari = setTimeout(muatLog, 300); });
  $("muat-log").addEventListener("click", muatLog);

  /* ---------- tab ---------- */
  let logDimuat = false;
  function tampilTab(){
    const t = ({"#daftar": "daftar", "#log": "log"})[location.hash] || "akun";
    ["akun", "daftar", "log"].forEach(x => { $("tab-" + x).hidden = x !== t; });
    document.querySelectorAll(".tab-hal [data-tab]").forEach(a => a.setAttribute("aria-selected", String(a.dataset.tab === t)));
    if (t === "log" && !logDimuat) { logDimuat = true; muatLog(); }
    if (t === "daftar") setTimeout(() => $("d-username").focus(), 50);
  }
  addEventListener("hashchange", tampilTab);

  try { await muatAkun(); } catch (er) { $("t-akun").textContent = "Gagal memuat akun: " + er.message; }
  tampilTab();
  UI.loader.sembunyi(500);
})();
