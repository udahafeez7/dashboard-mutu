"use strict";
const {satu, pengaturan} = require("./db");

const PROFIL = "id, username, nama, email, peran, prodi, aktif, wajib_ganti_sandi";

/* Memuat pengguna dari sesi ke req.pengguna; memutus sesi yang melewati batas umur maksimum
 * atau milik akun yang sudah dinonaktifkan/dihapus. Juga menyetel idle timeout sesuai pengaturan. */
async function muatPengguna(req, res, next){
  try {
    if (!req.session || !req.session.uid) return next();
    const p = await pengaturan();
    if (Date.now() - (req.session.mulai || 0) > p.sesi_maks_jam * 3600000) {
      return req.session.destroy(() => next());
    }
    const u = await satu("SELECT " + PROFIL + " FROM pengguna WHERE id = ?", [req.session.uid]);
    if (!u || !u.aktif) return req.session.destroy(() => next());
    req.pengguna = u;
    req.session.cookie.maxAge = p.sesi_idle_menit * 60000;   // rolling: diperpanjang tiap permintaan
    next();
  } catch (e) { next(e); }
}

/* Rute API yang tetap boleh diakses saat pengguna wajib mengganti password. */
const BOLEH_SAAT_WAJIB_GANTI = new Set(["/api/saya", "/api/saya/sandi", "/api/keluar", "/api/sentuh", "/api/status"]);

function wajibLogin(req, res, next){
  if (!req.pengguna) return res.status(401).json({galat: "Sesi berakhir. Silakan masuk kembali.", kode: "BELUM_MASUK"});
  if (req.pengguna.wajib_ganti_sandi && !BOLEH_SAAT_WAJIB_GANTI.has(req.baseUrl + req.path)) {
    return res.status(403).json({galat: "Ganti password awal Anda terlebih dahulu.", kode: "WAJIB_GANTI_SANDI"});
  }
  next();
}

const wajibPeran = (...peran) => (req, res, next) =>
  peran.includes(req.pengguna.peran) ? next() : res.status(403).json({galat: "Anda tidak memiliki akses ke fitur ini.", kode: "TANPA_AKSES"});

/* Perlindungan CSRF: permintaan yang mengubah data wajib membawa header X-Portal: 1
 * (header kustom tidak bisa dikirim lintas situs tanpa CORS, dan CORS tidak dibuka)
 * dan, bila browser mengirim Origin, harus dari host yang sama. */
function cekAsal(req, res, next){
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-portal") !== "1") return res.status(403).json({galat: "Permintaan ditolak (header keamanan tidak ada).", kode: "CSRF"});
  const origin = req.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== req.get("host")) throw new Error(); }
    catch (e) { return res.status(403).json({galat: "Permintaan lintas situs ditolak.", kode: "CSRF"}); }
  }
  next();
}

module.exports = {muatPengguna, wajibLogin, wajibPeran, cekAsal, PROFIL};
