"use strict";
const {q} = require("./db");

/* Catat aktivitas penting untuk audit (siapa, melakukan apa, terhadap apa, dari mana). */
async function catat(req, aksi, target, detail, pelaku){
  const u = pelaku || (req && req.pengguna) || null;
  try {
    await q("INSERT INTO log_aktivitas (pengguna_id, username, aksi, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
      [u ? u.id : null, u ? u.username : null, aksi, target ? String(target).slice(0, 120) : null,
        detail ? String(detail).slice(0, 255) : null, req ? String(req.ip || "").slice(0, 45) : null]);
  } catch (e) {
    console.error("Gagal mencatat log:", e.message);
  }
}

module.exports = {catat};
