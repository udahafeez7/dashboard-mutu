"use strict";
let SESI = null;   // diisi oleh mulai() setelah server memastikan sesi
const TAHAP = {unduh: "Mengambil data dari server…", olah: "Menyiapkan data…"};
let DATA = null, sumber = "server Portal Mutu";
const charts = {};
const TABS = ["indikator","tindak","akreditasi"];
const state = {prodi:"Semua", sasaran:"Semua", tab:TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "indikator", standar:"pendidikan", sel:null, sort:{}};
const PAL = ["#15803d","#2563eb","#d97706","#7c3aed","#db2777","#0891b2"];
const STAT_COL = {"Selesai":"#15803d","Berjalan":"#2563eb","Belum mulai":"#94a3b8","Terlambat":"#b91c1c"};
const TODAY = Mutu.hariIni();

function h(tag, attrs, ...kids){
  const e = document.createElement(tag);
  for (const k in (attrs||{})) {
    if (k === "class") e.className = attrs[k];
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  kids.flat().forEach(c => e.append(c instanceof Node ? c : document.createTextNode(c == null ? "" : String(c))));
  return e;
}
const fmt = (n, d=2) => Number(n).toLocaleString("id-ID", {maximumFractionDigits:d});
const avg = Mutu.avg;
const badge = (text, kind) => h("span", {class:"badge b-"+kind}, text);
const kindOf = p => p >= 100 ? "ok" : p >= 85 ? "warn" : "bad";

/* ---------- indikator (rumus di assets/hitung.js) ---------- */
const yIdx = () => Mutu.yIdx(DATA);
const {hasData, lastTW} = Mutu;
const targetNow = (i, tw) => Mutu.targetNow(DATA, i, tw);
const ratioAt = (i, tw) => Mutu.rasio(DATA, i, tw);
const capaian = i => Mutu.capaian(DATA, i);
function indStatus(i){
  if (!hasData(i)) return ["Belum ada data","neutral"];
  const r = ratioAt(i, lastTW(i));
  return r >= 1 ? ["Tercapai","ok"] : r >= 0.85 ? ["Mendekati","warn"] : ["Belum tercapai","bad"];
}
function fv(i, v){
  if (v == null) return "–";
  if (i.fmt === "rasio") return "1:" + fmt(v,0);
  return i.satuan === "%" ? fmt(v) + "%" : fmt(v) + " " + i.satuan;
}
const inds = () => DATA.indikator.filter(i => state.sasaran === "Semua" || i.sasaran === state.sasaran);

/* ---------- tindak lanjut & akreditasi ---------- */
const tlStatus = t => Mutu.tlStatus(t, TODAY);
const inScopeTL = t => state.prodi === "Semua" || t.prodi === state.prodi || t.prodi === "Fakultas";
const tls = () => DATA.tindak_lanjut.filter(inScopeTL);
const akrs = () => DATA.akreditasi.filter(a => state.prodi === "Semua" || a.prodi === state.prodi);
const allStd = a => Object.values(a.standar).flat();

/* ---------- chart helper ---------- */
function draw(id, cfg){
  if (charts[id]) charts[id].destroy();
  cfg.options = Object.assign({responsive:true, animation:false}, cfg.options);
  charts[id] = new Chart(document.getElementById(id).getContext("2d"), cfg);
}

/* ---------- tabel data ----------
 * Kolom: {key, label, w (px), num (angka: rata kanan, tabular), lengket (identitas, tetap di kiri),
 *         cell(r) -> isi, val(r) -> nilai urut, teks(r) -> teks lengkap untuk tooltip sel terpotong}.
 * opts: {satuan: "indikator", onrow, isSel, aksi: r => [{ikon, label, klik}]}
 */
const DENSITAS = {ringkas: "Ringkas", standar: "Standar", lega: "Lega"};
const densitas = () => { try { return DENSITAS[localStorage.getItem("portalMutu.densitas")] ? localStorage.getItem("portalMutu.densitas") : "standar"; } catch (e) { return "standar"; } };
const gulir = {};   // posisi gulir per tabel, dipertahankan saat render ulang / segar otomatis
// Di layar sempit kolom identitas dipersempit agar kolom lain tetap punya ruang untuk digulir.
const SEMPIT = matchMedia("(max-width: 640px)");
SEMPIT.addEventListener("change", () => { if (DATA) render(); });
const lebar = c => SEMPIT.matches && c.lengket && c.w > 150 ? 150 : c.w;

function table(host, id, cols, rows, opts){
  opts = opts || {};
  const s = state.sort[id] || (state.sort[id] = {key:null, dir:1});
  if (s.key) {
    const c = cols.find(c => c.key === s.key);
    rows = rows.slice().sort((a,b) => {
      const x = c.val ? c.val(a) : a[s.key], y = c.val ? c.val(b) : b[s.key];
      return ((x == null) - (y == null)) || (x > y ? 1 : x < y ? -1 : 0) * s.dir;
    });
  }
  // Offset kiri untuk kolom lengket dihitung dari lebar kolom sebelumnya.
  let kiri = 0;
  const lengket = cols.filter(c => c.lengket);
  cols.forEach(c => { if (c.lengket) { c._kiri = kiri; kiri += lebar(c); } });
  const kelas = c => [c.num ? "num" : "", c.lengket ? "lengket" : "", c === lengket[lengket.length - 1] ? "lengket-akhir" : ""].filter(Boolean).join(" ");
  const gaya = c => c.lengket ? "left:" + c._kiri + "px" : null;
  const attr = (c, extra) => { const o = Object.assign({class: kelas(c)}, extra); const g = gaya(c); if (g) o.style = g; return o; };

  const colgroup = h("colgroup", null, cols.map(c => h("col", {style:"width:" + lebar(c) + "px"})), opts.aksi ? h("col", {style:"width:" + (opts.aksiW || 104) + "px"}) : []);
  const head = h("tr", null, cols.map(c => {
    const aktif = s.key === c.key;
    const th = h("th", attr(c, {scope:"col", title:c.judul || c.label}),
      h("button", {type:"button", onclick(){ s.dir = s.key === c.key ? -s.dir : 1; s.key = c.key; render(); }},
        h("span", null, c.label), h("i", {class:"bi " + (aktif ? (s.dir > 0 ? "bi-caret-up-fill" : "bi-caret-down-fill") : "bi-chevron-expand"), "aria-hidden":"true"})));
    if (aktif) th.setAttribute("aria-sort", s.dir > 0 ? "ascending" : "descending");
    return th;
  }), opts.aksi ? h("th", {class:"aksi", scope:"col"}, h("span", {class:"visually-hidden"}, "Aksi")) : []);

  const body = rows.map(r => {
    const tr = h("tr", opts.onrow ? {class:"klik" + (opts.isSel && opts.isSel(r) ? " sel" : "")} : null);
    if (opts.onrow) tr.addEventListener("click", e => { if (!e.target.closest(".aksi")) opts.onrow(r); });
    cols.forEach(c => {
      const isi = c.cell ? c.cell(r) : r[c.key];
      const td = h("td", attr(c), isi);
      // Sel terpotong tetap terbaca utuh lewat tooltip.
      const teks = c.teks ? c.teks(r) : (typeof isi === "string" || typeof isi === "number") ? String(isi) : null;
      if (teks && !c.num) td.title = teks;
      tr.append(td);
    });
    if (opts.aksi) tr.append(h("td", {class:"aksi"}, h("div", {class:"aksi-isi"},
      opts.aksi(r).map(a => h("button", {type:"button", title:a.label, "aria-label":a.label, onclick(e){ e.stopPropagation(); a.klik(r); }}, h("i", {class:"bi " + a.ikon, "aria-hidden":"true"}))))));
    return tr;
  });

  const d = densitas();
  const alat = h("div", {class:"tbl-alat"},
    h("span", {class:"tbl-jumlah"}, h("b", null, rows.length), " " + (opts.satuan || "baris")),
    h("div", {class:"densitas", role:"group", "aria-label":"Kepadatan baris"}, Object.entries(DENSITAS).map(([k, label]) =>
      h("button", {type:"button", "aria-pressed": String(k === d), onclick(){ try { localStorage.setItem("portalMutu.densitas", k); } catch (e) { /* abaikan */ } render(); }},
        h("i", {class:"bi " + {ringkas:"bi-list", standar:"bi-list-ul", lega:"bi-view-list"}[k], "aria-hidden":"true"}), label))));
  const wrap = h("div", {class:"tbl-wrap", "data-densitas":d, tabindex:"0", role:"region", "aria-label":(opts.judul || "Tabel") + ", gulir untuk melihat kolom lain"},
    // Lebar tabel = jumlah lebar kolom, supaya table-layout:fixed memotong teks panjang (bukan melebarkan kolom).
    h("table", {class:"tbl", style:"width:" + (cols.reduce((a, c) => a + lebar(c), 0) + (opts.aksi ? (opts.aksiW || 104) : 0)) + "px"}, colgroup, h("thead", null, head), h("tbody", null, body)));
  const tandaGulir = () => {
    wrap.classList.toggle("tergulir", wrap.scrollLeft > 0);
    wrap.classList.toggle("bisa-kanan", wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth - 1);
  };
  wrap.addEventListener("scroll", () => { gulir[id] = [wrap.scrollLeft, wrap.scrollTop]; tandaGulir(); }, {passive:true});
  document.getElementById(host).replaceChildren(alat, wrap);
  if (gulir[id]) { wrap.scrollLeft = gulir[id][0]; wrap.scrollTop = gulir[id][1]; }
  tandaGulir();
}

/* Angka dengan desimal sejajar: bagian bulat rata kanan, pecahan di slot selebar 3ch. */
function num(v, dec){
  if (v == null) return null;
  const t = Number(v).toLocaleString("id-ID", {minimumFractionDigits:dec, maximumFractionDigits:dec});
  const k = t.lastIndexOf(",");
  return h("span", {class:"n"}, h("span", {class:"i"}, k < 0 ? t : t.slice(0, k)), h("span", {class:"f"}, k < 0 ? "" : t.slice(k)));
}
/* Sel kosong selalu menjawab "kenapa kosong?". */
const kosong = (teks, alasan, ikon) => h("span", {class:"kosong", title:alasan}, ikon ? h("i", {class:"bi " + ikon, "aria-hidden":"true"}) : null, teks);
const desimal = i => Math.max(0, ...[i.baseline, ...i.target, ...(i.realisasi || [])].filter(v => v != null)
  .map(v => { const x = String(v).split(".")[1]; return x ? Math.min(2, x.length) : 0; }));
const tglID = iso => new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {day:"2-digit", month:"short", year:"numeric"});
const sisaHari = t => Math.round((new Date(t.tenggat + "T00:00:00") - new Date(TODAY + "T00:00:00")) / 86400000);

/* ---------- aksi baris ---------- */
let mDetail = null;
function detail(judul, pasangan){
  document.getElementById("md-judul").textContent = judul;
  document.getElementById("md-isi").replaceChildren(...pasangan.flatMap(([k, v, isNum]) => [h("dt", null, k), h("dd", isNum ? {class:"num"} : null, v == null || v === "" ? "–" : v)]));
  // Kembalikan fokus ke tombol asal setelah ditutup (Escape, X, atau klik luar).
  const asal = document.activeElement, el = document.getElementById("m-detail");
  el.addEventListener("hidden.bs.modal", () => { if (asal && asal.isConnected) asal.focus(); }, {once:true});
  (mDetail || (mDetail = new bootstrap.Modal(el))).show();
}
async function salin(teks, apa){
  try { await navigator.clipboard.writeText(teks); UI.toast(apa + " disalin ke clipboard.", "sukses", {lama:2500}); }
  catch (e) { UI.toast("Browser menolak akses clipboard. Salin manual dari jendela Detail.", "peringatan"); }
}

/* ---------- timeline & KPI ---------- */
function renderTimeline(){
  const yr = DATA.meta.tahun_berjalan;
  document.getElementById("timeline").replaceChildren(...DATA.milestone.map(m =>
    h("div", {class:"tl " + (m.tahun === yr ? "now" : m.tahun < yr ? "past" : "")}, h("b", null, m.tahun + (m.tahun === yr ? " · tahun berjalan" : "")), m.nama)));
}
function renderKPIs(){
  const R = Mutu.ringkas(DATA), yr = DATA.meta.tahun_berjalan;
  const pctSesuai = R.ikssTerisi ? R.ikssSesuai / R.ikssTerisi * 100 : null;
  // [label, nilai, keterangan, ikon, nada]; nada status selalu disertai keterangan teks.
  const cards = [
    ["Indikator sesuai target", pctSesuai != null ? fmt(pctSesuai, 0) + "%" : "–", R.ikssSesuai + " dari " + R.ikssTerisi + " yang sudah terisi", "bi-bullseye", pctSesuai == null ? "netral" : kindOf(pctSesuai)],
    ["Capaian rata-rata IKSS", fmt(R.capaianRata, 0) + "%", "terhadap target " + yr, "bi-speedometer2", "utama"],
    ["Indikator belum terisi", R.ikssTotal - R.ikssTerisi, "dari " + R.ikssTotal + " IKSS (pengukuran tahunan)", "bi-hourglass-split", "netral"],
    ["Tindak lanjut selesai", R.tlTotal ? fmt(R.tlSelesai / R.tlTotal * 100, 0) + "%" : "–", R.tlSelesai + " dari " + R.tlTotal + " temuan", "bi-check2-circle", "ok"],
    ["Tindak lanjut terlambat", R.tlTerlambat, R.tlTerlambat ? "melewati tenggat, belum selesai" : "tidak ada yang terlambat", "bi-alarm", R.tlTerlambat ? "bad" : "ok"],
    ["Prodi akreditasi Unggul", R.prodiUnggul + " / " + R.prodiTotal, R.p6Target != null ? "target " + yr + ": " + R.p6Target + "% (≥ " + R.p6Butuh + " prodi)" : "", "bi-award", R.p6Butuh != null && R.prodiUnggul < R.p6Butuh ? "warn" : "ok"],
  ];
  document.getElementById("kpis").replaceChildren(...cards.map(c =>
    h("div",{class:"kpi"},
      h("span",{class:"kpi-ikon t-"+c[4],"aria-hidden":"true"}, h("i",{class:"bi "+c[3]})),
      h("div",{class:"kpi-isi"}, h("div",{class:"l"},c[0]), h("div",{class:"v"},c[1]), h("div",{class:"s"},c[2])))));
}

/* ---------- tab: indikator ---------- */
function renderIndikator(){
  const I = inds(), tw = DATA.meta.triwulan_berjalan;
  const sasarans = DATA.sasaran.filter(s => I.some(i => i.sasaran === s.kode && hasData(i)));
  const labels = Array.from({length: tw}, (_, k) => "TW" + (k+1));
  draw("c-trend", {type:"line", data:{labels, datasets: sasarans.map((s,k) => ({
    label:s.kode, borderColor:PAL[k%PAL.length], backgroundColor:PAL[k%PAL.length], tension:.3, pointRadius:3,
    data: labels.map((_, t) => Math.round(avg(I.filter(i => i.sasaran === s.kode && hasData(i) && i.realisasi[t] != null).map(i => Math.min(ratioAt(i, t), 1.2) * 100))))
  }))}, options:{scales:{y:{suggestedMin:50,suggestedMax:120}}}});

  const vals = sasarans.map(s => avg(I.filter(i => i.sasaran === s.kode && hasData(i)).map(capaian)));
  draw("c-sasaran", {type:"bar", data:{labels:sasarans.map(s=>s.kode), datasets:[{label:"Capaian (%)", data:vals.map(v=>Math.round(v)),
    backgroundColor: vals.map(v => v>=100 ? "#15803d" : v>=85 ? "#d97706" : "#b91c1c")}]},
    options:{plugins:{legend:{display:false}, tooltip:{callbacks:{title:c=>{const s=DATA.sasaran.find(x=>x.kode===c[0].label);return s?s.kode+": "+s.nama:c[0].label;}}}}, scales:{y:{suggestedMax:120}}}});

  const K = DATA.indikator.filter(i => i.kelompok === "kepuasan");
  draw("c-kepuasan", {type:"bar", data:{labels:K.map(i=>i.label), datasets:[
    {label:"Target "+DATA.meta.tahun_berjalan, data:K.map(i=>i.target[yIdx()]), backgroundColor:"#94a3b8"},
    {label:"Realisasi terkini", data:K.map(i=>hasData(i)?i.realisasi[lastTW(i)]:null), backgroundColor:"#15803d"}]},
    options:{scales:{y:{min:0,max:4}}}});

  const sel = DATA.indikator.find(i => i.id === state.sel) || I[0];
  if (sel) {
    state.sel = sel.id;
    const yrs = ["2025", ...DATA.meta.tahun_target.map(String)];
    const real = yrs.map((y, k) => (k - 1 === yIdx() && hasData(sel)) ? sel.realisasi[lastTW(sel)] : null);
    document.getElementById("traj-title").textContent = sel.program + ": " + sel.nama;
    draw("c-traj", {type:"line", data:{labels:yrs, datasets:[
      {label:"Baseline → Target", data:[sel.baseline, ...sel.target], borderColor:"#15803d", backgroundColor:"#15803d", spanGaps:true, tension:.2, pointRadius:4},
      {label:"Realisasi terkini", data:real, borderColor:"#d97706", backgroundColor:"#d97706", pointRadius:8, pointStyle:"rectRot", showLine:false}]}});
  }

  const yr = DATA.meta.tahun_berjalan;
  const twPembanding = i => hasData(i) ? lastTW(i) : tw - 1;
  const pembanding = i => i.tipe === "kumulatif" ? targetNow(i, twPembanding(i)) : i.target[yIdx()];
  const satuanTeks = i => i.fmt === "rasio" ? "rasio 1 : n" : i.satuan;
  const nilai = (i, v) => i.fmt === "rasio" ? fmt(v, 0) : fmt(v, desimal(i));
  const ringkasIKSS = i => [i.program + " · " + i.nama, "Satuan: " + satuanTeks(i), "Baseline 2025: " + (i.baseline == null ? "tidak tercantum" : nilai(i, i.baseline)),
    "Target " + yr + ": " + nilai(i, i.target[yIdx()]), "Realisasi: " + (hasData(i) ? nilai(i, i.realisasi[lastTW(i)]) + " (TW" + (lastTW(i) + 1) + ")" : "belum diisi"),
    "Capaian: " + (hasData(i) ? fmt(capaian(i), 0) + "%" : "menunggu data"), "Status: " + indStatus(i)[0]].join("\n");
  table("t-ind","ind",[
    {key:"program", label:"Prog.", w:66, lengket:true, cell:i=>h("span",{class:"kode"},i.program), teks:i=>i.program+": "+i.program_nama},
    {key:"nama", label:"IKSS", w:330, lengket:true, cell:i=>i.nama},
    {key:"sasaran", label:"SS", w:58},
    {key:"iku", label:"IKU", w:72, cell:i=>i.iku.replace("IKU ","IKU ")},
    {key:"satuan", label:"Satuan", w:116, cell:i=>h("span",{class:"redup"},satuanTeks(i)), teks:satuanTeks, val:satuanTeks},
    {key:"baseline", label:"Baseline 2025", w:116, num:true, val:i=>i.baseline,
      cell:i=>i.baseline == null ? kosong("tidak tercantum","Baseline 2025 tidak dicantumkan di Tabel 6 Renstra") : num(i.baseline, desimal(i))},
    {key:"target", label:"Target "+yr, w:104, num:true, val:i=>i.target[yIdx()], cell:i=>num(i.target[yIdx()], desimal(i))},
    {key:"pembanding", label:"Pembanding", w:116, num:true, val:pembanding,
      judul:"Target yang dipakai menghitung capaian: target tahunan, atau target pro-rata triwulan untuk indikator kumulatif",
      cell:i=>{ const n = num(pembanding(i), Math.max(desimal(i), i.tipe === "kumulatif" ? 2 : 0)); if (i.tipe === "kumulatif") n.title = "Pro-rata TW" + (twPembanding(i)+1) + " dari target tahunan"; return n; }},
    {key:"real", label:"Realisasi", w:104, num:true, val:i=>hasData(i)?i.realisasi[lastTW(i)]:null,
      cell:i=>hasData(i) ? num(i.realisasi[lastTW(i)], desimal(i)) : kosong("menunggu", "Diukur " + i.periode_ukur.toLowerCase() + "; diisi setelah pengukuran", "bi-hourglass-split")},
    {key:"capaian", label:"Capaian", w:96, num:true, val:capaian,
      cell:i=>hasData(i) ? h("span",{class:"n"},h("span",{class:"i"},fmt(capaian(i),0)),h("span",{class:"f"},"%")) : kosong("—","Capaian dihitung setelah realisasi diisi")},
    {key:"status", label:"Status", w:132, cell:i=>{const s=indStatus(i);return badge(s[0],s[1]);}, val:i=>indStatus(i)[0], teks:i=>indStatus(i)[0]},
  ], I, {judul:"Tabel IKSS", satuan:"indikator", aksiW:112, onrow:i=>{state.sel=i.id;render();}, isSel:i=>i.id===state.sel,
    aksi:i=>[
      {ikon:"bi-graph-up", label:"Tampilkan lintasan target", klik:i=>{ state.sel=i.id; render(); document.getElementById("c-traj").scrollIntoView({behavior:"smooth", block:"center"}); }},
      {ikon:"bi-card-text", label:"Detail indikator", klik:i=>detail(i.program + " · " + i.nama, [
        ["Program", i.program + ": " + i.program_nama], ["Sasaran", i.sasaran], ["IKU", i.iku + (i.iku_dikti ? " · " + i.iku_dikti : "")],
        ["Satuan", satuanTeks(i)], ["Arah", i.arah === "turun" ? "Turun (makin kecil makin baik)" : "Naik"], ["Tipe", i.tipe + " · diukur " + i.periode_ukur.toLowerCase()],
        ["Baseline 2025", i.baseline == null ? "Tidak tercantum di Renstra" : nilai(i, i.baseline), true],
        ["Target 2026-2030", i.target.map(v => nilai(i, v)).join(" → "), true],
        ["Realisasi per TW", hasData(i) ? i.realisasi.map((v, k) => "TW" + (k+1) + ": " + nilai(i, v)).join(" · ") : "Belum diisi (" + i.periode_ukur.toLowerCase() + ")", true],
        ["Capaian", hasData(i) ? fmt(capaian(i), 0) + "% · " + indStatus(i)[0] : "Menunggu data", true]])},
      {ikon:"bi-clipboard", label:"Salin ringkasan", klik:i=>salin(ringkasIKSS(i), "Ringkasan " + i.program)},
    ]});

  const c = DATA.catatan_validasi || [];
  document.getElementById("validasi").replaceChildren(c.length ? h("div",{class:"callout"}, h("ul",null,c.map(x=>h("li",null,x)))) : "Tidak ada catatan.");
}

/* ---------- tab: tindak lanjut ---------- */
function renderTindak(){
  const T = tls(), order = ["Selesai","Berjalan","Belum mulai","Terlambat"];
  const count = (list, s) => list.filter(t => tlStatus(t) === s).length;
  draw("c-tl-status", {type:"doughnut", data:{labels:order, datasets:[{data:order.map(s=>count(T,s)), backgroundColor:order.map(s=>STAT_COL[s])}]},
    options:{plugins:{legend:{position:"bottom"}}}});
  const sumbers = [...new Set(T.map(t=>t.sumber))];
  draw("c-tl-sumber", {type:"bar", data:{labels:sumbers, datasets:order.map(s => ({label:s, backgroundColor:STAT_COL[s], data:sumbers.map(x => count(T.filter(t=>t.sumber===x), s))}))},
    options:{scales:{x:{stacked:true},y:{stacked:true,ticks:{precision:0}}}}});
  const nadaTL = st => st==="Selesai"?"ok":st==="Terlambat"?"bad":st==="Berjalan"?"warn":"neutral";
  const ringkasTL = t => [t.id + " · " + t.temuan, "Unit: " + t.prodi, "Sumber: " + t.sumber, "Rujukan: " + t.rujukan, "PIC: " + t.pic,
    "Tenggat: " + tglID(t.tenggat), "Progres: " + t.progres + "%", "Evidence: " + (t.evidence ? "ada" : "belum"), "Status: " + tlStatus(t)].join("\n");
  table("t-tl","tl",[
    {key:"id", label:"ID", w:78, lengket:true, cell:t=>h("span",{class:"kode"},t.id)},
    {key:"temuan", label:"Temuan", w:340, lengket:true},
    {key:"prodi", label:"Unit", w:150},
    {key:"sumber", label:"Sumber", w:156},
    {key:"pic", label:"PIC", w:180},
    {key:"rujukan", label:"Rujukan", w:176, cell:t=>h("span",{class:"redup"},t.rujukan), teks:t=>t.rujukan},
    {key:"tenggat", label:"Tenggat", w:116, num:true, cell:t=>tglID(t.tenggat)},
    {key:"sisa", label:"Sisa hari", w:96, num:true, judul:"Hari menuju tenggat; negatif berarti terlambat",
      val:t=>t.status==="Selesai"?null:sisaHari(t),
      cell:t=>{ if (t.status==="Selesai") return kosong("selesai","Sudah selesai; tenggat tidak berlaku lagi");
        const d = sisaHari(t); return h("span",{class:d<0?"negatif":"",title:d<0?"Terlambat "+(-d)+" hari":d+" hari lagi"}, d<0?"−"+fmt(-d,0):fmt(d,0)); }},
    {key:"progres", label:"Progres", w:132, num:true, cell:t=>h("span",{class:"prog"},h("span",{class:"bar","aria-hidden":"true"},h("i",{style:"width:"+t.progres+"%"})),h("span",{class:"n"},h("span",{class:"i"},t.progres),h("span",{class:"f"},"%")))},
    {key:"evidence", label:"Evidence", w:100, cell:t=>t.evidence?badge("Ada","ok"):badge("Belum","warn"), val:t=>t.evidence?1:0, teks:t=>t.evidence?"Evidence ada":"Evidence belum diunggah"},
    {key:"status", label:"Status", w:120, cell:t=>{const st=tlStatus(t);return badge(st,nadaTL(st));}, val:tlStatus, teks:tlStatus},
  ], T, {judul:"Tabel tindak lanjut", satuan:"temuan", aksiW:84, aksi:t=>[
    {ikon:"bi-card-text", label:"Detail temuan", klik:t=>{ const d = sisaHari(t); detail(t.id + " · " + t.sumber, [
      ["Temuan", t.temuan], ["Unit", t.prodi], ["Sumber", t.sumber], ["Rujukan", t.rujukan], ["PIC", t.pic],
      ["Tenggat", tglID(t.tenggat) + (t.status==="Selesai" ? "" : d < 0 ? " · terlambat " + (-d) + " hari" : " · " + d + " hari lagi"), true],
      ["Progres", t.progres + "%", true], ["Evidence", t.evidence ? "Ada" : "Belum diunggah"], ["Status", tlStatus(t)]]); }},
    {ikon:"bi-clipboard", label:"Salin ringkasan", klik:t=>salin(ringkasTL(t), "Ringkasan " + t.id)},
  ]});
}

/* ---------- tab: akreditasi ---------- */
function renderAkreditasi(){
  const A = akrs();
  document.getElementById("akr-cards").replaceChildren(...A.map(a => {
    const ev = avg(allStd(a).map(x => x.evidence_pct));
    return h("div",{class:"card prodi-card"},
      h("h4",null,a.prodi),
      h("div",{style:"margin:8px 0 4px"}, "Peringkat: ", badge(a.peringkat_saat_ini, a.peringkat_saat_ini==="Unggul"?"ok":"neutral"), " → target ", badge(a.peringkat_target,"ok")),
      h("div",{class:"m"},"Progres penyusunan LED: "+a.led_progres+"%"), h("div",{class:"bar"},h("i",{style:"width:"+a.led_progres+"%"})),
      h("div",{class:"m"},"Kelengkapan evidence rata-rata (36 standar): "+fmt(ev,0)+"%"), h("div",{class:"bar"},h("i",{style:"width:"+ev+"%"})));
  }));

  const all = DATA.akreditasi, p6 = DATA.indikator.find(i => i.kunci === "akreditasi_unggul");
  const unggul = all.filter(a => a.peringkat_saat_ini === "Unggul").length, pct = all.length ? unggul / all.length * 100 : 0;
  const alert = document.getElementById("akr-alert"); alert.replaceChildren();
  if (p6) {
    const t = p6.target[yIdx()], need = Math.round(t / 100 * all.length);
    if (unggul < need) alert.append(h("div",{class:"callout bad",style:"margin-bottom:16px"},
      "Target IKSS P6 tahun "+DATA.meta.tahun_berjalan+" adalah "+t+"% prodi Unggul (setara minimal "+need+" dari "+all.length+" prodi). Saat ini baru "+unggul+" prodi. Selisih "+(need-unggul)+" prodi; prioritaskan konsolidasi evidence dan pengajuan reakreditasi."));
    const yrs = ["2025", ...DATA.meta.tahun_target.map(String)];
    draw("c-akr-traj", {type:"line", data:{labels:yrs, datasets:[
      {label:"Target P6", data:[p6.baseline, ...p6.target], borderColor:"#15803d", backgroundColor:"#15803d", tension:.2, pointRadius:4},
      {label:"Kondisi saat ini", data:yrs.map((y,k)=>k-1===yIdx()?Math.round(pct):null), borderColor:"#b91c1c", backgroundColor:"#b91c1c", pointRadius:8, pointStyle:"rectRot", showLine:false}]},
      options:{scales:{y:{min:0,max:100}}}});
  }

  const key = state.standar, names = DATA.akreditasi[0].standar[key].map(x => x.nama);
  const vals = names.map((_, k) => avg(A.map(a => a.standar[key][k].evidence_pct)));
  draw("c-standar", {type:"bar", data:{labels:names.map((n,k)=>(k+1)), datasets:[{label:"Evidence (%)", data:vals.map(v=>Math.round(v)),
    backgroundColor:vals.map(v=>v>=80?"#15803d":v>=65?"#d97706":"#b91c1c")}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{title:c=>(c[0].dataIndex+1)+". "+names[c[0].dataIndex]}}},scales:{y:{min:0,max:100}}}});
  const lemah = names.map((n,k)=>({n,v:vals[k]})).sort((a,b)=>a.v-b.v).slice(0,3);
  document.getElementById("akr-callout").replaceChildren(h("div",{class:"callout"},
    "Evidence paling lemah: ", lemah.map(x => x.n+" ("+Math.round(x.v)+"%)").join("; ")));
}

/* ---------- shell ---------- */
function setupFilters(){
  const fp = document.getElementById("f-prodi"), fs = document.getElementById("f-sasaran");
  fp.replaceChildren(...["Semua", ...DATA.prodi.map(p=>p.nama)].map(x=>h("option",{value:x},x)));
  fs.replaceChildren(h("option",{value:"Semua"},"Semua sasaran"), ...DATA.sasaran.map(s=>h("option",{value:s.kode},s.kode+" · "+s.nama)));
  fp.value = state.prodi; fs.value = state.sasaran;
}
function render(){
  document.getElementById("judul").textContent = DATA.meta.judul;
  document.getElementById("subjudul").textContent = DATA.meta.subjudul;
  document.getElementById("sapa").textContent = "Selamat Datang Kembali, " + SESI.nama;
  const b = document.getElementById("banner");
  b.classList.toggle("hidden", !DATA.meta.data_contoh);
  b.textContent = "Target dan baseline bersumber dari Renstra (SK Dekan No. 67/UN16.15.D/KPT/VIII/2026). Realisasi, status tindak lanjut, dan nilai evidence masih DATA CONTOH: unggah data GKM/GPM lewat menu Pengaturan > Data Dashboard sebelum dipakai untuk keputusan.";
  renderTimeline(); renderKPIs();
  for (const t of TABS) document.getElementById("tab-"+t).classList.toggle("hidden", state.tab !== t);
  document.querySelectorAll("#tabs button").forEach(x => x.setAttribute("aria-selected", x.dataset.tab === state.tab));
  document.getElementById("lbl-sasaran").classList.toggle("hidden", state.tab !== "indikator");
  document.getElementById("lbl-prodi").classList.toggle("hidden", state.tab === "indikator");
  document.getElementById("f-standar").value = state.standar;
  if (state.tab === "indikator") renderIndikator();
  if (state.tab === "tindak") renderTindak();
  if (state.tab === "akreditasi") renderAkreditasi();
  document.getElementById("foot").textContent = "Rujukan: " + DATA.meta.rujukan + " · sumber data: " + sumber + " · diperbarui " + DATA.meta.diperbarui + " · disegarkan otomatis tiap 60 detik";
}
async function load(){
  const first = !DATA;
  try {
    DATA = await Auth.muatMutu(first ? t => UI.loader.pesan(TAHAP[t]) : undefined);
    // GKM prodi langsung melihat prodinya sendiri; filter tetap bisa diubah.
    if (first && SESI.prodi && DATA.prodi.some(p => p.nama === SESI.prodi)) state.prodi = SESI.prodi;
  } catch (e) {
    if (!DATA) {
      const b = document.getElementById("banner");
      b.classList.remove("hidden");
      b.textContent = "Data tidak dapat dibuka: " + e.message + ". Coba keluar lalu masuk kembali; bila tetap gagal, hubungi admin GPM.";
      UI.loader.sembunyi();
    }
    return;
  }
  if (first) UI.loader.pesan("Menyusun grafik dan tabel…");
  setupFilters(); render();
  if (first) UI.loader.sembunyi(1000);
}
document.getElementById("f-prodi").addEventListener("change", e => { state.prodi = e.target.value; render(); });
document.getElementById("f-sasaran").addEventListener("change", e => { state.sasaran = e.target.value; state.sel = null; render(); });
document.getElementById("f-standar").addEventListener("change", e => { state.standar = e.target.value; render(); });
document.getElementById("tabs").addEventListener("click", e => {
  const btn = e.target.closest("[data-tab]"), t = btn && btn.dataset.tab;
  if (!t) return;
  state.tab = t; history.replaceState(null, "", "#" + t); render();
  dispatchEvent(new HashChangeEvent("hashchange"));   // agar sorotan submenu sidebar ikut berpindah
});
addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS.includes(t) && DATA && state.tab !== t) { state.tab = t; render(); } });

(async function mulai(){
  try { SESI = await Auth.wajib(); } catch (e) { return; }   // dialihkan ke halaman masuk
  UI.kerangka(SESI);
  UI.jagaSesi();
  await load();
  setInterval(load, 60000);
})();
