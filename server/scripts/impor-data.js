"use strict";
/* Mengimpor file JSON data mutu sebagai versi terbaru.
 *   npm run impor-data                      (default: ../sumber/mutu.json)
 *   npm run impor-data -- path/ke/file.json "catatan versi"
 */
const fs = require("fs");
const path = require("path");
const config = require("../src/config");
const {pool} = require("../src/db");
const {periksa, simpan} = require("../src/routes/mutu");

(async () => {
  const file = path.resolve(process.argv[2] || path.join(config.akar, "sumber", "mutu.json"));
  const isi = periksa(JSON.parse(fs.readFileSync(file, "utf8")));
  const id = await simpan(isi, process.argv[3] || "Impor dari " + path.basename(file), null);
  console.log(`✓ Versi #${id} tersimpan: ${isi.indikator.length} IKSS, ${isi.tindak_lanjut.length} tindak lanjut`);
  await pool.end();
})().catch(async e => { console.error("✗ Gagal:", e.message); await pool.end(); process.exit(1); });
