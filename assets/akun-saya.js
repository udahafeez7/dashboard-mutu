"use strict";
(async () => {
  let s;
  try { s = await Auth.wajib(); } catch (e) { return; }
  const $ = id => document.getElementById(id);
  const wajibGanti = s.wajib_ganti_sandi;

  // Saat wajib ganti password, menu lain disembunyikan oleh server; tampilkan kerangka minimal.
  UI.kerangka(s);
  UI.jagaSesi();
  if (wajibGanti) {
    $("wajib").hidden = false;
    $("profil").classList.add("redup-wajib");
    document.querySelectorAll(".sidebar .sb-grup").forEach(g => { if (!g.querySelector('a[href^="akun-saya"]')) g.hidden = true; });
  }

  /* ---------- profil ---------- */
  const fmtWaktu = ms => new Date(ms).toLocaleString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"});
  $("i-username").textContent = s.u;
  $("i-peran").textContent = Auth.PERAN[s.peran] || s.peran;
  $("i-prodi").textContent = s.prodi || "Tidak terikat prodi";
  $("i-terakhir").textContent = s.terakhir ? fmtWaktu(s.terakhir) : "Ini kali pertama Anda masuk";
  $("p-nama").value = s.nama;
  $("p-email").value = s.email || "";
  $("s-user").value = s.u;
  $("s-min").textContent = s.sandi_min;
  $("i-sesi").textContent = "Masuk " + fmtWaktu(s.mulai) + ". Sesi berakhir setelah " + s.idle_menit + " menit tanpa aktivitas, atau paling lama " + s.maks_jam + " jam.";

  const sibuk = (btn, on, teks) => { btn.disabled = on; if (on) { btn.dataset.asli = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + teks; } else if (btn.dataset.asli) btn.innerHTML = btn.dataset.asli; };

  $("f-profil").addEventListener("submit", async e => {
    e.preventDefault();
    const nama = $("p-nama").value.trim(), email = $("p-email").value.trim();
    $("p-nama").classList.toggle("is-invalid", !nama);
    $("p-email").classList.toggle("is-invalid", !!email && !$("p-email").checkValidity());
    if (!nama || (email && !$("p-email").checkValidity())) return;
    sibuk($("b-profil"), true, "Menyimpan…");
    try {
      await Auth.api("PATCH", "/api/saya", {nama, email});
      await Auth.wajib();   // segarkan salinan profil
      document.querySelector(".pbar .who b").textContent = nama;
      UI.toast("Profil disimpan.", "sukses");
    } catch (er) { UI.toast(er.message, "galat"); }
    finally { sibuk($("b-profil"), false); }
  });

  /* ---------- ganti password ---------- */
  const baru = $("s-baru"), ulang = $("s-ulang"), lama = $("s-lama");
  const aturan = () => {
    const v = baru.value;
    return {
      panjang: v.length >= s.sandi_min,
      campur: /[A-Za-z]/.test(v) && /[0-9]/.test(v),
      user: !!v && !v.toLowerCase().includes(s.u.toLowerCase()),
      beda: !!v && v !== lama.value,
    };
  };
  function perbarui(){
    const a = aturan(), lolos = Object.values(a).filter(Boolean).length;
    document.querySelectorAll("#aturan li").forEach(li => {
      const ok = a[li.dataset.a];
      li.classList.toggle("ok", ok);
      li.firstElementChild.className = "bi " + (ok ? "bi-check-circle-fill" : "bi-circle");
    });
    // Kekuatan: aturan terpenuhi + bonus panjang dan variasi karakter.
    const v = baru.value, variasi = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(v)).length;
    const skor = v ? Math.min(100, lolos * 15 + Math.min(v.length, 20) * 1.5 + variasi * 5) : 0;
    $("s-meter").style.width = skor + "%";
    $("s-meter").className = skor >= 85 ? "kuat" : skor >= 60 ? "sedang" : "lemah";
  }
  [baru, lama].forEach(x => x.addEventListener("input", perbarui));
  ulang.addEventListener("input", () => ulang.classList.remove("is-invalid"));
  $("s-lihat").addEventListener("click", () => {
    const lihat = baru.type === "password";
    [baru, ulang].forEach(x => { x.type = lihat ? "text" : "password"; });
    $("s-lihat").firstElementChild.className = "bi " + (lihat ? "bi-eye-slash" : "bi-eye");
    $("s-lihat").setAttribute("aria-label", lihat ? "Sembunyikan password" : "Tampilkan password");
  });

  $("f-sandi").addEventListener("submit", async e => {
    e.preventDefault();
    $("s-galat").hidden = true;
    const a = aturan();
    if (!lama.value) { lama.focus(); return; }
    if (!Object.values(a).every(Boolean)) { baru.focus(); $("s-galat").textContent = "Password baru belum memenuhi semua syarat."; $("s-galat").hidden = false; return; }
    if (ulang.value !== baru.value) { ulang.classList.add("is-invalid"); ulang.focus(); return; }
    sibuk($("b-sandi"), true, "Mengganti…");
    try {
      await Auth.api("POST", "/api/saya/sandi", {lama: lama.value, baru: baru.value});
      $("f-sandi").reset(); perbarui();
      if (wajibGanti) {
        UI.loader.tampil("Password berhasil diganti", "Membuka Portal Mutu…", {logo: "kilau-saja"});
        await UI.tunggu(900);
        location.replace("portal.html");
        return;
      }
      UI.toast("Password diganti. Sesi di perangkat lain telah diakhiri.", "sukses", {lama: 5000});
    } catch (er) { $("s-galat").textContent = er.message; $("s-galat").hidden = false; }
    finally { sibuk($("b-sandi"), false); }
  });

  if (location.hash === "#sandi" || wajibGanti) setTimeout(() => { $("sandi").scrollIntoView({behavior: "smooth", block: "start"}); lama.focus({preventScroll: true}); }, 300);
  addEventListener("hashchange", () => { if (location.hash === "#sandi") { $("sandi").scrollIntoView({behavior: "smooth"}); lama.focus({preventScroll: true}); } });
  UI.loader.sembunyi(500);
})();
