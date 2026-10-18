/* Splash awal portal: animasi logo FTI + pemeriksaan kesiapan yang sungguhan.
 * Tampil sekali per sesi tab. Hasilnya tersedia sebagai window.SPLASH (Promise) untuk login.js.
 */
"use strict";
window.SPLASH = (() => {
  const KUNCI = "portalMutu.splash";
  const sp = document.getElementById("splash");
  let sudah = false;
  try { sudah = sessionStorage.getItem(KUNCI) === "1"; } catch (e) { /* storage diblokir: tetap tampilkan */ }
  if (!sp) return Promise.resolve({ok: true});
  if (sudah) { sp.remove(); return Promise.resolve({ok: true, dilewati: true}); }

  const hemat = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bar = document.getElementById("sp-bar"), status = document.getElementById("sp-status");
  const tunggu = ms => new Promise(r => setTimeout(r, hemat ? 0 : ms));
  const set = (pct, teks) => { bar.firstElementChild.style.width = pct + "%"; status.textContent = teks; };
  // Tiap tahap menjalankan pemeriksaan sungguhan, tetapi ditahan minimal `min` ms
  // agar animasi logo (sekitar 1,5 detik) selesai sebelum portal dibuka.
  const langkah = async (pct, teks, kerja, min) => {
    set(pct, teks);
    const [hasil] = await Promise.all([kerja ? kerja().catch(e => e) : null, tunggu(min)]);
    return hasil;
  };

  return (async () => {
    let galat = null;
    await langkah(6, "Memulai Portal Mutu…", null, 650);
    await langkah(28, "Memeriksa browser…", null, 550);
    if (!window.fetch) galat = "Browser ini terlalu lama. Gunakan versi terbaru Chrome, Edge, atau Firefox.";

    if (!galat) {
      const r = await langkah(56, "Menghubungkan ke server portal…", async () => {
        const res = await fetch("/api/status", {cache: "no-store"});
        if (!res.ok) throw new Error(res.status);
        await res.json();
      }, 600);
      if (r instanceof Error) galat = "Server portal atau database tidak dapat dihubungi. Coba muat ulang halaman; bila tetap gagal, hubungi admin GPM.";
    }

    if (!galat) await langkah(82, "Menyiapkan tampilan…", () => Promise.race([
      Promise.all([document.fonts ? document.fonts.ready : null,
        new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r, {once: true}))]),
      new Promise(r => setTimeout(r, 4000)),
    ]), 550);

    if (galat) { bar.classList.add("gagal"); set(100, "Gagal memuat"); await tunggu(900); }
    else await langkah(100, "Siap", null, 500);

    try { sessionStorage.setItem(KUNCI, "1"); } catch (e) { /* abaikan */ }
    sp.classList.add("keluar");
    await tunggu(520);
    sp.remove();
    return {ok: !galat, galat};
  })();
})();
