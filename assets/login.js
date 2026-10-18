"use strict";
(() => {
  const f = document.getElementById("f"), b = document.getElementById("b"), msg = document.getElementById("msg");
  const tampil = (teks, jenis) => { msg.textContent = teks; msg.className = "login-msg " + jenis; msg.hidden = !teks; };

  if (Auth.sesi()) { location.replace(Auth.tujuanSetelahLogin()); return; }
  const p = Auth.pesan();
  if (p) tampil(p, "info");
  if (!window.crypto || !crypto.subtle) tampil("Browser ini tidak mendukung Web Crypto. Buka portal melalui https:// atau http://localhost.", "err");

  f.addEventListener("submit", async e => {
    e.preventDefault();
    const u = f.username.value.trim(), pw = f.password.value;
    if (!u || !pw) { tampil("Isi username dan password.", "err"); return; }
    b.disabled = true; b.textContent = "Memeriksa…"; tampil("", "info");
    try {
      await Auth.login(u, pw);
      location.replace(Auth.tujuanSetelahLogin());
    } catch (err) {
      tampil(err.message, "err");
      f.password.value = ""; f.password.focus();
      b.disabled = false; b.textContent = "Masuk";
    }
  });
})();
