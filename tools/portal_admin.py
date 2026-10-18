"""Alat admin Portal Mutu FTI: kelola akun dan enkripsi data dashboard.

Situs berjalan statis di GitHub Pages, jadi login dijaga dengan enkripsi:
  data/mutu.enc.json  data dashboard (sumber/mutu.json) dienkripsi AES-256-GCM dengan kunci data K
  data/akun.json      tiap akun menyimpan K yang dibungkus kunci turunan password (PBKDF2-SHA256)
Kunci K tidak pernah disimpan di disk: alat ini membukanya dari akun admin saat dibutuhkan.
Format harus sejalan dengan assets/auth.js.

Perintah (jalankan dari folder repositori):
  python tools/portal_admin.py init --admin USER --nama "Nama Admin"
  python tools/portal_admin.py tambah-akun USER --nama "Nama" --peran gkm --prodi "Sistem Informasi"
  python tools/portal_admin.py hapus-akun USER
  python tools/portal_admin.py ubah-sandi USER
  python tools/portal_admin.py daftar-akun
  python tools/portal_admin.py enkripsi

Password diminta lewat prompt. Untuk otomasi bisa diisi lewat variabel lingkungan:
  PORTAL_SANDI          password akun yang dibuat/diubah
  PORTAL_LOGIN, PORTAL_LOGIN_SANDI   akun yang menjalankan perintah (admin/gpm)

Butuh: pip install cryptography
"""
import argparse, base64, datetime, getpass, hashlib, json, os, re, secrets, sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Paket 'cryptography' belum terpasang. Jalankan: pip install cryptography")

ROOT = Path(__file__).resolve().parent.parent
AKUN = ROOT / "data" / "akun.json"
DATA_ENC = ROOT / "data" / "mutu.enc.json"
SUMBER = ROOT / "sumber" / "mutu.json"
ITERASI = 600_000
PERAN = ("admin", "gpm", "gkm", "pimpinan")
MIN_SANDI = 10
USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,32}$")

b64 = lambda b: base64.b64encode(b).decode()
unb64 = base64.b64decode


def akun_id(pepper, username):
    return hashlib.sha256(f"{pepper}:{username.strip().lower()}".encode()).hexdigest()


def kek(sandi, salt, iterasi):
    return hashlib.pbkdf2_hmac("sha256", sandi.encode(), salt, iterasi, dklen=32)


def seal(key, obj, aad):
    iv = secrets.token_bytes(12)
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), aad.encode())
    return {"iv": b64(iv), "ct": b64(ct)}


def unseal(key, box, aad):
    return json.loads(AESGCM(key).decrypt(unb64(box["iv"]), unb64(box["ct"]), aad.encode()))


def tulis(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    tmp.replace(path)


def muat_db():
    if not AKUN.exists():
        sys.exit(f"{AKUN.relative_to(ROOT)} belum ada. Jalankan dulu: python tools/portal_admin.py init")
    return json.loads(AKUN.read_text(encoding="utf-8"))


def cek_username(u):
    u = u.strip().lower()
    if not USERNAME_RE.match(u):
        sys.exit("Username hanya boleh huruf kecil, angka, titik, minus, garis bawah (3-32 karakter).")
    return u


def minta_sandi_baru(username):
    s = os.environ.get("PORTAL_SANDI")
    if s is None:
        s = getpass.getpass(f"Password baru untuk {username}: ")
        if getpass.getpass("Ulangi password: ") != s:
            sys.exit("Password tidak sama.")
    if len(s) < MIN_SANDI:
        sys.exit(f"Password minimal {MIN_SANDI} karakter.")
    if s.lower() == username or s.isdigit():
        sys.exit("Password terlalu mudah ditebak.")
    return s


def buka(db, username, sandi):
    """Kembalikan (entri, isi) bila password benar, atau None."""
    a = next((x for x in db["akun"] if x["id"] == akun_id(db["pepper"], username)), None)
    if not a:
        return None
    try:
        return a, unseal(kek(sandi, unb64(a["salt"]), a["iterasi"]), a["kunci"], "akun:" + a["id"])
    except Exception:
        return None


def login(db, peran_boleh, username=None):
    username = username or os.environ.get("PORTAL_LOGIN") or input("Masuk sebagai (username): ")
    sandi = os.environ.get("PORTAL_LOGIN_SANDI")
    if sandi is None:
        sandi = getpass.getpass(f"Password {username}: ")
    r = buka(db, username, sandi)
    if not r:
        sys.exit("Username atau password salah.")
    isi = r[1]
    if isi["peran"] not in peran_boleh:
        sys.exit(f"Perintah ini hanya untuk peran: {', '.join(peran_boleh)}.")
    return isi, unb64(isi["k"])


def entri(db, k, username, sandi, nama, peran, prodi):
    i = akun_id(db["pepper"], username)
    salt = secrets.token_bytes(16)
    dibuat = datetime.date.today().isoformat()
    profil = {"u": username, "nama": nama, "peran": peran, "prodi": prodi, "dibuat": dibuat}
    return {"id": i, "salt": b64(salt), "iterasi": ITERASI,
            "kunci": seal(kek(sandi, salt, ITERASI), {**profil, "k": b64(k)}, "akun:" + i),
            "profil": seal(k, profil, "profil:" + i)}


def nama_prodi():
    try:
        return [p["nama"] for p in json.loads(SUMBER.read_text(encoding="utf-8"))["prodi"]]
    except Exception:
        return None


def enkripsi_data(k):
    if not SUMBER.exists():
        sys.exit(f"{SUMBER.relative_to(ROOT)} tidak ditemukan.")
    data = json.loads(SUMBER.read_text(encoding="utf-8"))
    for kunci in ("meta", "indikator", "tindak_lanjut", "akreditasi", "prodi", "sasaran"):
        if kunci not in data:
            sys.exit(f"sumber/mutu.json tidak memiliki bagian '{kunci}'.")
    tulis(DATA_ENC, {"versi": 1, "alg": "AES-256-GCM", **seal(k, data, "mutu.json")})
    print(f"Terenkripsi: {SUMBER.relative_to(ROOT)} -> {DATA_ENC.relative_to(ROOT)} (diperbarui {data['meta'].get('diperbarui')})")


def cmd_init(a):
    if AKUN.exists() and not a.paksa:
        sys.exit("data/akun.json sudah ada. Gunakan --paksa untuk membuat kunci data baru "
                 "(SEMUA akun lama terhapus dan harus dibuat ulang).")
    u = cek_username(a.admin)
    k = secrets.token_bytes(32)
    db = {"versi": 1, "kdf": "PBKDF2-SHA256", "iterasi": ITERASI, "pepper": secrets.token_hex(16), "akun": []}
    db["akun"].append(entri(db, k, u, minta_sandi_baru(u), a.nama, "admin", None))
    tulis(AKUN, db)
    enkripsi_data(k)
    print(f"Portal siap. Akun admin '{u}' dibuat.")


def cmd_tambah(a):
    db = muat_db()
    _, k = login(db, ("admin",))
    u = cek_username(a.username)
    i = akun_id(db["pepper"], u)
    if any(x["id"] == i for x in db["akun"]):
        sys.exit(f"Akun '{u}' sudah ada. Hapus dulu bila ingin mengganti peran/prodi.")
    if a.peran == "gkm" and not a.prodi:
        sys.exit("Akun GKM wajib diisi --prodi.")
    daftar = nama_prodi()
    if a.prodi and daftar and a.prodi not in daftar:
        sys.exit(f"Prodi tidak dikenal. Pilihan: {', '.join(daftar)}")
    db["akun"].append(entri(db, k, u, minta_sandi_baru(u), a.nama, a.peran, a.prodi))
    tulis(AKUN, db)
    print(f"Akun '{u}' ({a.peran}) ditambahkan. Commit data/akun.json agar berlaku.")


def cmd_hapus(a):
    db = muat_db()
    isi, _ = login(db, ("admin",))
    u = cek_username(a.username)
    if u == isi["u"]:
        sys.exit("Tidak bisa menghapus akun yang sedang dipakai.")
    i = akun_id(db["pepper"], u)
    sisa = [x for x in db["akun"] if x["id"] != i]
    if len(sisa) == len(db["akun"]):
        sys.exit(f"Akun '{u}' tidak ditemukan.")
    db["akun"] = sisa
    tulis(AKUN, db)
    print(f"Akun '{u}' dihapus. Commit data/akun.json agar berlaku.\n"
          "Catatan: pengguna yang sudah pernah login secara teknis bisa saja menyimpan kunci data. "
          "Bila akun dicabut karena alasan keamanan, jalankan 'init --paksa' lalu buat ulang semua akun.")


def cmd_ubah_sandi(a):
    db = muat_db()
    u = cek_username(a.username)
    # Pemilik akun (dengan password lama) atau admin boleh mengganti password.
    sebagai = os.environ.get("PORTAL_LOGIN") or input(f"Masuk sebagai (Enter = {u}): ").strip() or u
    pelaku, k = login(db, PERAN if sebagai == u else ("admin",), sebagai)
    i = akun_id(db["pepper"], u)
    lama = next((x for x in db["akun"] if x["id"] == i), None)
    if not lama:
        sys.exit(f"Akun '{u}' tidak ditemukan.")
    p = unseal(k, lama["profil"], "profil:" + i)
    baru = entri(db, k, u, minta_sandi_baru(u), p["nama"], p["peran"], p.get("prodi"))
    baru["profil"] = seal(k, {**p}, "profil:" + i)  # pertahankan tanggal dibuat
    db["akun"] = [baru if x["id"] == i else x for x in db["akun"]]
    tulis(AKUN, db)
    print(f"Password '{u}' diganti oleh '{pelaku['u']}'. Commit data/akun.json agar berlaku.")


def cmd_daftar(a):
    db = muat_db()
    _, k = login(db, ("admin",))
    rows = sorted((unseal(k, x["profil"], "profil:" + x["id"]) for x in db["akun"]), key=lambda r: r["u"])
    for r in rows:
        print(f"{r['u']:<20} {r['peran']:<9} {(r.get('prodi') or '-'):<22} {r['nama']}  (dibuat {r.get('dibuat', '-')})")


def cmd_enkripsi(a):
    db = muat_db()
    _, k = login(db, ("admin", "gpm"))
    enkripsi_data(k)
    print("Commit data/mutu.enc.json agar dashboard diperbarui.")


def main():
    ap = argparse.ArgumentParser(description="Kelola akun dan data terenkripsi Portal Mutu FTI.")
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("init", help="buat kunci data baru dan akun admin pertama")
    p.add_argument("--admin", required=True); p.add_argument("--nama", required=True)
    p.add_argument("--paksa", action="store_true", help="timpa akun.json lama (rotasi kunci)")
    p.set_defaults(f=cmd_init)
    p = sp.add_parser("tambah-akun", help="tambah akun baru (admin)")
    p.add_argument("username"); p.add_argument("--nama", required=True)
    p.add_argument("--peran", choices=PERAN, required=True); p.add_argument("--prodi")
    p.set_defaults(f=cmd_tambah)
    p = sp.add_parser("hapus-akun", help="hapus akun (admin)"); p.add_argument("username"); p.set_defaults(f=cmd_hapus)
    p = sp.add_parser("ubah-sandi", help="ganti password akun"); p.add_argument("username"); p.set_defaults(f=cmd_ubah_sandi)
    sp.add_parser("daftar-akun", help="tampilkan semua akun (admin)").set_defaults(f=cmd_daftar)
    sp.add_parser("enkripsi", help="enkripsi ulang sumber/mutu.json (admin/gpm)").set_defaults(f=cmd_enkripsi)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
