"use strict";
/* Menyiapkan database Portal Mutu (aman dijalankan berulang):
 *   1. membuat tabel dari sql/skema.sql
 *   2. mengisi pengaturan bawaan
 *   3. membuat admin pertama bila belum ada admin
 *   4. mengimpor sumber/mutu.json bila tabel data_mutu masih kosong
 *
 * Pemakaian:
 *   npm run siapkan -- --admin admin --nama "Admin GPM FTI"
 * Password admin pertama dibuat acak dan ditampilkan SEKALI; wajib diganti saat masuk pertama.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const config = require("../src/config");
const v = require("../src/validasi");

const arg = nama => { const i = process.argv.indexOf("--" + nama); return i > 0 ? process.argv[i + 1] : undefined; };

(async () => {
  const kon = await mysql.createConnection({...config.db, multipleStatements: true, charset: "utf8mb4"});
  try {
    await kon.query(fs.readFileSync(path.join(__dirname, "..", "sql", "skema.sql"), "utf8"));
    console.log("✓ Tabel siap: pengguna, sesi, log_aktivitas, pengaturan, data_mutu");

    const {BAWAAN} = require("../src/db");
    for (const [k, n] of Object.entries(BAWAAN)) await kon.execute("INSERT IGNORE INTO pengaturan (kunci, nilai) VALUES (?, ?)", [k, String(n)]);
    console.log("✓ Pengaturan bawaan terisi");

    // Pemulihan: --reset-admin USERNAME memberi password sementara baru ke akun admin tersebut
    // (hanya bisa dijalankan oleh orang yang punya akses ke server, bukan dari web).
    const reset = arg("reset-admin");
    if (reset) {
      const u = v.username(reset);
      const [[a]] = await kon.execute("SELECT id FROM pengguna WHERE username = ? AND peran = 'admin'", [u]);
      if (!a) throw new Error(`Akun admin "${u}" tidak ditemukan.`);
      const sandi = v.sandiSementara();
      await kon.execute("UPDATE pengguna SET sandi_hash = ?, wajib_ganti_sandi = 1, aktif = 1, gagal_login = 0, terkunci_sampai = NULL WHERE id = ?", [await bcrypt.hash(sandi, 12), a.id]);
      await kon.execute("DELETE FROM sesi WHERE pengguna_id = ?", [a.id]);
      await kon.execute("INSERT INTO log_aktivitas (username, aksi, target, detail) VALUES (?, 'sandi_direset', ?, 'pemulihan admin via npm run siapkan')", [u, u]);
      console.log(`\n✓ Password admin "${u}" direset`);
      console.log("  Password sementara: " + sandi);
      console.log("  Wajib diganti saat masuk.\n");
    }

    const [[{n}]] = await kon.query("SELECT COUNT(*) AS n FROM pengguna WHERE peran = 'admin'");
    if (n === 0) {
      const username = v.username(arg("admin") || "admin");
      const nama = v.teks(arg("nama") || "Admin GPM FTI", "Nama", 120, true);
      const sandi = v.sandiSementara();
      await kon.execute("INSERT INTO pengguna (username, nama, peran, sandi_hash, wajib_ganti_sandi) VALUES (?, ?, 'admin', ?, 1)",
        [username, nama, await bcrypt.hash(sandi, 12)]);
      await kon.execute("INSERT INTO log_aktivitas (username, aksi, target, detail) VALUES (?, 'akun_dibuat', ?, 'admin pertama via npm run siapkan')", [username, username]);
      console.log("\n✓ Admin pertama dibuat");
      console.log("  Username         : " + username);
      console.log("  Password sementara: " + sandi);
      console.log("  Simpan sekarang; password ini tidak ditampilkan lagi dan wajib diganti saat masuk pertama.\n");
    } else {
      console.log(`✓ Sudah ada ${n} admin; tidak membuat admin baru`);
    }

    const [[{d}]] = await kon.query("SELECT COUNT(*) AS d FROM data_mutu");
    const sumber = path.join(config.akar, "sumber", "mutu.json");
    if (d === 0 && fs.existsSync(sumber)) {
      const {periksa} = require("../src/routes/mutu");
      const isi = periksa(JSON.parse(fs.readFileSync(sumber, "utf8")));
      const teks = JSON.stringify(isi);
      await kon.execute("INSERT INTO data_mutu (isi, catatan, ukuran_byte) VALUES (?, ?, ?)", [teks, "Impor awal dari sumber/mutu.json", Buffer.byteLength(teks)]);
      console.log(`✓ Data mutu diimpor: ${isi.indikator.length} IKSS, ${isi.tindak_lanjut.length} tindak lanjut`);
    } else if (d === 0) {
      console.log("! Data mutu belum ada. Unggah lewat menu Pengaturan > Data Dashboard, atau jalankan: npm run impor-data -- <file.json>");
    } else {
      console.log(`✓ Data mutu sudah ada (${d} versi)`);
    }
  } finally {
    await kon.end();
    const {pool} = require("../src/db");
    await pool.end();
  }
})().catch(e => {
  console.error("✗ Gagal:", e.code === "ECONNREFUSED" ? "MySQL tidak berjalan. Nyalakan MySQL di XAMPP Control Panel." : e.message);
  process.exit(1);
});
