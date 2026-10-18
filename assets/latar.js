/* Latar halaman masuk: titik-titik yang melayang pelan dan terhubung garis tipis. */
"use strict";
(() => {
  const cv = document.getElementById("jaringan");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const hemat = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, titik = [], jalan = true;

  function ukur(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, Math.max(24, W * H / 26000)));
    titik = Array.from({length: n}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.8 + .8,
    }));
  }

  function gambar(){
    ctx.clearRect(0, 0, W, H);
    const D = Math.min(170, W / 6);
    for (let i = 0; i < titik.length; i++) {
      const a = titik[i];
      for (let j = i + 1; j < titik.length; j++) {
        const b = titik[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < D) {
          ctx.strokeStyle = "rgba(255,255,255," + (0.22 * (1 - d / D)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const t of titik) {
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function langkah(){
    if (!jalan) return;
    for (const t of titik) {
      t.x += t.vx; t.y += t.vy;
      if (t.x < -20) t.x = W + 20; else if (t.x > W + 20) t.x = -20;
      if (t.y < -20) t.y = H + 20; else if (t.y > H + 20) t.y = -20;
    }
    gambar();
    requestAnimationFrame(langkah);
  }

  ukur();
  addEventListener("resize", () => { ukur(); if (hemat) gambar(); });
  if (hemat) { gambar(); return; }
  document.addEventListener("visibilitychange", () => {
    jalan = !document.hidden;
    if (jalan) requestAnimationFrame(langkah);
  });
  requestAnimationFrame(langkah);
})();
