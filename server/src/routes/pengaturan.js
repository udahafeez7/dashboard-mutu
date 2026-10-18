"use strict";
const express = require("express");
const {q, pengaturan, resetCachePengaturan, BAWAAN, BATAS} = require("../db");
const {wajibLogin, wajibPeran} = require("../auth");
const {catat} = require("../log");
const v = require("../validasi");

const r = express.Router();

r.get("/", wajibLogin, wajibPeran("admin"), async (req, res, next) => {
  try { res.json({pengaturan: await pengaturan(), bawaan: BAWAAN, batas: BATAS}); } catch (e) { next(e); }
});

r.put("/", wajibLogin, wajibPeran("admin"), async (req, res, next) => {
  try {
    const lama = await pengaturan(), berubah = [];
    for (const [k, [min, maks]] of Object.entries(BATAS)) {
      if (req.body[k] === undefined) continue;
      const n = Number(req.body[k]);
      if (!Number.isInteger(n) || n < min || n > maks) throw new v.GalatValidasi(`Nilai ${k} harus bilangan bulat ${min}-${maks}.`);
      if (n !== lama[k]) {
        await q("INSERT INTO pengaturan (kunci, nilai, diubah_oleh) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nilai = VALUES(nilai), diubah_oleh = VALUES(diubah_oleh)",
          [k, String(n), req.pengguna.id]);
        berubah.push(`${k} ${lama[k]}→${n}`);
      }
    }
    resetCachePengaturan();
    if (berubah.length) await catat(req, "pengaturan_diubah", "keamanan", berubah.join("; "));
    res.json({pengaturan: await pengaturan(), berubah: berubah.length});
  } catch (e) { next(e); }
});

/* Log aktivitas untuk audit. */
r.get("/log", wajibLogin, wajibPeran("admin"), async (req, res, next) => {
  try {
    const batas = Math.min(500, Math.max(1, Number(req.query.batas) || 200));
    const cari = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
    const rows = cari
      ? await q("SELECT id, username, aksi, target, detail, ip, waktu FROM log_aktivitas WHERE username LIKE ? OR aksi LIKE ? OR target LIKE ? ORDER BY id DESC LIMIT " + batas,
        ["%" + cari + "%", "%" + cari + "%", "%" + cari + "%"])
      : await q("SELECT id, username, aksi, target, detail, ip, waktu FROM log_aktivitas ORDER BY id DESC LIMIT " + batas);
    res.json({log: rows});
  } catch (e) { next(e); }
});

module.exports = r;
