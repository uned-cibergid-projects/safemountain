// scripts/check_analysis.js
'use strict';
const { Analisis } = require('./lib/db');

(async () => {
  const pkg = process.argv[2];

  if (!pkg) {
    const total = await Analisis.countDocuments({});
    const one = await Analisis.findOne({}, { package_name:1, app_name:1, version_name:1, createdAt:1 }).lean();
    console.log(JSON.stringify({ total_estatico: total, sample: one }, null, 2));
    process.exit(0);
  }

  const doc = await Analisis.findOne({ package_name: pkg }).lean();
  if (!doc) {
    console.error(`No hay análisis estático para ${pkg}`);
    process.exit(2);
  }
  const perms = doc.permissions || doc.manifest_analysis?.permissions || {};
  const permList = Array.isArray(perms) ? perms : Object.keys(perms);

  console.log(JSON.stringify({
    package_name: doc.package_name,
    app_name: doc.app_name,
    version_name: doc.version_name,
    createdAt: doc.createdAt || doc._id?.getTimestamp?.(),
    manifest_analysis_present: !!doc.manifest_analysis,
    permissions_detected: permList.length,
    has_lib_results: !!doc.libloom || !!doc.tpls_detected,
  }, null, 2));
  process.exit(0);
})();
