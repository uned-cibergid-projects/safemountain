// scripts/report_case.js
'use strict';
const fs = require('fs');
const path = require('path');

const { Analisis, Apks, getAuxCollection } = require('./lib/db');
const { extractUsedPermissions, loadPolicyMatches } = require('./lib/extract');
const { wilson, bootstrapMeanCI, thresholdSweep } = require('./lib/stats');

// Umbral de similitud para “mención en política”
const THR = Number(process.env.SIM_THR || 0.80);
const POLICY_COLL = process.env.POLICY_COLL || 'policy_matches';

(async () => {
  try {
    const pkg = process.argv[2];
    if (!pkg) {
      console.error('Uso: node scripts/report_case.js <package_name>');
      process.exit(1);
    }
    // Datos APK + análisis
    const apk = await Apks.findOne({ package: pkg }).lean();
    const ana = await Analisis.findOne({ package_name: pkg }).lean();
    if (!ana) throw new Error(`No hay documento en 'estatico' para ${pkg}`);

    // Extrae usos de permisos
    const ex = extractUsedPermissions(ana); // { used, host?, tpl?, source }
    const usedPerms = [...(ex.used||new Map()).keys()];
    // Carga policy matches
    const Policy = getAuxCollection(POLICY_COLL, true);
    const matches = await loadPolicyMatches({ pkg, PolicyModel: Policy });

    // Índice rápido: permiso -> {count, hostCount, tplCount}
    const byPerm = new Map();
    for (const [p,c] of ex.used || []) {
      byPerm.set(p, { code_total: c, code_host: ex.host ? (ex.host.get(p)||0) : null, code_tpl: ex.tpl ? (ex.tpl.get(p)||0) : null });
    }

    // Añade info de política (n menciones y similitud máxima)
    const rows = [];
    for (const p of new Set([...byPerm.keys(), ...matches.map(m=>m.permission)])) {
      const code = byPerm.get(p) || { code_total: 0, code_host: null, code_tpl: null };
      const mm = matches.filter(m => m.permission === p);
      const maxSim = mm.length ? Math.max(...mm.map(m=>m.sim||0)) : 0;
      const flag = (code.code_total > 0 && maxSim < THR) ? 'INCOHERENTE' : 'OK';
      rows.push({
        permission: p,
        code_total: code.code_total,
        code_host: code.code_host,
        code_tpl: code.code_tpl,
        policy_mentions: mm.length,
        sim_max: Number(maxSim.toFixed(3)),
        flag,
        sample_sentence: mm[0]?.sentence || ''
      });
    }

    // Indicadores de fiabilidad (CIs)
    const usedFlags = rows.map(r => r.code_total > 0);
    const maxSims = rows.map(r => r.sim_max);

    // Proporción de incoherencias entre permisos usados
    const usedSubset = rows.filter(r => r.code_total > 0);
    const nUsed = usedSubset.length;
    const incoh = usedSubset.filter(r => r.sim_max < THR).length;
    const pHat = nUsed ? incoh / nUsed : 0;
    const ciProp = require('./lib/stats').wilson(pHat, nUsed); // {lo, hi, p}

    // CI bootstrap para la media de similitudes (solo permisos usados)
    const simsUsed = usedSubset.map(r => r.sim_max);
    const ciSim = require('./lib/stats').bootstrapMeanCI(simsUsed, 2000, 0.05);

    // Sensibilidad al umbral
    const sweep = require('./lib/stats').thresholdSweep(
      usedSubset.map(r => r.sim_max),
      usedSubset.map(_ => true),
      [0.70,0.75,0.80,0.85,0.90]
    );

    // Salida
    const out = {
      package: pkg,
      app: apk ? { title: apk.title, installs: apk.installs, version: apk.version, released: apk.released } : null,
      extraction_source: ex.source,
      threshold: THR,
      counts: {
        perms_total: rows.length,
        perms_used: nUsed,
        incoherences: incoh
      },
      reliability: {
        prop_incoherence: { p: pHat, ci95: ciProp },
        mean_similarity_used: ciSim,
        threshold_sweep: sweep
      },
      rows
    };

    const outDir = path.join(__dirname, 'out');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, `${pkg}.report.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
    console.log(`OK · Escrito ${jsonPath}`);

    // CSV para tabla del paper
    const csvPath = path.join(outDir, `${pkg}.report.csv`);
    const header = ['permission','code_total','code_host','code_tpl','policy_mentions','sim_max','flag','sample_sentence'];
    const lines = [header.join(',')].concat(
      rows.map(r => header.map(h => {
        const v = r[h];
        if (v == null) return '';
        const s = String(v).replace(/"/g,'""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(','))
    );
    fs.writeFileSync(csvPath, lines.join('\n'));
    console.log(`OK · Escrito ${csvPath}`);

    // LaTeX listo para pegar (matriz compacta)
    const texPath = path.join(outDir, `${pkg}.report.tex`);
    const sampleRows = rows
      .sort((a,b)=> (b.code_total - a.code_total) || (b.sim_max - a.sim_max))
      .slice(0, 12) // top 12 para la tabla
      .map(r => `${r.permission} & ${r.code_total} & ${r.policy_mentions} & ${r.sim_max.toFixed(2)} & ${r.flag} \\\\`).join('\n');
    const tex = `
\\begin{table}[t]
\\centering
\\caption{Coherencia permiso↔política para \\texttt{${pkg}} (umbral ${THR}).}
\\small
\\begin{tabular}{lrrrr}
\\toprule
\\textbf{Permiso} & \\textbf{Uso en código} & \\textbf{Menciones} & \\textbf{Sim. máx.} & \\textbf{Flag} \\\\
\\midrule
${sampleRows}
\\bottomrule
\\end{tabular}
\\end{table}

% Indicadores de fiabilidad:
% Proporción de incoherencias (permisos usados): ${(pHat*100).toFixed(1)}\\% (IC95\\%: ${(ciProp.lo*100).toFixed(1)}–${(ciProp.hi*100).toFixed(1)}\\%)
% Media de similitudes (usados): ${ciSim.mean?.toFixed(3)} (IC95\\% bootstrap: ${ciSim.lo?.toFixed(3)}–${ciSim.hi?.toFixed(3)})
`;
    fs.writeFileSync(texPath, tex.trim() + '\n');
    console.log(`OK · Escrito ${texPath}`);

    // Resumen en consola
    console.log(JSON.stringify({
      package: pkg,
      perms_used: nUsed,
      incoherences: incoh,
      prop_incoherence_95CI: ciProp,
      mean_similarity_used_95CI_bootstrap: ciSim,
      threshold_sweep: sweep
    }, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('ERROR report_case:', err);
    process.exit(1);
  }
})();
