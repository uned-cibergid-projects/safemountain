// scripts/smoke_probe.js
'use strict';
const fs = require('fs');
const path = require('path');
const { Analisis, Apks, Tpls, getAuxCollection } = require('./lib/db');

(async () => {
  try {
    const nApks = await Apks.countDocuments({});
    const nTpls = await Tpls.countDocuments({});
    const nAnalisis = await Analisis.countDocuments({});

    // Intenta detectar si existe una colección con matches de política (permiso ↔ párrafo)
    const policyCollName = process.env.POLICY_COLL || 'policy_matches';
    const Policy = getAuxCollection(policyCollName);
    let nPolicy = 0;
    try { nPolicy = await Policy.countDocuments({}); } catch(e) {}

    // Trae 1 documento ejemplo de análisis estático
    const doc = await Analisis.findOne({}, { package_name:1, app_name:1, version_name:1, permissions:1, manifest_analysis:1 }).lean();

    const out = {
      counts: { apks: nApks, tpls: nTpls, analisis_estatico: nAnalisis, [policyCollName]: nPolicy },
      analisis_sample_keys: doc ? Object.keys(doc) : [],
      analisis_sample_preview: doc ? {
        package_name: doc.package_name,
        app_name: doc.app_name,
        version_name: doc.version_name,
        // ojo: según tu pipeline, permissions puede ser objeto/array; aquí solo mostramos “forma”
        permissions_type: doc.permissions ? Array.isArray(doc.permissions) ? 'array' : typeof doc.permissions : null,
        manifest_analysis_present: !!doc.manifest_analysis,
      } : null
    };

    const outPath = path.join(__dirname, 'out', 'smoke_probe.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`OK · Escrito ${outPath}`);
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR smoke_probe:', err);
    process.exit(1);
  }
})();
