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
    loader.tampil("Mengakhiri sesi", "Menutup sesi di server…", {logo: "kilau-saja"});
    await Promise.all([Auth.logout("Anda telah keluar dengan aman."), tunggu(HEMAT ? 0 : 550)]);
    loader.pesan("Membersihkan data sesi di browser…");
    await tunggu(HEMAT ? 0 : 400);
    loader.sukses("Sampai jumpa" + (nama ? ", " + nama : ""), "Sesi berakhir dengan aman.");
    await tunggu(HEMAT ? 200 : 750);
    location.replace("/");
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
        '<p class="text-secondary small mb-3">Sesi Anda di server diakhiri; Anda perlu masuk lagi untuk membuka portal.</p>' +
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
    let t = null, berakhir = false;
    setInterval(async () => {
      if (sedangKeluar || berakhir) return;
      const r = Auth.sisa();
      const sb = document.getElementById("sb-sesi");
      if (sb) sb.textContent = r > 0 ? "Sesi berakhir dalam " + Math.max(1, Math.ceil(r / 60000)) + " menit" : "Sesi berakhir";
      if (r <= 0) {
        // Pastikan ke server: sesi mungkin masih hidup karena aktivitas di tab lain.
        try { await Auth.api("POST", "/api/sentuh"); const s = Auth.sesi(); if (s) { s.aktif = Date.now(); sessionStorage.setItem("portalMutu.sesi", JSON.stringify(s)); } return; }
        catch (e) { if (e.status !== 401) return; }
        berakhir = true;
        if (t) { t._tutup(); t = null; }
        loader.tampil("Sesi berakhir", "Mengalihkan ke halaman masuk…", {logo: "kilau-saja"});
        await Auth.logout("Sesi berakhir karena tidak ada aktivitas. Silakan masuk kembali.");
        setTimeout(() => location.replace("/?kembali=" + encodeURIComponent(location.pathname.split("/").pop() + location.hash)), 1200);
        return;
      }
      if (r < 60000) {
        const teks = "Sesi akan berakhir dalam " + Math.max(0, Math.ceil(r / 1000)) + " detik karena tidak ada aktivitas.";
        if (!t) t = toast(teks, "peringatan", {judul: "Sesi hampir berakhir", tetap: true, aksi: {label: "Tetap masuk", async klik(){
          try { await Auth.sentuh(); if (t) { t._tutup(); t = null; } toast("Sesi diperpanjang.", "sukses", {lama: 2500}); }
          catch (e) { toast(e.message, "galat"); }
        }}});
        else t.querySelector(".toast-body").firstChild.textContent = teks;
      } else if (t) { t._tutup(); t = null; }
    }, 1000);
  }

  /* ---------- kerangka: bilah atas + sidebar ----------
   * Menu disaring menurut peran. Server tetap menjaga setiap halaman dan API, jadi menyembunyikan
   * menu hanyalah kenyamanan, bukan pengamanan. */
  const MENU = [
    {judul: "Utama", item: [
      {href: "portal.html", label: "Beranda", ikon: "bi-house"},
      {href: "dashboard.html", label: "Dashboard Mutu", ikon: "bi-graph-up-arrow", anak: [
        {href: "dashboard.html#indikator", label: "Monitoring Indikator"},
        {href: "dashboard.html#tindak", label: "Tindak Lanjut"},
        {href: "dashboard.html#akreditasi", label: "Akreditasi"}]},
    ]},
    {judul: "Akun Saya", item: [
      {href: "akun-saya.html", label: "Profil Saya", ikon: "bi-person-circle"},
      {href: "akun-saya.html#sandi", label: "Ganti Password", ikon: "bi-key"},
    ]},
    {judul: "Manajemen Akun", peran: ["admin"], item: [
      {href: "kelola-akun.html", label: "Daftar Akun", ikon: "bi-people"},
      {href: "kelola-akun.html#daftar", label: "Pendaftaran Akun", ikon: "bi-person-plus"},
      {href: "kelola-akun.html#log", label: "Log Aktivitas", ikon: "bi-journal-text"},
    ]},
    {judul: "Pengaturan", peran: ["admin", "gpm"], item: [
      {href: "pengaturan.html", label: "Keamanan & Sesi", ikon: "bi-shield-lock", peran: ["admin"]},
      {href: "pengaturan.html#data", label: "Data Dashboard", ikon: "bi-database-up"},
    ]},
  ];
  const SB_MINI = "portalMutu.sidebarMini";
  function kerangka(s){
    const halaman = location.pathname.split("/").pop() || "portal.html";
    // Item aktif: alamat persis (halaman + hash); bila hash tidak punya item sendiri, item halamannya.
    const semuaHref = MENU.flatMap(g => g.item.flatMap(i => [i.href, ...(i.anak || []).map(x => x.href)]));
    const kini = () => halaman + location.hash;
    const cocok = href => href === kini() || (href === halaman && !semuaHref.includes(kini()));
    const boleh = x => !x.peran || x.peran.includes(s.peran);

    // Bilah atas
    const bar = el("header", "pbar");
    const kiri = el("div", "pbar-l");
    const tog = el("button", "sb-tombol"); tog.type = "button"; tog.setAttribute("aria-label", "Buka/tutup menu"); tog.setAttribute("aria-controls", "sidebar");
    tog.append(el("i", "bi bi-list"));
    const logoImg = el("img", "pbar-logo"); logoImg.src = "assets/img/logo-fti.png"; logoImg.alt = "FTI Universitas Andalas";
    const brand = el("a", "pbar-brand"); brand.href = "portal.html"; brand.append(logoImg, el("b", null, "Portal Mutu"));
    kiri.append(tog, brand);
    const kanan = el("div", "pbar-r");
    const inisial = s.nama.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const who = el("a", "who"); who.href = "akun-saya.html"; who.title = "Profil saya";
    who.append(el("b", null, s.nama), el("small", null, (Auth.PERAN[s.peran] || s.peran) + (s.prodi ? " · " + s.prodi : "")));
    const out = el("button", "keluar"); out.type = "button"; out.append(el("i", "bi bi-box-arrow-right"), el("span", "keluar-teks", "Keluar"));
    out.addEventListener("click", keluar);
    kanan.append(el("span", "avatar", inisial), who, out);
    bar.append(kiri, kanan);

    // Sidebar
    const sb = el("nav", "sidebar"); sb.id = "sidebar"; sb.setAttribute("aria-label", "Menu utama");
    const isi = el("div", "sb-isi");
    MENU.filter(boleh).forEach(g => {
      const grup = el("div", "sb-grup");
      grup.append(el("div", "sb-judul", g.judul));
      const ul = el("ul");
      g.item.filter(boleh).forEach(i => {
        const li = el("li"), a = el("a", "sb-link"); a.href = i.href; a.title = i.label;
        a.append(el("i", "bi " + i.ikon), el("span", "sb-teks", i.label));
        const aktifAnak = (i.anak || []).some(x => cocok(x.href));
        if (cocok(i.href) || aktifAnak) a.setAttribute("aria-current", "page");
        li.append(a);
        if (i.anak) {
          const sub = el("ul", "sb-sub");
          i.anak.forEach(x => { const sa = el("a", "sb-link sb-anak"); sa.href = x.href; sa.append(el("span", "sb-teks", x.label)); if (cocok(x.href)) sa.setAttribute("aria-current", "location"); const sl = el("li"); sl.append(sa); sub.append(sl); });
          li.append(sub);
        }
        ul.append(li);
      });
      grup.append(ul); isi.append(grup);
    });
    const kaki = el("div", "sb-kaki");
    const mini = el("button", "sb-mini"); mini.type = "button"; mini.title = "Ciutkan menu";
    mini.append(el("i", "bi bi-chevron-double-left"), el("span", "sb-teks", "Ciutkan menu"));
    const sesiInfo = el("div", "sb-sesi"); sesiInfo.append(el("i", "bi bi-clock-history"));
    const sesiTeks = el("span", "sb-teks"); sesiTeks.id = "sb-sesi"; sesiTeks.textContent = "Sesi aktif"; sesiInfo.append(sesiTeks);
    kaki.append(sesiInfo, mini);
    sb.append(isi, kaki);
    const tirai = el("div", "sb-tirai");

    document.body.prepend(bar, sb, tirai);
    document.body.classList.add("ber-sidebar");
    try { if (localStorage.getItem(SB_MINI) === "1") document.body.classList.add("sb-ciut"); } catch (e) { /* abaikan */ }

    const layarKecil = matchMedia("(max-width: 991.98px)");
    const tutupLaci = () => { document.body.classList.remove("sb-terbuka"); tog.setAttribute("aria-expanded", "false"); };
    tog.setAttribute("aria-expanded", "false");
    tog.addEventListener("click", () => {
      if (layarKecil.matches) { const buka = !document.body.classList.contains("sb-terbuka"); document.body.classList.toggle("sb-terbuka", buka); tog.setAttribute("aria-expanded", String(buka)); if (buka) sb.querySelector("a").focus(); }
      else mini.click();
    });
    mini.addEventListener("click", () => {
      const ciut = !document.body.classList.contains("sb-ciut");
      document.body.classList.toggle("sb-ciut", ciut);
      mini.title = ciut ? "Lebarkan menu" : "Ciutkan menu";
      try { localStorage.setItem(SB_MINI, ciut ? "1" : "0"); } catch (e) { /* abaikan */ }
    });
    tirai.addEventListener("click", tutupLaci);
    addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("sb-terbuka")) { tutupLaci(); tog.focus(); } });
    sb.addEventListener("click", e => { if (e.target.closest("a") && layarKecil.matches) tutupLaci(); });
    // Sorot ulang item aktif saat hash berubah (mis. pindah tab dashboard).
    addEventListener("hashchange", () => {
      sb.querySelectorAll(".sb-link").forEach(a => {
        a.removeAttribute("aria-current");
        if (cocok(a.getAttribute("href"))) a.setAttribute("aria-current", a.classList.contains("sb-anak") ? "location" : "page");
      });
      sb.querySelectorAll(".sb-sub").forEach(sub => { if (sub.querySelector("[aria-current]")) sub.previousElementSibling.setAttribute("aria-current", "page"); });
    });
    if (new URLSearchParams(location.search).get("tanpa_akses")) toast("Anda tidak memiliki akses ke halaman tersebut.", "peringatan");
  }

  /* Halaman terlindungi menandai <body data-loader="..."> agar loader muncul sebelum isi terlihat. */
  if (document.body && document.body.dataset.loader) {
    loader.tampil(document.body.dataset.loader, "Memverifikasi sesi…");
    // Latar logo FTI untuk semua halaman di dalam portal.
    const latar = el("div", "latar-fti"); latar.setAttribute("aria-hidden", "true");
    const img = el("img"); img.src = "assets/img/logo-fti.png"; img.alt = "";
    latar.append(img);
    document.body.prepend(latar);
  }

  return {logo, loader, toast, keluar, jagaSesi, kerangka, tunggu, HEMAT, el};
})();
