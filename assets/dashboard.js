"use strict";
const SESI = Auth.wajib();
Auth.bilah(SESI, "dashboard.html");
let DATA = null, sumber = "data/mutu.enc.json";
const charts = {};
const TABS = ["indikator","tindak","akreditasi"];
const state = {prodi:"Semua", sasaran:"Semua", tab:TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "indikator", standar:"pendidikan", sel:null, sort:{}};
const PAL = ["#15803d","#2563eb","#d97706","#7c3aed","#db2777","#0891b2"];
const STAT_COL = {"Selesai":"#15803d","Berjalan":"#2563eb","Belum mulai":"#94a3b8","Terlambat":"#b91c1c"};
const TODAY = new Date().toISOString().slice(0,10);

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
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const badge = (text, kind) => h("span", {class:"badge b-"+kind}, text);
const kindOf = p => p >= 100 ? "ok" : p >= 85 ? "warn" : "bad";

/* ---------- indikator ---------- */
const yIdx = () => DATA.meta.tahun_target.indexOf(DATA.meta.tahun_berjalan);
const hasData = i => Array.isArray(i.realisasi) && i.realisasi.length > 0;
const lastTW = i => i.realisasi.length - 1;
function targetNow(i, tw){
  const t = i.target[yIdx()];
  return i.tipe === "kumulatif" ? t * (tw + 1) / 4 : t;
}
function ratioAt(i, tw){
  const v = i.realisasi[tw], t = targetNow(i, tw);
  if (i.arah === "turun") return t === 0 ? (v === 0 ? 1 : 0) : (v === 0 ? 1.2 : t / v);
  return t === 0 ? (v > 0 ? 1.2 : 0) : v / t;
}
const capaian = i => hasData(i) ? Math.min(ratioAt(i, lastTW(i)), 1.2) * 100 : null;
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
const indAll = () => DATA.indikator;
const inds = () => DATA.indikator.filter(i => state.sasaran === "Semua" || i.sasaran === state.sasaran);

/* ---------- tindak lanjut & akreditasi ---------- */
const tlStatus = t => t.status !== "Selesai" && t.tenggat < TODAY ? "Terlambat" : t.status;
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

/* ---------- sortable table ---------- */
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
  const head = h("tr", null, cols.map(c => h("th", {onclick(){ s.dir = s.key === c.key ? -s.dir : 1; s.key = c.key; render(); }}, c.label + (s.key === c.key ? (s.dir > 0 ? " ▲" : " ▼") : ""))));
  const body = rows.map(r => {
    const attrs = {};
    if (opts.onrow) { attrs.class = "clickable" + (opts.isSel && opts.isSel(r) ? " sel" : ""); attrs.onclick = () => opts.onrow(r); }
    return h("tr", attrs, cols.map(c => h("td", null, c.cell ? c.cell(r) : r[c.key])));
  });
  document.getElementById(host).replaceChildren(h("table", null, h("thead", null, head), h("tbody", null, body)));
}

/* ---------- timeline & KPI ---------- */
function renderTimeline(){
  const yr = DATA.meta.tahun_berjalan;
  document.getElementById("timeline").replaceChildren(...DATA.milestone.map(m =>
    h("div", {class:"tl " + (m.tahun === yr ? "now" : m.tahun < yr ? "past" : "")}, h("b", null, m.tahun + (m.tahun === yr ? " · tahun berjalan" : "")), m.nama)));
}
function renderKPIs(){
  const I = indAll(), withData = I.filter(hasData), T = DATA.tindak_lanjut, A = DATA.akreditasi;
  const ok = withData.filter(i => ratioAt(i, lastTW(i)) >= 1).length;
  const tuntas = T.filter(t => t.status === "Selesai").length;
  const telat = T.filter(t => tlStatus(t) === "Terlambat").length;
  const unggul = A.filter(a => a.peringkat_saat_ini === "Unggul").length;
  const p6 = I.find(i => i.kunci === "akreditasi_unggul");
  const p6t = p6 ? p6.target[yIdx()] : null;
  const need = p6t != null ? Math.round(p6t / 100 * A.length) : null;
  const cards = [
    ["Indikator sesuai target", withData.length ? fmt(ok / withData.length * 100, 0) + "%" : "–", ok + " dari " + withData.length + " yang sudah terisi"],
    ["Capaian rata-rata IKSS", fmt(avg(withData.map(capaian)), 0) + "%", "terhadap target " + DATA.meta.tahun_berjalan],
    ["Indikator belum terisi", I.length - withData.length, "dari " + I.length + " IKSS (pengukuran tahunan)"],
    ["Tindak lanjut selesai", T.length ? fmt(tuntas / T.length * 100, 0) + "%" : "–", tuntas + " dari " + T.length + " temuan"],
    ["Tindak lanjut terlambat", telat, "melewati tenggat, belum selesai"],
    ["Prodi akreditasi Unggul", unggul + " / " + A.length, need != null ? "target " + DATA.meta.tahun_berjalan + ": " + p6t + "% (≥ " + need + " prodi)" : ""],
  ];
  document.getElementById("kpis").replaceChildren(...cards.map(c =>
    h("div",{class:"kpi"}, h("div",{class:"l"},c[0]), h("div",{class:"v"},c[1]), h("div",{class:"s"},c[2]))));
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

  table("t-ind","ind",[
    {key:"sasaran",label:"SS"},{key:"program",label:"Program"},
    {key:"nama",label:"IKSS",cell:i=>h("span",{title:i.program_nama},i.nama)},{key:"iku",label:"IKU"},
    {key:"baseline",label:"Baseline 2025",cell:i=>fv(i,i.baseline),val:i=>i.baseline},
    {key:"target",label:"Target "+DATA.meta.tahun_berjalan,cell:i=>{const t=i.target[yIdx()];return i.tipe==="kumulatif"&&hasData(i)?fv(i,t)+" (pro-rata TW"+(lastTW(i)+1)+": "+fv(i,targetNow(i,lastTW(i)))+")":fv(i,t);},val:i=>i.target[yIdx()]},
    {key:"real",label:"Realisasi",cell:i=>hasData(i)?fv(i,i.realisasi[lastTW(i)]):"Belum diisi ("+i.periode_ukur.toLowerCase()+")",val:i=>hasData(i)?i.realisasi[lastTW(i)]:null},
    {key:"capaian",label:"Capaian",cell:i=>hasData(i)?fmt(capaian(i),0)+"%":"–",val:capaian},
    {key:"status",label:"Status",cell:i=>{const s=indStatus(i);return badge(s[0],s[1]);},val:i=>indStatus(i)[0]},
  ], I, {onrow:i=>{state.sel=i.id;render();}, isSel:i=>i.id===state.sel});

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
  table("t-tl","tl",[
    {key:"id",label:"ID"},{key:"prodi",label:"Unit"},{key:"sumber",label:"Sumber"},{key:"temuan",label:"Temuan"},{key:"rujukan",label:"Rujukan"},{key:"pic",label:"PIC"},
    {key:"tenggat",label:"Tenggat"},
    {key:"progres",label:"Progres",cell:t=>h("div",null,t.progres+"%",h("div",{class:"bar"},h("i",{style:"width:"+t.progres+"%"})))},
    {key:"evidence",label:"Evidence",cell:t=>t.evidence?badge("Ada","ok"):badge("Belum","warn"),val:t=>t.evidence?1:0},
    {key:"status",label:"Status",cell:t=>{const s=tlStatus(t);return badge(s,s==="Selesai"?"ok":s==="Terlambat"?"bad":s==="Berjalan"?"warn":"neutral");},val:tlStatus},
  ], T);
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
  const b = document.getElementById("banner");
  b.classList.toggle("hidden", !DATA.meta.data_contoh);
  b.textContent = "Target dan baseline bersumber dari Renstra (SK Dekan No. 67/UN16.15.D/KPT/VIII/2026). Realisasi, status tindak lanjut, dan nilai evidence masih DATA CONTOH: ganti isi sumber/mutu.json dengan data GKM/GPM lalu enkripsi ulang sebelum dipakai untuk keputusan.";
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
  try {
    const first = !DATA;
    DATA = await Auth.muatMutu();
    // GKM prodi langsung melihat prodinya sendiri; filter tetap bisa diubah.
    if (first && SESI.prodi && DATA.prodi.some(p => p.nama === SESI.prodi)) state.prodi = SESI.prodi;
  } catch (e) {
    if (!DATA) {
      const b = document.getElementById("banner");
      b.classList.remove("hidden");
      b.textContent = "Data tidak dapat dibuka: " + e.message + ". Coba keluar lalu masuk kembali; bila tetap gagal, hubungi admin GPM.";
    }
    return;
  }
  setupFilters(); render();
}
document.getElementById("f-prodi").addEventListener("change", e => { state.prodi = e.target.value; render(); });
document.getElementById("f-sasaran").addEventListener("change", e => { state.sasaran = e.target.value; state.sel = null; render(); });
document.getElementById("f-standar").addEventListener("change", e => { state.standar = e.target.value; render(); });
document.getElementById("tabs").addEventListener("click", e => { const t = e.target.dataset && e.target.dataset.tab; if (t) { state.tab = t; history.replaceState(null, "", "#" + t); render(); } });
addEventListener("hashchange", () => { const t = location.hash.slice(1); if (TABS.includes(t) && DATA) { state.tab = t; render(); } });
load();
setInterval(load, 60000);
