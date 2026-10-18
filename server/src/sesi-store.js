"use strict";
/* Penyimpan sesi express-session di tabel `sesi` MySQL (memakai pool mysql2 yang sama).
 * Kolom pengguna_id memungkinkan semua sesi satu akun diputus sekaligus
 * (saat password diganti/direset, akun dinonaktifkan atau dihapus). */
const session = require("express-session");
const {q} = require("./db");

class SesiMySQL extends session.Store {
  constructor(){
    super();
    // Bersihkan sesi kedaluwarsa tiap 15 menit.
    this.timer = setInterval(() => q("DELETE FROM sesi WHERE kedaluwarsa < ?", [Date.now()]).catch(() => {}), 15 * 60 * 1000);
    this.timer.unref();
  }
  kedaluwarsa(s){
    return s && s.cookie && s.cookie.expires ? new Date(s.cookie.expires).getTime() : Date.now() + 30 * 60 * 1000;
  }
  get(sid, cb){
    q("SELECT data, kedaluwarsa FROM sesi WHERE sid = ?", [sid])
      .then(r => cb(null, r[0] && r[0].kedaluwarsa > Date.now() ? JSON.parse(r[0].data) : null), cb);
  }
  set(sid, s, cb){
    q("INSERT INTO sesi (sid, pengguna_id, data, kedaluwarsa) VALUES (?, ?, ?, ?) " +
      "ON DUPLICATE KEY UPDATE pengguna_id = VALUES(pengguna_id), data = VALUES(data), kedaluwarsa = VALUES(kedaluwarsa)",
      [sid, s.uid || null, JSON.stringify(s), this.kedaluwarsa(s)]).then(() => cb && cb(), cb);
  }
  touch(sid, s, cb){
    q("UPDATE sesi SET kedaluwarsa = ? WHERE sid = ?", [this.kedaluwarsa(s), sid]).then(() => cb && cb(), cb);
  }
  destroy(sid, cb){
    q("DELETE FROM sesi WHERE sid = ?", [sid]).then(() => cb && cb(), cb);
  }
}

/* Putus semua sesi milik akun, kecuali sesi `kecuali` (sesi yang sedang dipakai). */
const putusSesiPengguna = (penggunaId, kecuali) =>
  q("DELETE FROM sesi WHERE pengguna_id = ? AND sid <> ?", [penggunaId, kecuali || ""]);

module.exports = {SesiMySQL, putusSesiPengguna};
