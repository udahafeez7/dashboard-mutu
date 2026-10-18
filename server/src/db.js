"use strict";
const mysql = require("mysql2/promise");
const {db} = require("./config");

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  dateStrings: false,
  timezone: "local",
  multipleStatements: false,
});

/* q("SELECT ... WHERE id = ?", [id]) -> baris */
async function q(sql, params){
  const [rows] = await pool.execute(sql, params || []);
  return rows;
}
const satu = async (sql, params) => (await q(sql, params))[0] || null;

/* ---------- pengaturan sistem (dengan cache singkat) ---------- */
const BAWAAN = {
  sesi_idle_menit: 30,
  sesi_maks_jam: 8,
  maks_gagal_login: 5,
  kunci_menit: 15,
  sandi_min: 10,
};
const BATAS = {
  sesi_idle_menit: [5, 240],
  sesi_maks_jam: [1, 24],
  maks_gagal_login: [3, 20],
  kunci_menit: [1, 1440],
  sandi_min: [8, 64],
};
let cache = null, cacheWaktu = 0;
async function pengaturan(){
  if (cache && Date.now() - cacheWaktu < 30000) return cache;
  const rows = await q("SELECT kunci, nilai FROM pengaturan");
  const p = {...BAWAAN};
  for (const r of rows) if (r.kunci in BAWAAN) p[r.kunci] = Number(r.nilai);
  cache = p; cacheWaktu = Date.now();
  return p;
}
const resetCachePengaturan = () => { cache = null; };

module.exports = {pool, q, satu, pengaturan, resetCachePengaturan, BAWAAN, BATAS};
