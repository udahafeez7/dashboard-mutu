"use strict";
const express = require("express");
const {q, satu} = require("../db");
const {wajibLogin, wajibPeran} = require("../auth");
const {catat} = require("../log");
const v = require("../validasi");

const r = express.Router();

/* Versi terbaru disimpan di memori; dimuat ulang bila id versi di database berubah. */
let cache = {id: null, isi: null};
async function terbaru(){
  const baris = await satu("SELECT id FROM data_mutu ORDER BY id DESC LIMIT 1");
  if (!baris) return null;
  if (cache.id !== baris.id) {
    const d = await satu("SELECT isi FROM data_mutu WHERE id = ?", [baris.id]);
    cache = {id: baris.id, isi: JSON.parse(d.isi)};
  }
  return cache.isi;
}
async function daftarProdi(){
  const d = await terbaru();
  return d && Array.isArray(d.prodi) ? d.prodi.map(p => p.nama) : [];
}

/* Struktur minimum yang dibutuhkan dashboard. */
function periksa(isi){
  if (!isi || typeof isi !== "object" || Array.isArray(isi)) throw new v.GalatValidasi("Isi harus berupa objek JSON.");
  for (const k of ["meta", "sasaran", "prodi", "indikator", "tindak_lanjut", "akreditasi"]) {
    if (!(k in isi)) throw new v.GalatValidasi(`Data tidak memiliki bagian "${k}".`);
  }
  for (const k of ["sasaran", "prodi", "indikator", "tindak_lanjut", "akreditasi"]) {
    if (!Array.isArray(isi[k])) throw new v.GalatValidasi(`Bagian "${k}" harus berupa daftar (array).`);
  }
  for (const k of ["tahun_berjalan", "triwulan_berjalan", "tahun_target"]) {
    if (!(k in isi.meta)) throw new v.GalatValidasi(`meta.${k} wajib ada.`);
  }
  return isi;
}
async function simpan(isi, catatan, req){
  const teks = JSON.stringify(isi);
  const h = await q("INSERT INTO data_mutu (isi, catatan, ukuran_byte, diunggah_oleh) VALUES (?, ?, ?, ?)",
    [teks, catatan, Buffer.byteLength(teks), req && req.pengguna ? req.pengguna.id : null]);
  return h.insertId;
}

r.get("/", wajibLogin, async (req, res, next) => {
  try {
    const d = await terbaru();
    if (!d) return res.status(404).json({galat: "Data mutu belum diunggah. Minta admin/GPM mengunggahnya di menu Pengaturan > Data Dashboard."});
    res.set("Cache-Control", "no-store").json(d);
  } catch (e) { next(e); }
});

r.get("/prodi", wajibLogin, async (req, res, next) => {
  try { res.json({prodi: await daftarProdi()}); } catch (e) { next(e); }
});

r.get("/riwayat", wajibLogin, wajibPeran("admin", "gpm"), async (req, res, next) => {
  try {
    res.json({riwayat: await q(
      "SELECT d.id, d.catatan, d.ukuran_byte, d.diunggah_pada, p.username AS oleh, p.nama AS oleh_nama " +
      "FROM data_mutu d LEFT JOIN pengguna p ON p.id = d.diunggah_oleh ORDER BY d.id DESC LIMIT 50")});
  } catch (e) { next(e); }
});

r.post("/", wajibLogin, wajibPeran("admin", "gpm"), async (req, res, next) => {
  try {
    const isi = periksa(req.body.isi);
    const catatan = v.teks(req.body.catatan, "Catatan", 255, false);
    const id = await simpan(isi, catatan, req);
    await catat(req, "data_diunggah", "versi #" + id, catatan);
    res.status(201).json({id, ringkas: {indikator: isi.indikator.length, tindak_lanjut: isi.tindak_lanjut.length, prodi: isi.prodi.length}});
  } catch (e) { next(e); }
});

/* Memulihkan versi lama dengan menyalinnya menjadi versi terbaru (riwayat tetap utuh). */
r.post("/:id/pulihkan", wajibLogin, wajibPeran("admin"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = Number.isInteger(id) ? await satu("SELECT isi FROM data_mutu WHERE id = ?", [id]) : null;
    if (!d) throw new v.GalatValidasi("Versi tidak ditemukan.", 404);
    const baru = await simpan(JSON.parse(d.isi), "Pemulihan dari versi #" + id, req);
    await catat(req, "data_dipulihkan", "versi #" + id, "menjadi versi #" + baru);
    res.status(201).json({id: baru});
  } catch (e) { next(e); }
});

module.exports = r;
module.exports.daftarProdi = daftarProdi;
module.exports.periksa = periksa;
module.exports.simpan = simpan;
