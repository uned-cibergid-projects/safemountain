// scripts/lib/extract.js
'use strict';

/**
 * Heurísticas para extraer permisos "usados" desde un doc de análisis.
 * Devuelve { used: Map(permission -> count), source: 'permissions|manifest|unknown' }
 * Si detecta desglose host/TPL lo devuelve como { host:Map, tpl:Map, ... }
 */
function extractUsedPermissions(analisisDoc) {
  const out = { used: new Map(), host: null, tpl: null, source: 'unknown' };
  if (!analisisDoc) return out;

  const PNAME = p => (p||'').toString().trim();

  // 1) Caso ideal: mapeos finos en permission_mapping o code_analysis
  if (analisisDoc.permission_mapping && Array.isArray(analisisDoc.permission_mapping)) {
    // Se espera algo como [{permission, owner:'host'|'tpl', count}]
    const host = new Map(), tpl = new Map();
    for (const m of analisisDoc.permission_mapping) {
      const perm = PNAME(m.permission);
      const c = Number(m.count || 1);
      if (!perm) continue;
      if (m.owner === 'tpl') tpl.set(perm, (tpl.get(perm)||0)+c);
      else host.set(perm, (host.get(perm)||0)+c);
    }
    // Totales
    const used = new Map(host);
    for (const [k,v] of tpl) used.set(k, (used.get(k)||0)+v);
    return { used, host, tpl, source: 'permission_mapping' };
  }

  // 2) Si permissions es objeto con arrays por peligrosidad
  if (analisisDoc.permissions && typeof analisisDoc.permissions === 'object') {
    const used = new Map();
    const buckets = ['dangerous','normal','signature','unknown','others','list','declared','granted'];
    for (const b of buckets) {
      const arr = analisisDoc.permissions[b];
      if (Array.isArray(arr)) {
        for (const p of arr) {
          const perm = typeof p === 'string' ? p : (p && p.permission) ? p.permission : null;
          if (!perm) continue;
          used.set(perm, (used.get(perm)||0)+1);
        }
      }
    }
    if (used.size>0) return { used, host: null, tpl: null, source: 'permissions' };
  }

  // 3) Fallback: manifest_analysis con uses-permission
  if (Array.isArray(analisisDoc.manifest_analysis)) {
    const used = new Map();
    for (const it of analisisDoc.manifest_analysis) {
      // heurística: it.name || it.permission || it.uses
      const perm = it?.name || it?.permission || it?.uses || null;
      if (!perm) continue;
      const p = PNAME(perm);
      if (!p) continue;
      used.set(p, (used.get(p)||0)+1);
    }
    if (used.size>0) return { used, host: null, tpl: null, source: 'manifest_analysis' };
  }

  return out;
}

/**
 * Carga "policy matches" desde:
 *  - colección Mongo (si tiene docs)
 *  - o fichero JSON/CSV local: scripts/in/<package>.policy.(json|csv)
 * Devuelve array: [{ permission, sentence, sim }]
 */
const fs = require('fs');
const path = require('path');
function loadPolicyMatches({pkg, PolicyModel}) {
  return (async () => {
    // 1) Colección Mongo
    if (PolicyModel) {
      try {
        const doc = await PolicyModel.findOne({ package: pkg }).lean();
        if (doc && Array.isArray(doc.matches) && doc.matches.length) {
          return doc.matches.map(m => ({
            permission: m.permission,
            sentence: m.sentence || m.text || '',
            sim: Number(m.sim || m.similarity || 0)
          }));
        }
      } catch(e) { /* ignore */ }
    }
    // 2) Fichero local
    const base = path.join(__dirname, '..', 'in');
    const j = path.join(base, `${pkg}.policy.json`);
    const c = path.join(base, `${pkg}.policy.csv`);
    if (fs.existsSync(j)) {
      const arr = JSON.parse(fs.readFileSync(j,'utf8'));
      return arr.map(m => ({ permission: m.permission, sentence: m.sentence||'', sim: Number(m.sim||0) }));
    }
    if (fs.existsSync(c)) {
      const raw = fs.readFileSync(c,'utf8').split(/\r?\n/).filter(x=>x.trim().length);
      const out = [];
      // CSV esperado: permission,sim,sentence
      for (const line of raw.slice(1)) {
        const [permission, sim, ...rest] = line.split(',');
        const sentence = rest.join(',').trim();
        out.push({ permission: permission.trim(), sim: Number(sim), sentence });
      }
      return out;
    }
    return []; // no hay matches
  })();
}

module.exports = { extractUsedPermissions, loadPolicyMatches };
