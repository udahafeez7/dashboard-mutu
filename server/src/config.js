"use strict";
const path = require("path");
require("dotenv").config({path: path.join(__dirname, "..", ".env"), quiet: true});

const wajib = k => {
  const v = process.env[k];
  if (!v) throw new Error(`Variabel ${k} belum diisi di server/.env (lihat server/.env.example).`);
  return v;
};

const produksi = process.env.NODE_ENV === "production";
const rahasia = wajib("SESSION_SECRET");
if (rahasia.length < 32) throw new Error("SESSION_SECRET minimal 32 karakter acak.");

module.exports = {
  produksi,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  // Isi "1" bila portal berada di belakang reverse proxy (Nginx/Apache) yang menangani HTTPS.
  trustProxy: process.env.TRUST_PROXY === "1",
  rahasiaSesi: rahasia,
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: wajib("DB_NAME"),
    user: wajib("DB_USER"),
    password: process.env.DB_PASS || "",
  },
  akar: path.join(__dirname, "..", ".."),   // folder repositori (halaman HTML & assets)
};
