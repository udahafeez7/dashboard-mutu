"use strict";
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const config = require("./config");
const {SesiMySQL} = require("./sesi-store");
const {muatPengguna, cekAsal} = require("./auth");
const {GalatValidasi} = require("./validasi");

const app = express();
app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "font-src": ["https://cdn.jsdelivr.net"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "base-uri": ["'none'"],
      "form-action": ["'none'"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
    },
  },
  hsts: config.produksi,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: {policy: "no-referrer"},
}));

app.use(session({
  name: "pm_sid",
  store: new SesiMySQL(),
  secret: config.rahasiaSesi,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {httpOnly: true, sameSite: "strict", secure: config.produksi, maxAge: 30 * 60000},
}));
app.use(muatPengguna);

/* ---------- API ---------- */
const api = express.Router();
api.use(express.json({limit: "6mb"}));
api.use(cekAsal);
api.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
api.use("/", require("./routes/sesi"));
api.use("/akun", require("./routes/akun"));
api.use("/mutu", require("./routes/mutu"));
api.use("/pengaturan", require("./routes/pengaturan"));
api.use((req, res) => res.status(404).json({galat: "Endpoint tidak ditemukan."}));
app.use("/api", api);

/* ---------- halaman ----------
 * Hanya file yang tercantum di sini yang disajikan; folder lain (server/, sumber/, tools/, .git)
 * tidak pernah terjangkau dari web. Halaman terlindungi dijaga juga di server, bukan hanya di browser. */
const HALAMAN = {
  "index.html": {publik: true},
  "portal.html": {},
  "dashboard.html": {},
  "akun-saya.html": {bolehWajibGanti: true},
  "kelola-akun.html": {peran: ["admin"]},
  "pengaturan.html": {peran: ["admin", "gpm"]},
};
const kirim = (res, file) => res.set("Cache-Control", "no-cache").sendFile(path.join(config.akar, file));

app.get(["/", "/index.html"], (req, res) => req.pengguna ? res.redirect("/portal.html") : kirim(res, "index.html"));
app.get("/:halaman", (req, res, next) => {
  const nama = req.params.halaman, h = HALAMAN[nama];
  if (!h || h.publik) return next();
  if (!req.pengguna) return res.redirect("/?kembali=" + encodeURIComponent(nama));
  if (req.pengguna.wajib_ganti_sandi && !h.bolehWajibGanti) return res.redirect("/akun-saya.html?wajib=1");
  if (h.peran && !h.peran.includes(req.pengguna.peran)) return res.redirect("/portal.html?tanpa_akses=1");
  kirim(res, nama);
});
app.use("/assets", express.static(path.join(config.akar, "assets"), {maxAge: config.produksi ? "1h" : 0, fallthrough: false}));
app.get("/favicon.ico", (req, res) => res.sendFile(path.join(config.akar, "assets", "img", "favicon.png")));

app.use((req, res) => res.status(404).type("text").send("Halaman tidak ditemukan."));

/* ---------- penanganan galat ---------- */
app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
  if (err instanceof GalatValidasi) return res.status(err.status).json({galat: err.message});
  if (err.type === "entity.too.large") return res.status(413).json({galat: "Ukuran data melebihi batas 6 MB."});
  if (err.type === "entity.parse.failed") return res.status(400).json({galat: "Format JSON tidak valid."});
  if (err.status === 404) return res.status(404).type("text").send("Tidak ditemukan.");
  console.error(err);
  const pesan = err.code === "ECONNREFUSED" ? "Database tidak dapat dihubungi. Pastikan MySQL (XAMPP) berjalan." : "Terjadi kesalahan di server.";
  if (req.path.startsWith("/api/")) return res.status(500).json({galat: pesan});
  res.status(500).type("text").send(pesan);
});

if (require.main === module) {
  app.listen(config.port, config.host, () => console.log(`Portal Mutu berjalan di http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`));
}
module.exports = app;
