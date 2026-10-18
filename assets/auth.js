/* Portal Mutu FTI: autentikasi sisi browser.
 *
 * Sumber kebenaran sesi ada di server (cookie HttpOnly "pm_sid", tabel `sesi` MySQL).
 * Browser hanya menyimpan salinan profil di sessionStorage untuk keperluan tampilan
 * (nama di bilah atas, hitung mundur sesi). Semua data diambil dari /api setelah server
 * memeriksa sesi dan peran.
 */
"use strict";
const Auth = (() => {
  const SESI = "portalMutu.sesi", PESAN = "portalMutu.sesi.pesan", KEMBALI = "portalMutu.sesi.kembali";
  const PERAN = {admin: "Administrator", gpm: "GPM", gkm: "GKM", pimpinan: "Pimpinan"};
  const simpan = {
    get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    hapus(k){ try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };

  /* ---------- pemanggil API ---------- */
  class GalatApi extends Error { constructor(pesan, status, kode){ super(pesan); this.status = status; this.kode = kode; } }
  async function api(metode, url, isi){
    let r;
    try {
      r = await fetch(url, {
        method: metode, credentials: "same-origin", cache: "no-store",
        headers: Object.assign({"X-Portal": "1"}, isi !== undefined ? {"Content-Type": "application/json"} : {}),
        body: isi !== undefined ? JSON.stringify(isi) : undefined,
      });
    } catch (e) { throw new GalatApi("Server portal tidak dapat dihubungi. Periksa koneksi lalu coba lagi.", 0, "JARINGAN"); }
    let data = null;
    try { data = await r.json(); } catch (e) { /* respons tanpa JSON */ }
    if (!r.ok) throw new GalatApi((data && data.galat) || "Permintaan gagal (" + r.status + ").", r.status, data && data.kode);
    return data;
  }

  /* ---------- salinan sesi untuk tampilan ---------- */
  function simpanSesi(d){
    const p = d.pengguna, lama = sesi();
    const s = {id: p.id, u: p.username, nama: p.nama, email: p.email, peran: p.peran, prodi: p.prodi || null,
      wajib_ganti_sandi: p.wajib_ganti_sandi, terakhir: p.login_sebelumnya,
      mulai: d.sesi.mulai, aktif: lama ? lama.aktif : Date.now(), idle_menit: d.sesi.idle_menit, maks_jam: d.sesi.maks_jam, sandi_min: d.sesi.sandi_min};
    simpan.set(SESI, JSON.stringify(s));
    return s;
  }
  function sesi(){
    try { return JSON.parse(simpan.get(SESI)) || null; } catch (e) { return null; }
  }
  /* Milidetik sampai sesi berakhir menurut hitungan browser (idle atau batas maksimum). */
  function sisa(){
    const s = sesi();
    if (!s) return 0;
    const now = Date.now();
    return Math.min(s.idle_menit * 60000 - (now - s.aktif), s.maks_jam * 3600000 - (now - s.mulai));
  }
  const tandaiAktif = () => { const s = sesi(); if (s) { s.aktif = Date.now(); simpan.set(SESI, JSON.stringify(s)); } };
  /* Perpanjang sesi di server (tombol "Tetap masuk"). */
  async function sentuh(){ await api("POST", "/api/sentuh"); tandaiAktif(); }

  function catatPesan(alasan){ if (alasan && !simpan.get(PESAN)) simpan.set(PESAN, alasan); }
  function pesan(){ const m = simpan.get(PESAN); simpan.hapus(PESAN); return m; }

  async function login(username, password, tahap = () => {}){
    tahap("akun");
    const t = setTimeout(() => tahap("kunci"), 250);
    try {
      const d = await api("POST", "/api/masuk", {username, password});
      simpan.hapus(SESI);
      const s = simpanSesi(d);
      tahap("sukses");
      return s;
    } finally { clearTimeout(t); }
  }
  async function logout(alasan){
    try { await api("POST", "/api/keluar"); } catch (e) { /* sesi mungkin sudah berakhir */ }
    simpan.hapus(SESI);
    catatPesan(alasan);
  }

  /* Halaman terlindungi: pastikan sesi server masih berlaku. Mengembalikan profil, atau mengalihkan. */
  let detak = null;
  async function wajib(opts){
    opts = opts || {};
    const halaman = location.pathname.split("/").pop() || "portal.html";
    let d;
    try { d = await api("GET", "/api/saya"); }
    catch (e) {
      if (e.status === 401) {
        const pernahMasuk = !!sesi();
        simpan.hapus(SESI);
        catatPesan(pernahMasuk ? "Sesi berakhir. Silakan masuk kembali." : null);
        location.replace("/?kembali=" + encodeURIComponent(halaman));
        throw e;
      }
      throw e;
    }
    const s = simpanSesi(d);
    if (s.wajib_ganti_sandi && halaman !== "akun-saya.html") { location.replace("/akun-saya.html?wajib=1"); throw new Error("Wajib ganti password"); }
    if (opts.peran && !opts.peran.includes(s.peran)) { location.replace("/portal.html?tanpa_akses=1"); throw new Error("Tanpa akses"); }

    // Aktivitas pengguna memperpanjang sesi: dicatat lokal, dikirim ke server paling sering tiap 60 detik.
    if (!detak) {
      let terakhirKirim = Date.now();
      ["click", "keydown", "pointermove", "scroll", "touchstart"].forEach(ev => addEventListener(ev, tandaiAktif, {passive: true}));
      detak = setInterval(async () => {
        const x = sesi();
        if (!x || x.aktif <= terakhirKirim || sisa() <= 0) return;
        terakhirKirim = Date.now();
        try { await api("POST", "/api/sentuh"); }
        catch (e) { if (e.status === 401) { simpan.hapus(SESI); catatPesan("Sesi berakhir. Silakan masuk kembali."); location.replace("/?kembali=" + encodeURIComponent(halaman)); } }
      }, 60000);
    }
    return s;
  }
  function tujuanSetelahLogin(){
    const dariUrl = new URLSearchParams(location.search).get("kembali");
    const t = dariUrl || simpan.get(KEMBALI);
    simpan.hapus(KEMBALI);
    return /^[a-z-]+\.html(#[a-z]+)?$/.test(t || "") && !t.startsWith("index.html") ? t : "portal.html";
  }

  /* Data dashboard dari server. tahap: "unduh" → "olah". */
  async function muatMutu(tahap = () => {}){
    tahap("unduh");
    const d = await api("GET", "/api/mutu");
    tahap("olah");
    return d;
  }

  return {api, GalatApi, login, logout, wajib, sesi, sisa, sentuh, pesan, tujuanSetelahLogin, muatMutu, PERAN};
})();
