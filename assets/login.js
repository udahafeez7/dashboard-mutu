"use strict";
(async () => {
  const $ = id => document.getElementById(id);
  const f = $("f"), u = $("u"), p = $("p"), b = $("b"), kartu = $("kartu"), msg = $("msg");
  const SIMPAN = "portalMutu.username";

  if (Auth.sesi()) { location.replace(Auth.tujuanSetelahLogin()); return; }

  // Kartu login masuk setelah splash selesai.
  kartu.style.opacity = "0";
  const hasil = await window.SPLASH;
  kartu.style.opacity = "";
  kartu.classList.add("animate__animated", "animate__fadeInUp");

  const galat = teks => {
    msg.querySelector("span").textContent = teks; msg.hidden = !teks;
    if (teks) { msg.classList.remove("animate__animated", "animate__fadeIn"); void msg.offsetWidth; msg.classList.add("animate__animated", "animate__fadeIn"); }
  };
  if (hasil.galat) galat(hasil.galat);
  if (!window.crypto || !crypto.subtle) { galat("Browser ini tidak mendukung Web Crypto. Buka portal melalui https:// atau http://localhost."); b.disabled = true; }

  const pesan = Auth.pesan();
  if (pesan) UI.toast(pesan, /berakhir/i.test(pesan) ? "peringatan" : "sukses", {judul: /berakhir/i.test(pesan) ? "Sesi berakhir" : "Berhasil keluar"});

  // Ingat username (hanya username, disimpan di perangkat ini).
  try { const s = localStorage.getItem(SIMPAN); if (s) { u.value = s; $("ingat").checked = true; } } catch (e) { /* abaikan */ }
  (u.value ? p : u).focus();

  // Tampilkan/sembunyikan password.
  $("lihat").addEventListener("click", () => {
    const lihat = p.type === "password";
    p.type = lihat ? "text" : "password";
    $("lihat").setAttribute("aria-pressed", lihat);
    $("lihat").setAttribute("aria-label", lihat ? "Sembunyikan password" : "Tampilkan password");
    $("lihat").firstElementChild.className = "bi " + (lihat ? "bi-eye-slash" : "bi-eye");
    p.focus();
  });
  // Peringatan Caps Lock.
  const caps = e => { if (e.getModifierState) $("caps").hidden = !e.getModifierState("CapsLock"); };
  p.addEventListener("keydown", caps); p.addEventListener("keyup", caps);
  p.addEventListener("blur", () => { $("caps").hidden = true; });
  // Untuk password, penanda juga dipasang di pembungkus .form-floating agar pesan di input-group tampil.
  const tandai = (x, on) => { x.classList.toggle("is-invalid", on); if (x === p) x.parentElement.classList.toggle("is-invalid", on); };
  [u, p].forEach(x => x.addEventListener("input", () => { tandai(x, false); galat(""); }));

  $("lupa").addEventListener("click", () => UI.toast("Hubungi admin GPM FTI untuk mengatur ulang password. Demi keamanan, password tidak dapat dipulihkan dari portal.", "info", {judul: "Lupa password", lama: 7000}));

  // Progres tahapan login.
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
    b.disabled = on; u.readOnly = on; p.readOnly = on;
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
      await UI.tunggu(Math.max(0, 650 - (Date.now() - t0)));   // biar tahapan sempat terbaca
      UI.loader.tampil("Selamat datang, " + s.nama, "Membuka Portal Mutu…", {logo: "kilau-saja"});
      await UI.tunggu(UI.HEMAT ? 0 : 900);
      location.replace(Auth.tujuanSetelahLogin());
    } catch (err) {
      await UI.tunggu(Math.max(0, 450 - (Date.now() - t0)));
      sibuk(false);
      galat(err.message);
      p.value = ""; p.focus();
      kartu.classList.remove("animate__fadeInUp", "animate__headShake"); void kartu.offsetWidth;
      kartu.classList.add("animate__headShake");
    }
  });
})();
