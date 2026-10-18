/* Portal Mutu FTI: autentikasi sisi browser.
 *
 * Situs ini statis (GitHub Pages), jadi tidak ada server yang memeriksa password.
 * Perlindungan datang dari enkripsi:
 *   - data/mutu.enc.json  : data dashboard, dienkripsi AES-256-GCM dengan kunci data K.
 *   - data/akun.json      : per akun, K dibungkus dengan kunci turunan password
 *                           (PBKDF2-SHA256). Tanpa password yang benar, K tidak bisa dibuka.
 * Format file dibuat oleh tools/portal_admin.py; keduanya harus tetap sejalan.
 */
"use strict";
const Auth = (() => {
  const SESI = "portalMutu.sesi";
  const IDLE_MS = 30 * 60 * 1000;      // keluar otomatis setelah 30 menit tanpa aktivitas
  const MAKS_MS = 8 * 60 * 60 * 1000;  // sesi paling lama 8 jam
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = u8 => btoa(String.fromCharCode(...u8));
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

  async function getJSON(url){
    const r = await fetch(url + "?ts=" + Date.now(), {cache: "no-store"});
    if (!r.ok) throw new Error("Gagal memuat " + url + " (" + r.status + ")");
    return r.json();
  }
  const akunId = async (pepper, username) =>
    hex(await crypto.subtle.digest("SHA-256", enc.encode(pepper + ":" + username.trim().toLowerCase())));

  async function kek(password, salt, iter){
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({name: "PBKDF2", hash: "SHA-256", salt, iterations: iter},
      base, {name: "AES-GCM", length: 256}, false, ["decrypt"]);
  }
  const aesKey = raw => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  async function open(key, box, aad){
    const pt = await crypto.subtle.decrypt({name: "AES-GCM", iv: b64(box.iv), additionalData: enc.encode(aad)}, key, b64(box.ct));
    return JSON.parse(dec.decode(pt));
  }

  /* tahap(nama) dipanggil di tiap langkah agar UI bisa menampilkan progres: akun, kunci, sukses. */
  async function login(username, password, tahap = () => {}){
    tahap("akun");
    const db = await getJSON("data/akun.json");
    const id = await akunId(db.pepper, username);
    const a = db.akun.find(x => x.id === id);
    // Akun tidak dikenal tetap menjalankan PBKDF2 agar waktu respons tidak membocorkan username.
    const iter = a ? a.iterasi : db.iterasi;
    tahap("kunci");
    const key = await kek(password, a ? b64(a.salt) : crypto.getRandomValues(new Uint8Array(16)), iter);
    if (!a) throw new Error("Username atau password salah.");
    let isi;
    try { isi = await open(key, a.kunci, "akun:" + id); }
    catch (e) { throw new Error("Username atau password salah."); }
    const now = Date.now();
    // Waktu masuk sebelumnya di perangkat ini (hanya untuk sapaan; disimpan per hash akun).
    let terakhir = null;
    try { terakhir = Number(localStorage.getItem("portalMutu.terakhir:" + id)) || null; localStorage.setItem("portalMutu.terakhir:" + id, String(now)); } catch (e) { /* abaikan */ }
    const sesi = {u: isi.u, nama: isi.nama, peran: isi.peran, prodi: isi.prodi || null, k: isi.k, mulai: now, aktif: now, terakhir};
    sessionStorage.setItem(SESI, JSON.stringify(sesi));
    tahap("sukses");
    return sesi;
  }

  function sesi(){
    let s;
    try { s = JSON.parse(sessionStorage.getItem(SESI)); } catch (e) { s = null; }
    if (!s || !s.k) return null;
    const now = Date.now();
    if (now - s.aktif > IDLE_MS || now - s.mulai > MAKS_MS) { logout(); return null; }
    return s;
  }
  /* Milidetik sampai sesi berakhir (idle atau batas maksimum). */
  function sisa(){
    const s = sesi();
    if (!s) return 0;
    const now = Date.now();
    return Math.min(IDLE_MS - (now - s.aktif), MAKS_MS - (now - s.mulai));
  }
  function sentuh(){
    const s = sesi();
    if (s) { s.aktif = Date.now(); sessionStorage.setItem(SESI, JSON.stringify(s)); }
  }
  function logout(alasan){
    sessionStorage.removeItem(SESI);
    // Pesan pertama yang menang: logout manual tidak tertimpa oleh pemeriksa sesi berkala.
    if (alasan && !sessionStorage.getItem(SESI + ".pesan")) sessionStorage.setItem(SESI + ".pesan", alasan);
  }
  function pesan(){
    const m = sessionStorage.getItem(SESI + ".pesan");
    sessionStorage.removeItem(SESI + ".pesan");
    return m;
  }

  /* Dipanggil di setiap halaman yang dilindungi. Mengembalikan sesi, atau mengalihkan ke login. */
  function wajib(){
    const s = sesi();
    if (!s) {
      sessionStorage.setItem(SESI + ".kembali", location.pathname.split("/").pop() || "portal.html");
      location.replace("index.html");
      throw new Error("Belum login");
    }
    ["click", "keydown", "pointermove", "scroll"].forEach(ev => addEventListener(ev, sentuh, {passive: true}));
    setInterval(() => { if (!sesi()) { logout("Sesi berakhir. Silakan masuk kembali."); location.replace("index.html"); } }, 30000);
    return s;
  }
  function tujuanSetelahLogin(){
    const t = sessionStorage.getItem(SESI + ".kembali");
    sessionStorage.removeItem(SESI + ".kembali");
    return /^[a-z-]+\.html$/.test(t || "") && t !== "index.html" ? t : "portal.html";
  }

  /* Membuka file terenkripsi dengan kunci data K dari sesi. */
  async function bukaData(url, aad, tahap = () => {}){
    const s = sesi();
    if (!s) throw new Error("Belum login");
    tahap("unduh");
    const box = await getJSON(url);
    tahap("dekripsi");
    return open(await aesKey(b64(s.k)), box, aad);
  }
  const muatMutu = tahap => bukaData("data/mutu.enc.json", "mutu.json", tahap);
  async function daftarAkun(){
    const s = sesi(), db = await getJSON("data/akun.json"), key = await aesKey(b64(s.k));
    return Promise.all(db.akun.map(a => open(key, a.profil, "profil:" + a.id)));
  }

  /* Bilah atas portal: logo, navigasi, identitas pengguna, tombol keluar. */
  const PERAN = {admin: "Administrator", gpm: "GPM", gkm: "GKM", pimpinan: "Pimpinan"};
  function el(tag, cls, teks){ const e = document.createElement(tag); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; }
  function bilah(s, aktif){
    const bar = el("div", "pbar");
    const link = (href, teks, ikon) => {
      const a = el("a"); a.href = href;
      if (ikon) a.append(el("i", "bi " + ikon + " me-1"));
      a.append(teks);
      if (href === aktif) a.setAttribute("aria-current", "page");
      return a;
    };
    const kiri = el("div", "pbar-l");
    const logo = el("img", "pbar-logo"); logo.src = "assets/img/logo-fti.png"; logo.alt = "FTI Universitas Andalas";
    const brand = el("a"); brand.href = "portal.html"; brand.append(logo); brand.style.borderBottom = "0";
    kiri.append(brand, el("b", null, "Portal Mutu"), link("portal.html", "Beranda", "bi-house"), link("dashboard.html", "Dashboard Mutu", "bi-graph-up"));
    const kanan = el("div", "pbar-r");
    const inisial = s.nama.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const who = el("div", "who");
    who.append(el("b", null, s.nama), el("small", null, (PERAN[s.peran] || s.peran) + (s.prodi ? " · " + s.prodi : "")));
    const out = el("button", "keluar"); out.type = "button";
    out.append(el("i", "bi bi-box-arrow-right"), "Keluar");
    out.addEventListener("click", () => {
      if (typeof UI !== "undefined" && UI.keluar) UI.keluar();   // UI dideklarasikan dengan const, bukan properti window
      else { logout("Anda telah keluar."); location.replace("index.html"); }
    });
    kanan.append(el("span", "avatar", inisial), who, out);
    bar.append(kiri, kanan);
    document.body.prepend(bar);
  }

  return {login, sesi, sisa, sentuh, logout, pesan, wajib, tujuanSetelahLogin, muatMutu, daftarAkun, bilah, PERAN};
})();
