"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const {q, satu, pengaturan} = require("../db");
const {wajibLogin} = require("../auth");
const {catat} = require("../log");
const {putusSesiPengguna} = require("../sesi-store");
const v = require("../validasi");

const r = express.Router();
const BIAYA_HASH = 12;
// Hash tiruan: dipakai saat username tidak ada agar waktu respons sama (tidak membocorkan username).
const HASH_TIRUAN = bcrypt.hashSync("tiruan-" + Date.now(), BIAYA_HASH);

const batasMasuk = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false,
  message: {galat: "Terlalu banyak percobaan masuk dari perangkat ini. Coba lagi dalam 15 menit.", kode: "BATAS_PERCOBAAN"},
});

const profilPublik = (u, sesi) => ({
  id: u.id, username: u.username, nama: u.nama, email: u.email, peran: u.peran, prodi: u.prodi,
  wajib_ganti_sandi: !!u.wajib_ganti_sandi,
  login_sebelumnya: sesi ? sesi.loginSebelumnya || null : null,
});
const infoSesi = async req => {
  const p = await pengaturan();
  return {idle_menit: p.sesi_idle_menit, maks_jam: p.sesi_maks_jam, mulai: req.session.mulai, sandi_min: p.sandi_min};
};

/* Status layanan (dipakai splash halaman masuk untuk memeriksa koneksi). */
r.get("/status", async (req, res) => {
  try { await q("SELECT 1"); res.json({ok: true, masuk: !!req.pengguna}); }
  catch (e) { res.status(503).json({ok: false, galat: "Database tidak dapat dihubungi."}); }
});

r.post("/masuk", batasMasuk, async (req, res, next) => {
  try {
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase().slice(0, 64) : "";
    const sandi = typeof req.body.password === "string" ? req.body.password.slice(0, 128) : "";
    if (!username || !sandi) return res.status(400).json({galat: "Isi username dan password."});
    const p = await pengaturan();
    const u = await satu("SELECT * FROM pengguna WHERE username = ?", [username]);

    if (u && u.terkunci_sampai && new Date(u.terkunci_sampai) > new Date()) {
      const menit = Math.ceil((new Date(u.terkunci_sampai) - new Date()) / 60000);
      await catat(req, "masuk_ditolak_terkunci", username, null, null);
      return res.status(423).json({galat: `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit atau hubungi admin GPM.`, kode: "TERKUNCI"});
    }
    const cocok = await bcrypt.compare(sandi, u ? u.sandi_hash : HASH_TIRUAN);
    if (!u || !cocok) {
      if (u) {
        const gagal = u.gagal_login + 1;
        if (gagal >= p.maks_gagal_login) {
          await q("UPDATE pengguna SET gagal_login = 0, terkunci_sampai = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?", [p.kunci_menit, u.id]);
          await catat(req, "akun_terkunci", username, `${gagal} percobaan gagal; terkunci ${p.kunci_menit} menit`, null);
        } else {
          await q("UPDATE pengguna SET gagal_login = ? WHERE id = ?", [gagal, u.id]);
        }
      }
      await catat(req, "masuk_gagal", username, null, null);
      return res.status(401).json({galat: "Username atau password salah."});
    }
    if (!u.aktif) {
      await catat(req, "masuk_ditolak_nonaktif", username, null, null);
      return res.status(403).json({galat: "Akun Anda dinonaktifkan. Hubungi admin GPM FTI.", kode: "NONAKTIF"});
    }

    // Sesi baru (cegah session fixation), simpan waktu masuk sebelumnya untuk sapaan.
    const sebelumnya = u.login_terakhir;
    await new Promise((ok, gagal) => req.session.regenerate(e => e ? gagal(e) : ok()));
    req.session.uid = u.id;
    req.session.mulai = Date.now();
    req.session.loginSebelumnya = sebelumnya ? new Date(sebelumnya).getTime() : null;
    req.session.cookie.maxAge = p.sesi_idle_menit * 60000;
    await q("UPDATE pengguna SET gagal_login = 0, terkunci_sampai = NULL, login_terakhir = NOW() WHERE id = ?", [u.id]);
    await catat(req, "masuk", u.username, null, u);
    res.json({pengguna: profilPublik(u, req.session), sesi: await infoSesi(req)});
  } catch (e) { next(e); }
});

r.post("/keluar", async (req, res, next) => {
  try {
    if (req.pengguna) await catat(req, "keluar", req.pengguna.username);
    req.session.destroy(() => { res.clearCookie("pm_sid"); res.json({ok: true}); });
  } catch (e) { next(e); }
});

r.get("/saya", wajibLogin, async (req, res, next) => {
  try { res.json({pengguna: profilPublik(req.pengguna, req.session), sesi: await infoSesi(req)}); } catch (e) { next(e); }
});

/* Memperpanjang sesi (tombol "Tetap masuk" dan detak aktivitas). Sesi sudah diperpanjang oleh muatPengguna. */
r.post("/sentuh", wajibLogin, (req, res) => res.json({ok: true}));

r.patch("/saya", wajibLogin, async (req, res, next) => {
  try {
    const nama = v.teks(req.body.nama, "Nama", 120, true), email = v.email(req.body.email);
    await q("UPDATE pengguna SET nama = ?, email = ? WHERE id = ?", [nama, email, req.pengguna.id]);
    await catat(req, "profil_diubah", req.pengguna.username);
    res.json({ok: true});
  } catch (e) { next(e); }
});

r.post("/saya/sandi", wajibLogin, async (req, res, next) => {
  try {
    const p = await pengaturan();
    const u = await satu("SELECT id, username, sandi_hash FROM pengguna WHERE id = ?", [req.pengguna.id]);
    if (!(await bcrypt.compare(String(req.body.lama || ""), u.sandi_hash))) throw new v.GalatValidasi("Password saat ini salah.");
    const baru = v.sandi(req.body.baru, p.sandi_min, u.username);
    if (await bcrypt.compare(baru, u.sandi_hash)) throw new v.GalatValidasi("Password baru harus berbeda dari password saat ini.");
    await q("UPDATE pengguna SET sandi_hash = ?, wajib_ganti_sandi = 0, sandi_diubah_pada = NOW() WHERE id = ?",
      [await bcrypt.hash(baru, BIAYA_HASH), u.id]);
    await putusSesiPengguna(u.id, req.sessionID);   // keluarkan perangkat lain
    await catat(req, "sandi_diganti", u.username);
    res.json({ok: true});
  } catch (e) { next(e); }
});

module.exports = r;
module.exports.BIAYA_HASH = BIAYA_HASH;
