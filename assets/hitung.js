/* Rumus capaian mutu yang dipakai bersama oleh beranda portal dan dashboard. */
"use strict";
const Mutu = (() => {
  const hariIni = () => new Date().toISOString().slice(0, 10);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const yIdx = D => D.meta.tahun_target.indexOf(D.meta.tahun_berjalan);
  const hasData = i => Array.isArray(i.realisasi) && i.realisasi.length > 0;
  const lastTW = i => i.realisasi.length - 1;

  /* Target pada triwulan tw; indikator kumulatif dibandingkan dengan target pro-rata. */
  function targetNow(D, i, tw){
    const t = i.target[yIdx(D)];
    return i.tipe === "kumulatif" ? t * (tw + 1) / 4 : t;
  }
  /* Rasio realisasi terhadap target; untuk arah "turun", makin kecil makin baik. */
  function rasio(D, i, tw){
    const v = i.realisasi[tw], t = targetNow(D, i, tw);
    if (i.arah === "turun") return t === 0 ? (v === 0 ? 1 : 0) : (v === 0 ? 1.2 : t / v);
    return t === 0 ? (v > 0 ? 1.2 : 0) : v / t;
  }
  const capaian = (D, i) => hasData(i) ? Math.min(rasio(D, i, lastTW(i)), 1.2) * 100 : null;
  const tlStatus = (t, today) => t.status !== "Selesai" && t.tenggat < (today || hariIni()) ? "Terlambat" : t.status;

  function ringkas(D){
    const I = D.indikator, terisi = I.filter(hasData), T = D.tindak_lanjut, A = D.akreditasi, today = hariIni();
    const p6 = I.find(i => i.kunci === "akreditasi_unggul");
    const p6t = p6 ? p6.target[yIdx(D)] : null;
    return {
      ikssTotal: I.length,
      ikssTerisi: terisi.length,
      ikssSesuai: terisi.filter(i => rasio(D, i, lastTW(i)) >= 1).length,
      capaianRata: avg(terisi.map(i => capaian(D, i))),
      tlTotal: T.length,
      tlSelesai: T.filter(t => t.status === "Selesai").length,
      tlTerlambat: T.filter(t => tlStatus(t, today) === "Terlambat").length,
      prodiTotal: A.length,
      prodiUnggul: A.filter(a => a.peringkat_saat_ini === "Unggul").length,
      p6Target: p6t,
      p6Butuh: p6t != null ? Math.round(p6t / 100 * A.length) : null,
    };
  }

  return {avg, yIdx, hasData, lastTW, targetNow, rasio, capaian, tlStatus, ringkas, hariIni};
})();
