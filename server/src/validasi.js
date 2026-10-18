"use strict";
const crypto = require("crypto");

const PERAN = ["admin", "gpm", "gkm", "pimpinan"];
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

class GalatValidasi extends Error {
  constructor(pesan, status){ super(pesan); this.status = status || 400; }
}

const teks = (v, nama, maks, wajib) => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  if (wajib && !s) throw new GalatValidasi(nama + " wajib diisi.");
  if (s.length > maks) throw new GalatValidasi(nama + " maksimal " + maks + " karakter.");
  return s || null;
};

function username(v){
  const u = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(u)) throw new GalatValidasi("Username 3-32 karakter: huruf kecil, angka, titik, minus, atau garis bawah.");
  return u;
}
function email(v){
  const e = teks(v, "Email", 160, false);
  if (e && !EMAIL_RE.test(e)) throw new GalatValidasi("Format email tidak valid.");
  return e ? e.toLowerCase() : null;
}
function peran(v){
  if (!PERAN.includes(v)) throw new GalatValidasi("Peran harus salah satu dari: " + PERAN.join(", ") + ".");
  return v;
}
function sandi(v, min, user){
  if (typeof v !== "string" || v.length < min) throw new GalatValidasi("Password minimal " + min + " karakter.");
  if (v.length > 128) throw new GalatValidasi("Password maksimal 128 karakter.");
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) throw new GalatValidasi("Password harus mengandung huruf dan angka.");
  if (user && v.toLowerCase().includes(user.toLowerCase())) throw new GalatValidasi("Password tidak boleh memuat username.");
  return v;
}

/* Password sementara yang mudah dibaca (tanpa 0/O, 1/l/I), 14 karakter, selalu ada huruf dan angka. */
function sandiSementara(){
  const huruf = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ", angka = "23456789", semua = huruf + angka;
  const pilih = s => s[crypto.randomInt(s.length)];
  const c = [pilih(huruf), pilih(angka), ...Array.from({length: 12}, () => pilih(semua))];
  for (let i = c.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [c[i], c[j]] = [c[j], c[i]]; }
  return c.join("");
}

module.exports = {PERAN, GalatValidasi, teks, username, email, peran, sandi, sandiSementara};
