"use strict";
(async () => {
  const $ = id => document.getElementById(id);
  const f = $("f"), u = $("u"), p = $("p"), b = $("b"), kartu = $("kartu"), msg = $("msg");
  const SIMPAN = "portalMutu.username", AMAN = "portalMutu.tipsDitutup";
  const simpan = {get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } }};


  const mLogin = new bootstrap.Modal($("m-login"));
  const mInfo = new bootstrap.Modal($("m-info"));

  /* ---------- masuknya elemen setelah splash ---------- */
  const ld = $("ld");
  ld.style.visibility = "hidden";
  const hasil = await window.SPLASH;
  ld.style.visibility = "";
  const anim = (el, nama, tunda) => { el.style.animationDelay = (tunda || 0) + "ms"; el.classList.add("animate__animated", nama); };
  anim(document.querySelector(".ld-judul"), "animate__fadeInDown");
  anim($("logo"), "animate__zoomIn", 150);
  anim($("kutip"), "animate__fadeInUp", 300);
  // Hapus kelas animate.css setelah selesai agar tidak bentrok dengan transform menu.
  $("logo").addEventListener("animationend", e => { if (e.animationName === "zoomIn") $("logo").classList.remove("animate__animated", "animate__zoomIn"); });
  document.querySelector(".ld-judul").addEventListener("animationend", e => e.currentTarget.classList.remove("animate__animated", "animate__fadeInDown"), {once: true});

  if (!simpan.get(AMAN)) setTimeout(() => { $("aman").hidden = false; $("aman").classList.add("animate__fadeInRight"); }, 700);
  $("aman-tutup").addEventListener("click", () => { $("aman").hidden = true; simpan.set(AMAN, "1"); });

  const pesan = Auth.pesan();
  if (pesan) UI.toast(pesan, /berakhir/i.test(pesan) ? "peringatan" : "sukses", {judul: /berakhir/i.test(pesan) ? "Sesi berakhir" : "Berhasil keluar"});
  if (hasil.galat) UI.toast(hasil.galat, "galat", {judul: "Portal belum siap", tetap: true});
  // Dialihkan dari halaman terlindungi: langsung tampilkan form masuk.
  if (new URLSearchParams(location.search).has("kembali")) setTimeout(() => mLogin.show(), 400);

  /* ---------- kutipan bergantian ---------- */
  const KUTIP = [
    "Mutu bukan tujuan akhir, melainkan budaya.",
    "Data yang baik melahirkan keputusan yang baik.",
    "Evaluasi hari ini adalah perbaikan esok hari.",
    "Penjaminan mutu adalah kerja bersama seluruh sivitas.",
    "Bukti yang lengkap memudahkan akreditasi yang unggul.",
  ];
  let ki = 0;
  setInterval(() => {
    const q = $("kutip");
    q.classList.add("ganti");
    setTimeout(() => { ki = (ki + 1) % KUTIP.length; q.textContent = "“" + KUTIP[ki] + "”"; q.classList.remove("ganti"); }, 450);
  }, 7000);

  /* ---------- logo → menu bulatan ---------- */
  const menuItem = [...document.querySelectorAll("#menu button")];
  const bukaMenu = buka => {
    document.body.classList.toggle("menu-buka", buka);
    $("logo").setAttribute("aria-expanded", buka);
    $("logo").setAttribute("aria-label", buka ? "Tutup menu portal" : "Buka menu portal");
    $("menu").setAttribute("aria-hidden", !buka);
    menuItem.forEach(x => { x.tabIndex = buka ? 0 : -1; });
    if (buka) setTimeout(() => menuItem[0].focus({preventScroll: true}), 350);
  };
  $("logo").addEventListener("click", () => bukaMenu(!document.body.classList.contains("menu-buka")));
  addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("menu-buka") && !document.querySelector(".modal.show")) { bukaMenu(false); $("logo").focus(); }
  });
  ld.addEventListener("click", e => {
    if (document.body.classList.contains("menu-buka") && !e.target.closest(".ld-logo, #menu")) bukaMenu(false);
  });

  /* ---------- aksi menu, navigasi bawah, tautan di modal ---------- */
  const INFO = {
    panduan: ["Panduan Akun", "t-panduan"],
    bantuan: ["Bantuan", "t-bantuan"],
    lupa: ["Lupa Password", "t-bantuan"],
    tentang: ["Tentang Portal Mutu", "t-tentang"],
  };
  let kembaliKeLogin = false;
  function bukaInfo(jenis){
    const [judul, tpl] = INFO[jenis];
    $("mi-judul").textContent = judul;
    $("mi-isi").replaceChildren($(tpl).content.cloneNode(true));
    if ($("m-login").classList.contains("show")) {
      kembaliKeLogin = true;
      $("m-login").addEventListener("hidden.bs.modal", () => mInfo.show(), {once: true});
      mLogin.hide();
    } else mInfo.show();
  }
  $("m-info").addEventListener("hidden.bs.modal", () => { if (kembaliKeLogin) { kembaliKeLogin = false; mLogin.show(); } });

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-aksi]");
    if (!t) return;
    const a = t.dataset.aksi;
    if (a === "login") mLogin.show();
    else if (a === "beranda") { bukaMenu(false); scrollTo({top: 0, behavior: "smooth"}); }
    else if (INFO[a]) bukaInfo(a);
  });

  /* ---------- form login ---------- */
  $("m-login").addEventListener("shown.bs.modal", () => (u.value ? p : u).focus());

  const galat = teks => {
    msg.querySelector("span").textContent = teks; msg.hidden = !teks;
    if (teks) { msg.classList.remove("animate__animated", "animate__fadeIn"); void msg.offsetWidth; msg.classList.add("animate__animated", "animate__fadeIn"); }
  };

  try { const s = localStorage.getItem(SIMPAN); if (s) { u.value = s; $("ingat").checked = true; } } catch (e) { /* abaikan */ }

  $("lihat").addEventListener("click", () => {
    const lihat = p.type === "password";
    p.type = lihat ? "text" : "password";
    $("lihat").setAttribute("aria-pressed", lihat);
    $("lihat").setAttribute("aria-label", lihat ? "Sembunyikan password" : "Tampilkan password");
    $("lihat").firstElementChild.className = "bi " + (lihat ? "bi-eye-slash" : "bi-eye");
    p.focus();
  });
  const caps = e => { if (e.getModifierState) $("caps").hidden = !e.getModifierState("CapsLock"); };
  p.addEventListener("keydown", caps); p.addEventListener("keyup", caps);
  p.addEventListener("blur", () => { $("caps").hidden = true; });

  // Penanda invalid dipasang di input-group agar pesan Bootstrap tampil di dalam grup.
  const tandai = (x, on) => { x.classList.toggle("is-invalid", on); x.closest(".input-group").classList.toggle("is-invalid", on); };
  [u, p].forEach(x => x.addEventListener("input", () => { tandai(x, false); galat(""); }));
  f.addEventListener("reset", () => {
    setTimeout(() => {
      [u, p].forEach(x => tandai(x, false)); galat(""); $("caps").hidden = true;
      if (p.type === "text") $("lihat").click();
      u.focus();
    });
  });

  const URUT = ["akun", "kunci", "sukses"], PCT = {akun: 22, kunci: 60, sukses: 100};
  const tahap = t => {
    $("prog-bar").style.width = PCT[t] + "%";
    const k = URUT.indexOf(t);
    document.querySelectorAll("#tahap li").forEach((li, i) => {
      li.className = i < k || t === "sukses" ? "selesai" : i === k ? "aktif" : "";
      li.firstElementChild.className = "bi " + (li.className === "selesai" ? "bi-check-circle-fill" : li.className === "aktif" ? "bi-arrow-repeat" : "bi-circle");
    });
    $("b-teks").textContent = {akun: "Mencari akun…", kunci: "Memverifikasi…", sukses: "Berhasil"}[t];
  };
  const sibuk = on => {
    b.disabled = on; $("reset").disabled = on; u.readOnly = on; p.readOnly = on;
    $("spin").hidden = !on; $("prog").hidden = !on;
    if (!on) $("b-teks").textContent = "Masuk";
  };

  f.addEventListener("submit", async e => {
    e.preventDefault();
    galat("");
    const nu = u.value.trim(), np = p.value;
    tandai(u, !nu); tandai(p, !np);
    if (!nu || !np) { (nu ? p : u).focus(); return; }

    sibuk(true); tahap("akun");
    const t0 = Date.now();
    try {
      const s = await Auth.login(nu, np, x => tahap(x));
      try { $("ingat").checked ? localStorage.setItem(SIMPAN, nu) : localStorage.removeItem(SIMPAN); } catch (er) { /* abaikan */ }
      await UI.tunggu(Math.max(0, 650 - (Date.now() - t0)));
      if (s.wajib_ganti_sandi) {
        UI.loader.tampil("Halo, " + s.nama, "Silakan ganti password sementara Anda…", {logo: "kilau-saja"});
        await UI.tunggu(UI.HEMAT ? 0 : 900);
        location.replace("akun-saya.html?wajib=1");
        return;
      }
      UI.loader.tampil("Selamat datang kembali, " + s.nama, "Membuka Portal Mutu…", {logo: "kilau-saja"});
      await UI.tunggu(UI.HEMAT ? 0 : 900);
      location.replace(Auth.tujuanSetelahLogin());
    } catch (err) {
      await UI.tunggu(Math.max(0, 450 - (Date.now() - t0)));
      sibuk(false);
      galat(err.message);
      p.value = ""; p.focus();
      kartu.classList.remove("animate__animated", "animate__headShake"); void kartu.offsetWidth;
      kartu.classList.add("animate__animated", "animate__headShake");
    }
  });
})();
