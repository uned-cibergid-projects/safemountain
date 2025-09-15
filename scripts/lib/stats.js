// scripts/lib/stats.js
'use strict';

/** Wilson score interval para proporciones (95% por defecto) */
function wilson(pHat, n, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0, p: 0 };
  const denom = 1 + (z*z)/n;
  const center = (pHat + (z*z)/(2*n)) / denom;
  const half = (z * Math.sqrt((pHat*(1-pHat)/n) + (z*z)/(4*n*n))) / denom;
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half), p: pHat };
}

/** Bootstrap BCa simple para la media (percentiles 2.5/97.5); B=2000 por defecto */
function bootstrapMeanCI(arr, B = 2000, alpha = 0.05, rng = Math.random) {
  if (!arr || arr.length === 0) return { mean: NaN, lo: NaN, hi: NaN };
  const n = arr.length;
  const origMean = arr.reduce((a,b)=>a+b,0)/n;
  const boots = new Array(B);
  for (let b=0; b<B; b++) {
    let s = 0;
    for (let i=0; i<n; i++) s += arr[Math.floor(rng()*n)];
    boots[b] = s/n;
  }
  boots.sort((a,b)=>a-b);
  const lo = boots[Math.floor((alpha/2)*B)];
  const hi = boots[Math.floor((1 - alpha/2)*B)];
  return { mean: origMean, lo, hi };
}

/** Sensibilidad a umbral: calcula tasa de incoherencia para un conjunto de umbrales */
function thresholdSweep(maxSims, usedFlags, thresholds=[0.7,0.75,0.8,0.85,0.9]) {
  // maxSims: array de similitudes máximas por permiso; usedFlags: array booleana (hay uso en código host+tpl)
  // devuelve [{thr, rate, n, wilson:{...}}]
  const out = [];
  const n = maxSims.length;
  thresholds.forEach(thr=>{
    let incoh = 0, total = 0;
    for (let i=0;i<n;i++){
      if (!usedFlags[i]) continue; // solo permisos usados
      total++;
      if (maxSims[i] < thr) incoh++;
    }
    const pHat = total>0 ? incoh/total : 0;
    out.push({ thr, rate: pHat, n: total, wilson: wilson(pHat, total) });
  });
  return out;
}

module.exports = { wilson, bootstrapMeanCI, thresholdSweep };
