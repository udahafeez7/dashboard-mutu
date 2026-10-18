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

  async function login(username, password){
    const db = await getJSON("data/akun.json");
    const id = await akunId(db.pepper, username);
    const a = db.akun.find(x => x.id === id);
    // Akun tidak dikenal tetap menjalankan PBKDF2 agar waktu respons tidak membocorkan username.
    const iter = a ? a.iterasi : db.iterasi;
    const key = await kek(password, a ? b64(a.salt) : crypto.getRandomValues(new Uint8Array(16)), iter);
    if (!a) throw new Error("Username atau password salah.");
    let isi;
    try { isi = await open(key, a.kunci, "akun:" + id); }
    catch (e) { throw new Error("Username atau password salah."); }
    const now = Date.now();
    const sesi = {u: isi.u, nama: isi.nama, peran: isi.peran, prodi: isi.prodi || null, k: isi.k, mulai: now, aktif: now};
    sessionStorage.setItem(SESI, JSON.stringify(sesi));
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
  function sentuh(){
    const s = sesi();
    if (s) { s.aktif = Date.now(); sessionStorage.setItem(SESI, JSON.stringify(s)); }
  }
  function logout(alasan){
    sessionStorage.removeItem(SESI);
    if (alasan) sessionStorage.setItem(SESI + ".pesan", alasan);
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
  async function bukaData(url, aad){
    const s = sesi();
    if (!s) throw new Error("Belum login");
    return open(await aesKey(b64(s.k)), await getJSON(url), aad);
  }
  const muatMutu = () => bukaData("data/mutu.enc.json", "mutu.json");
  async function daftarAkun(){
    const s = sesi(), db = await getJSON("data/akun.json"), key = await aesKey(b64(s.k));
    return Promise.all(db.akun.map(a => open(key, a.profil, "profil:" + a.id)));
  }

  /* Bilah atas portal: identitas pengguna, navigasi, tombol keluar. */
  const PERAN = {admin: "Administrator", gpm: "GPM", gkm: "GKM", pimpinan: "Pimpinan"};
  function bilah(s, aktif){
    const bar = document.createElement("div");
    bar.className = "pbar";
    const link = (href, teks) => { const a = document.createElement("a"); a.href = href; a.textContent = teks; if (href === aktif) a.setAttribute("aria-current", "page"); return a; };
    const kiri = document.createElement("div"); kiri.className = "pbar-l";
    const brand = document.createElement("b"); brand.textContent = "Portal Mutu FTI";
    kiri.append(brand, link("portal.html", "Beranda"), link("dashboard.html", "Dashboard Mutu"));
    const kanan = document.createElement("div"); kanan.className = "pbar-r";
    const who = document.createElement("span");
    who.textContent = s.nama + " · " + (PERAN[s.peran] || s.peran) + (s.prodi ? " " + s.prodi : "");
    const out = document.createElement("button"); out.type = "button"; out.textContent = "Keluar";
    out.addEventListener("click", () => { logout("Anda telah keluar."); location.replace("index.html"); });
    kanan.append(who, out);
    bar.append(kiri, kanan);
    document.body.prepend(bar);
  }

  return {login, sesi, logout, pesan, wajib, tujuanSetelahLogin, muatMutu, daftarAkun, bilah, PERAN};
})();
