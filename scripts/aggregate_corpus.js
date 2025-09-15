// scripts/aggregate_corpus.js
'use strict';
const fs = require('fs');
const path = require('path');

const mg = require('./lib/db'); // inicializa conexiones
const { Analisis, Apks, getAuxCollection } = mg;
const { extractUsedPermissions, loadPolicyMatches } = require('./lib/extract');
const { wilson, bootstrapMeanCI } = require('./lib/stats');

const THR = Number(process.env.SIM_THR || 0.80);
const POLICY_COLL = process.env.POLICY_COLL || 'policy_matches';
const MISSING_POLICY = process.env.MISSING_POLICY || 'skip'; // 'skip' (recomendado) | 'zero'
const CATEGORY = process.env.APP_CATEGORY || ''; // p.ej., 'SOCIAL' si tu esquema lo guarda así

function inc(map, key, by=1) {
  const k = key;
  map.set(k, (map.get(k)||0) + by);
}

(async () => {
  try {
    const Policy = getAuxCollection(POLICY_COLL, true);

    // 1) Lista de paquetes a considerar (con análisis estático existente)
    const analDocs = await Analisis.find({}, { package_name:1 }).lean();
    const pkgs = analDocs.map(d => d.package_name).filter(Boolean);

    // 2) Pre-carga metadatos de APKs (para categoría si quieres filtrar)
    const apkDocs = await Apks.find({ package: { $in: pkgs } }, { package:1, genre:1, category:1, title:1 }).lean();
    const metaByPkg = new Map(apkDocs.map(d => [d.package, d]));

    // 3) Acumuladores
    const perPerm = new Map(); // permiso -> stats
    const perApp = []; // [{package, perms_used, incoherences, prop_incoh, mean_sim_used}]
    let appsProcessed = 0;
    let appsSkippedForPolicy = 0;

    for (const pkg of pkgs) {
      // Filtro por categoría si procede
      if (CATEGORY) {
        const meta = metaByPkg.get(pkg);
        const cat = (meta?.category || meta?.genre || '').toUpperCase();
        if (!cat.includes(CATEGORY.toUpperCase())) continue;
      }

      const ana = await Analisis.findOne({ package_name: pkg }).lean();
      if (!ana) continue;

      const ex = extractUsedPermissions(ana); // {used, host, tpl, source}
      const used = ex.used || new Map();
      const usedPerms = [...used.keys()];

      // Carga matches de política (colección o fichero local)
      const matches = await loadPolicyMatches({ pkg, PolicyModel: Policy });
      if ((!matches || matches.length === 0) && MISSING_POLICY === 'skip') {
        appsSkippedForPolicy++;
        continue;
      }

      const maxSimByPerm = new Map();
      if (matches && matches.length) {
        for (const m of matches) {
          const p = m.permission;
          const sim = Number(m.sim || 0);
          const prev = maxSimByPerm.get(p) || 0;
          if (sim > prev) maxSimByPerm.set(p, sim);
        }
      }

      // Stats por app
      const rowsApp = [];
      for (const p of new Set([...usedPerms, ...maxSimByPerm.keys()])) {
        const codeTotal = used.get(p) || 0;
        const simMax = maxSimByPerm.get(p) || 0;
        const incoh = (codeTotal > 0 && simMax < THR) ? 1 : 0;
        rowsApp.push({ p, codeTotal, simMax, incoh });
      }
      const usedSubset = rowsApp.filter(r => r.codeTotal > 0);
      const incohCount = usedSubset.reduce((a,b)=>a+b.incoh,0);
      const meanSim = usedSubset.length ? usedSubset.reduce((a,b)=>a+b.simMax,0)/usedSubset.length : 0;

      perApp.push({
        package: pkg,
        perms_used: usedSubset.length,
        incoherences: incohCount,
        prop_incoh: usedSubset.length ? incohCount/usedSubset.length : 0,
        mean_sim_used: meanSim
      });

      // Stats agregados por permiso
      for (const p of usedPerms) {
        if (!perPerm.has(p)) perPerm.set(p, {
          apps_with_use: 0,
          apps_with_ok: 0,
          sims_used: [],
          tpl_dominant_count: 0,
          tpl_dominant_defined: 0
        });
        const stat = perPerm.get(p);
        stat.apps_with_use += 1;

        const simMax = maxSimByPerm.get(p) || 0;
        if (simMax >= THR) stat.apps_with_ok += 1;
        stat.sims_used.push(simMax);

        // Atribución TPL si hay desglose host/tpl
        if (ex.host && ex.tpl) {
          const h = ex.host.get(p) || 0;
          const t = ex.tpl.get(p) || 0;
          const tot = h + t;
          if (tot > 0) {
            stat.tpl_dominant_defined += 1;
            if (t / tot >= 0.6) stat.tpl_dominant_count += 1;
          }
        }
      }

      appsProcessed += 1;
    }

    // 4) Cálculo de métricas y CIs
    const permRows = [];
    for (const [perm, s] of perPerm.entries()) {
      const n = s.apps_with_use;
      const ok = s.apps_with_ok;
      const pOk = n ? ok/n : 0;
      const pIncoh = 1 - pOk;
      const ci = wilson(pIncoh, n); // incoherencia por permiso
      const simCI = bootstrapMeanCI(s.sims_used, 2000, 0.05);
      const tplDomRate = s.tpl_dominant_defined ? (s.tpl_dominant_count / s.tpl_dominant_defined) : null;

      permRows.push({
        permission: perm,
        apps_with_use: n,
        incoherence_rate: pIncoh,
        incoherence_ci_lo: ci.lo,
        incoherence_ci_hi: ci.hi,
        mean_similarity_used: simCI.mean,
        mean_similarity_ci_lo: simCI.lo,
        mean_similarity_ci_hi: simCI.hi,
        tpl_dominant_rate: tplDomRate,
        tpl_dominant_defined: s.tpl_dominant_defined
      });
    }

    // 5) Salidas
    const outDir = path.join(__dirname, 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Per-permission CSV
    const csvPerm = path.join(outDir, 'corpus.permissions.csv');
    const headerPerm = [
      'permission','apps_with_use',
      'incoherence_rate','incoherence_ci_lo','incoherence_ci_hi',
      'mean_similarity_used','mean_similarity_ci_lo','mean_similarity_ci_hi',
      'tpl_dominant_rate','tpl_dominant_defined'
    ];
    const linesPerm = [headerPerm.join(',')].concat(
      permRows.sort((a,b)=> b.apps_with_use - a.apps_with_use).map(r => headerPerm.map(h => {
        const v = r[h];
        if (v == null) return '';
        const s = String(v);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(','))
    );
    fs.writeFileSync(csvPerm, linesPerm.join('\n'));

    // Per-app CSV
    const csvApp = path.join(outDir, 'corpus.apps.csv');
    const headerApp = ['package','perms_used','incoherences','prop_incoh','mean_sim_used'];
    const linesApp = [headerApp.join(',')].concat(
      perApp.map(r => headerApp.map(h => r[h]).join(','))
    );
    fs.writeFileSync(csvApp, linesApp.join('\n'));

    // Resumen JSON
    const summary = {
      params: { THR, POLICY_COLL, MISSING_POLICY, CATEGORY },
      counts: {
        apps_in_estatico: pkgs.length,
        apps_processed: appsProcessed,
        apps_skipped_for_missing_policy: appsSkippedForPolicy,
        distinct_permissions: perPerm.size
      },
      global_hist_incoh_per_app: (()=>{
        const H = new Map();
        for (const a of perApp) inc(H, a.incoherences);
        return [...H.entries()].sort((x,y)=>x[0]-y[0]).map(([k,v])=>({incoherences:k, apps:v}));
      })(),
      top_permissions_by_use: permRows.slice().sort((a,b)=> b.apps_with_use - a.apps_with_use).slice(0,15),
      top_permissions_by_incoh: permRows.slice().sort((a,b)=> b.incoherence_rate - a.incoherence_rate).slice(0,15),
    };
    fs.writeFileSync(path.join(outDir, 'corpus.summary.json'), JSON.stringify(summary, null, 2));

    // Tabla LaTeX – distribución por permiso (top 12)
    const texPath = path.join(outDir, 'corpus.permissions.tex');
    const top12 = permRows.slice().sort((a,b)=> b.apps_with_use - a.apps_with_use).slice(0,12);
    const body = top12.map(r =>
      `${r.permission} & ${r.apps_with_use} & ${(r.incoherence_rate*100).toFixed(1)}\\% [${(r.incoherence_ci_lo*100).toFixed(1)}–${(r.incoherence_ci_hi*100).toFixed(1)}] & ${r.mean_similarity_used?.toFixed(2)} [${r.mean_similarity_ci_lo?.toFixed(2)}–${r.mean_similarity_ci_hi?.toFixed(2)}] & ${r.tpl_dominant_defined?((r.tpl_dominant_rate*100).toFixed(1)+'\\%'):'--'} \\\\`
    ).join('\n');
    const tex = `
\\begin{table}[t]
\\centering
\\caption{Distribución de incoherencias por permiso con IC95\\% (umbral ${THR}).}
\\small
\\begin{tabular}{lrrrr}
\\toprule
\\textbf{Permiso} & \\textbf{Apps con uso} & \\textbf{Incoherencia (IC95\\%)} & \\textbf{Sim. media (IC95\\%)} & \\textbf{TPL-dom.}\\
\\midrule
${body}
\\bottomrule
\\end{tabular}
\\end{table}
`;
    fs.writeFileSync(texPath, tex.trim() + '\n');

    console.log('OK · Escritos:',
      csvPerm, csvApp,
      path.join(outDir, 'corpus.summary.json'),
      texPath
    );
    process.exit(0);
  } catch (err) {
    console.error('ERROR aggregate_corpus:', err);
    process.exit(1);
  }
})();
