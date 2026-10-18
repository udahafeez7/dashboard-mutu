/* Portal Mutu FTI: komponen antarmuka bersama (loader, toast, logout, peringatan sesi).
 * Dimuat di awal <body> agar loader bisa tampil sebelum isi halaman terlihat.
 * Bootstrap JS (modal/toast) dipakai bila sudah dimuat; tanpa itu tetap ada jalur cadangan.
 */
"use strict";
const UI = (() => {
  const el = (tag, cls, teks) => { const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  const tunggu = ms => new Promise(r => setTimeout(r, ms));
  const HEMAT = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function logo(mode){
    const w = el("div", "pm-logo " + (mode || "main"));
    [["l-unand", "logo-unand.png", ""], ["l-mark", "logo-fti-mark.png", ""], ["l-teks", "logo-fti-teks.png", "Fakultas Teknologi Informasi Universitas Andalas"]]
      .forEach(([c, f, alt]) => { const i = el("img", c); i.src = "assets/img/" + f; i.alt = alt; w.append(i); });
    const k = el("span", "l-kilau"); k.setAttribute("aria-hidden", "true"); w.append(k);
    return w;
  }

  /* ---------- loader overlay ---------- */
  let L = null, mulaiL = 0;
  const loader = {
    tampil(judul, pesan, opts){
      opts = opts || {};
      if (!L) {
        L = el("div", "pm-loader"); L.setAttribute("role", "status"); L.setAttribute("aria-live", "polite");
        const c = el("div", "pm-loader-card");
        L._logo = logo(opts.logo || "main");
        L._judul = el("div", "pm-loader-judul"); L._pesan = el("div", "pm-loader-pesan");
        L._bar = el("div", "splash-bar indet"); L._bar.append(el("i"));
        L._ekstra = el("div");
        c.append(L._logo, L._judul, L._pesan, L._ekstra, L._bar); L.append(c);
        (document.body || document.documentElement).append(L);
        mulaiL = Date.now();
        requestAnimationFrame(() => requestAnimationFrame(() => L && L.classList.add("tampil")));
      }
      L._judul.textContent = judul || "";
      L._pesan.textContent = pesan || "";
    },
    pesan(t){ if (L) L._pesan.textContent = t; },
    progres(pct){ if (!L) return; L._bar.classList.remove("indet"); L._bar.firstChild.style.width = pct + "%"; },
    sukses(judul, pesan){
      if (!L) this.tampil(judul, pesan);
      L._judul.textContent = judul; L._pesan.textContent = pesan || "";
      L._bar.hidden = true;
      const c = el("div", "pm-cek"); c.append(el("i", "bi bi-check-lg")); L._ekstra.replaceChildren(c);
    },
    /* Sembunyikan setelah tampil minimal `min` ms supaya animasi tidak sekadar berkedip. */
    async sembunyi(min){
      if (!L) return;
      const sisa = (min || 0) - (Date.now() - mulaiL);
      if (sisa > 0 && !HEMAT) await tunggu(sisa);
      const x = L; L = null;
      x.classList.remove("tampil");
      setTimeout(() => x.remove(), 320);
    },
  };

  /* ---------- toast ---------- */
  let wadah = null;
  function toast(teks, jenis, opts){
    opts = opts || {};
    if (!wadah) {
      wadah = el("div", "toast-container position-fixed end-0 p-3");
      // di bawah bilah portal (bila ada) agar tombol Keluar tidak tertutup
      const bar = document.querySelector(".pbar");
      wadah.style.top = bar ? bar.getBoundingClientRect().height + "px" : "0";
      wadah.style.zIndex = 2100; document.body.append(wadah);
    }
    const ikon = {sukses: "bi-check-circle-fill text-success", info: "bi-info-circle-fill text-secondary", peringatan: "bi-exclamation-triangle-fill text-warning", galat: "bi-x-octagon-fill text-danger"}[jenis || "info"];
    const t = el("div", "toast toast-silver"); t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
    const head = el("div", "toast-header");
    head.append(el("i", "bi " + ikon + " me-2"), el("strong", "me-auto", opts.judul || "Portal Mutu FTI"));
    const x = el("button", "btn-close"); x.type = "button"; x.setAttribute("data-bs-dismiss", "toast"); x.setAttribute("aria-label", "Tutup");
    head.append(x);
    const body = el("div", "toast-body"); body.append(teks);
    if (opts.aksi) { const b = el("button", "btn btn-sm btn-silver mt-2 d-block", opts.aksi.label); b.type = "button"; b.addEventListener("click", opts.aksi.klik); body.append(b); }
    t.append(head, body); wadah.append(t);
    if (window.bootstrap) {
      const bt = new bootstrap.Toast(t, {autohide: opts.tetap ? false : true, delay: opts.lama || 4500});
      t.addEventListener("hidden.bs.toast", () => t.remove());
      bt.show();
      t._tutup = () => bt.hide();
    } else {
      t.classList.add("show");
      t._tutup = () => t.remove();
      x.addEventListener("click", t._tutup);
      if (!opts.tetap) setTimeout(t._tutup, opts.lama || 4500);
    }
    return t;
  }

  /* ---------- logout dengan konfirmasi ---------- */
  const jam = ms => new Date(ms).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit"});
  let sedangKeluar = false;
  async function prosesKeluar(){
    sedangKeluar = true;   // hentikan jagaSesi agar tidak salah mengira sesi kedaluwarsa
    const s = Auth.sesi();
    const nama = s ? s.nama.split(" ")[0] : "";
    loader.tampil("Mengakhiri sesi", "Menghapus kunci data dari browser…", {logo: "kilau-saja"});
    await tunggu(HEMAT ? 0 : 550);
    Auth.logout("Anda telah keluar dengan aman.");
    loader.pesan("Membersihkan data sesi…");
    await tunggu(HEMAT ? 0 : 450);
    loader.sukses("Sampai jumpa" + (nama ? ", " + nama : ""), "Sesi berakhir dengan aman.");
    await tunggu(HEMAT ? 200 : 750);
    location.replace("index.html");
  }
  let modal = null;
  function keluar(){
    if (!window.bootstrap) { prosesKeluar(); return; }
    const s = Auth.sesi();
    if (!modal) {
      const m = el("div", "modal fade modal-silver"); m.tabIndex = -1; m.setAttribute("aria-labelledby", "mk-judul"); m.setAttribute("aria-hidden", "true");
      m.innerHTML =
        '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
        '<div class="modal-body text-center p-4">' +
        '<span class="ikon mb-3"><i class="bi bi-box-arrow-right"></i></span>' +
        '<h2 class="h5 fw-bold mb-1" id="mk-judul">Keluar dari portal?</h2>' +
        '<p class="text-secondary small mb-3">Sesi Anda diakhiri dan kunci data dihapus dari browser ini.</p>' +
        '<div class="info text-start"><div><i class="bi bi-person-circle me-2"></i><span data-f="nama"></span></div>' +
        '<div><i class="bi bi-clock-history me-2"></i><span data-f="waktu"></span></div></div></div>' +
        '<div class="modal-footer justify-content-center gap-2 border-0 pt-0 pb-4">' +
        '<button type="button" class="btn btn-light border px-4" data-bs-dismiss="modal">Batal</button>' +
        '<button type="button" class="btn btn-silver px-4" data-f="ya"><i class="bi bi-box-arrow-right me-1"></i>Ya, keluar</button>' +
        "</div></div></div>";
      document.body.append(m);
      modal = new bootstrap.Modal(m);
      m.querySelector('[data-f="ya"]').addEventListener("click", () => {
        m.addEventListener("hidden.bs.modal", prosesKeluar, {once: true});
        modal.hide();
      });
      modal._el = m;
    }
    if (s) {
      modal._el.querySelector('[data-f="nama"]').textContent = s.nama + " (" + (Auth.PERAN[s.peran] || s.peran) + ")";
      modal._el.querySelector('[data-f="waktu"]').textContent = "Masuk pukul " + jam(s.mulai) + " · " + Math.max(1, Math.round((Date.now() - s.mulai) / 60000)) + " menit";
    }
    modal.show();
  }

  /* ---------- peringatan sesi hampir habis ---------- */
  function jagaSesi(){
    let t = null;
    setInterval(() => {
      if (sedangKeluar) return;
      if (!Auth.sesi()) {
        if (t) { t._tutup(); t = null; }
        loader.tampil("Sesi berakhir", "Mengalihkan ke halaman masuk…", {logo: "kilau-saja"});
        Auth.logout("Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.");
        setTimeout(() => location.replace("index.html"), 1200);
        return;
      }
      const r = Auth.sisa();
      if (r < 60000) {
        const teks = "Sesi akan berakhir dalam " + Math.max(0, Math.ceil(r / 1000)) + " detik karena tidak ada aktivitas.";
        if (!t) t = toast(teks, "peringatan", {judul: "Sesi hampir berakhir", tetap: true, aksi: {label: "Tetap masuk", klik(){ Auth.sentuh(); if (t) { t._tutup(); t = null; } toast("Sesi diperpanjang.", "sukses", {lama: 2500}); }}});
        else t.querySelector(".toast-body").firstChild.textContent = teks;
      } else if (t) { t._tutup(); t = null; }
    }, 1000);
  }

  /* Halaman terlindungi menandai <body data-loader="..."> agar loader muncul sebelum isi terlihat. */
  if (document.body && document.body.dataset.loader && Auth.sesi()) {
    loader.tampil(document.body.dataset.loader, "Memverifikasi sesi…");
    // Latar logo FTI untuk semua halaman di dalam portal.
    const latar = el("div", "latar-fti"); latar.setAttribute("aria-hidden", "true");
    const img = el("img"); img.src = "assets/img/logo-fti.png"; img.alt = "";
    latar.append(img);
    document.body.prepend(latar);
  }

  return {logo, loader, toast, keluar, jagaSesi, tunggu, HEMAT};
})();
