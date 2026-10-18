"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const {q, satu} = require("../db");
const {wajibLogin, wajibPeran} = require("../auth");
const {catat} = require("../log");
const {putusSesiPengguna} = require("../sesi-store");
const {daftarProdi} = require("./mutu");
const {BIAYA_HASH} = require("./sesi");
const v = require("../validasi");

const r = express.Router();
r.use(wajibLogin, wajibPeran("admin"));

const KOLOM = "id, username, nama, email, peran, prodi, aktif, wajib_ganti_sandi, gagal_login, terkunci_sampai, login_terakhir, sandi_diubah_pada, dibuat_pada, diubah_pada";
const ambil = id => satu("SELECT " + KOLOM + " FROM pengguna WHERE id = ?", [id]);
const idDari = req => { const id = Number(req.params.id); if (!Number.isInteger(id) || id < 1) throw new v.GalatValidasi("ID akun tidak valid.", 404); return id; };

/* Peran GKM wajib memiliki prodi yang dikenal data mutu; peran lain tidak memakai prodi. */
async function prodiUntuk(peran, prodi){
  if (peran !== "gkm") return null;
  const p = v.teks(prodi, "Prodi", 80, true), daftar = await daftarProdi();
  if (daftar.length && !daftar.includes(p)) throw new v.GalatValidasi("Prodi tidak dikenal. Pilihan: " + daftar.join(", ") + ".");
  return p;
}
/* Admin aktif terakhir tidak boleh dinonaktifkan, diturunkan, atau dihapus. */
async function jagaAdminTerakhir(target, akanTetapAdminAktif){
  if (target.peran !== "admin" || !target.aktif || akanTetapAdminAktif) return;
  const n = (await satu("SELECT COUNT(*) AS n FROM pengguna WHERE peran = 'admin' AND aktif = 1")).n;
  if (n <= 1) throw new v.GalatValidasi("Harus selalu ada minimal satu admin aktif.", 409);
}

r.get("/", async (req, res, next) => {
  try {
    const rows = await q("SELECT " + KOLOM + " FROM pengguna ORDER BY username");
    const now = new Date();
    res.json({akun: rows.map(a => ({...a, aktif: !!a.aktif, wajib_ganti_sandi: !!a.wajib_ganti_sandi,
      terkunci: !!(a.terkunci_sampai && new Date(a.terkunci_sampai) > now)})), prodi: await daftarProdi()});
  } catch (e) { next(e); }
});

/* Pendaftaran akun oleh admin. Password sementara dibuat server dan ditampilkan sekali. */
r.post("/", async (req, res, next) => {
  try {
    const username = v.username(req.body.username);
    const nama = v.teks(req.body.nama, "Nama", 120, true);
    const email = v.email(req.body.email);
    const peran = v.peran(req.body.peran);
    const prodi = await prodiUntuk(peran, req.body.prodi);
    if (await satu("SELECT id FROM pengguna WHERE username = ?", [username])) throw new v.GalatValidasi("Username sudah dipakai.", 409);
    const sementara = v.sandiSementara();
    const hasil = await q("INSERT INTO pengguna (username, nama, email, peran, prodi, sandi_hash, wajib_ganti_sandi, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
      [username, nama, email, peran, prodi, await bcrypt.hash(sementara, BIAYA_HASH), req.pengguna.id]);
    await catat(req, "akun_dibuat", username, `peran ${peran}${prodi ? ", prodi " + prodi : ""}`);
    res.status(201).json({akun: await ambil(hasil.insertId), sandi_sementara: sementara});
  } catch (e) { next(e); }
});

r.patch("/:id", async (req, res, next) => {
  try {
    const id = idDari(req), a = await ambil(id);
    if (!a) throw new v.GalatValidasi("Akun tidak ditemukan.", 404);
    const peran = req.body.peran !== undefined ? v.peran(req.body.peran) : a.peran;
    const aktif = req.body.aktif !== undefined ? !!req.body.aktif : !!a.aktif;
    if (id === req.pengguna.id && (peran !== "admin" || !aktif)) throw new v.GalatValidasi("Anda tidak bisa menonaktifkan atau menurunkan peran akun Anda sendiri.", 409);
    await jagaAdminTerakhir(a, peran === "admin" && aktif);
    const nama = req.body.nama !== undefined ? v.teks(req.body.nama, "Nama", 120, true) : a.nama;
    const email = req.body.email !== undefined ? v.email(req.body.email) : a.email;
    const prodi = await prodiUntuk(peran, req.body.prodi !== undefined ? req.body.prodi : a.prodi);
    await q("UPDATE pengguna SET nama = ?, email = ?, peran = ?, prodi = ?, aktif = ? WHERE id = ?", [nama, email, peran, prodi, aktif ? 1 : 0, id]);
    const berubah = [];
    if (peran !== a.peran) berubah.push(`peran ${a.peran}→${peran}`);
    if (aktif !== !!a.aktif) berubah.push(aktif ? "diaktifkan" : "dinonaktifkan");
    if ((prodi || null) !== (a.prodi || null)) berubah.push(`prodi ${a.prodi || "-"}→${prodi || "-"}`);
    if (nama !== a.nama || email !== a.email) berubah.push("data profil");
    if (!aktif || peran !== a.peran) await putusSesiPengguna(id);   // hak akses berubah: wajib masuk ulang
    await catat(req, aktif !== !!a.aktif ? (aktif ? "akun_diaktifkan" : "akun_dinonaktifkan") : "akun_diubah", a.username, berubah.join("; ") || "tanpa perubahan");
    res.json({akun: await ambil(id)});
  } catch (e) { next(e); }
});

r.post("/:id/reset-sandi", async (req, res, next) => {
  try {
    const id = idDari(req), a = await ambil(id);
    if (!a) throw new v.GalatValidasi("Akun tidak ditemukan.", 404);
    if (id === req.pengguna.id) throw new v.GalatValidasi("Untuk akun Anda sendiri, gunakan menu Akun Saya > Ganti password.", 409);
    const sementara = v.sandiSementara();
    await q("UPDATE pengguna SET sandi_hash = ?, wajib_ganti_sandi = 1, gagal_login = 0, terkunci_sampai = NULL WHERE id = ?",
      [await bcrypt.hash(sementara, BIAYA_HASH), id]);
    await putusSesiPengguna(id);
    await catat(req, "sandi_direset", a.username);
    res.json({sandi_sementara: sementara});
  } catch (e) { next(e); }
});

r.post("/:id/buka-kunci", async (req, res, next) => {
  try {
    const id = idDari(req), a = await ambil(id);
    if (!a) throw new v.GalatValidasi("Akun tidak ditemukan.", 404);
    await q("UPDATE pengguna SET gagal_login = 0, terkunci_sampai = NULL WHERE id = ?", [id]);
    await catat(req, "akun_dibuka_kuncinya", a.username);
    res.json({akun: await ambil(id)});
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = idDari(req), a = await ambil(id);
    if (!a) throw new v.GalatValidasi("Akun tidak ditemukan.", 404);
    if (id === req.pengguna.id) throw new v.GalatValidasi("Anda tidak bisa menghapus akun Anda sendiri.", 409);
    await jagaAdminTerakhir(a, false);
    if (req.body.konfirmasi !== a.username) throw new v.GalatValidasi("Konfirmasi tidak cocok. Ketik username akun untuk menghapus.");
    await putusSesiPengguna(id);
    await q("DELETE FROM pengguna WHERE id = ?", [id]);
    await catat(req, "akun_dihapus", a.username, `peran ${a.peran}`);
    res.json({ok: true});
  } catch (e) { next(e); }
});

module.exports = r;
