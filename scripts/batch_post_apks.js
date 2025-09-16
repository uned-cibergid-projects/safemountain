// scripts/batch_post_apks.js
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { Analisis } = require('./lib/db');

// =================== CONFIG por entorno ===================
const BASE_DIR   = process.env.BASE_DIR   || '/home/ciber/projects/SafeMountain/nfs/incibe/analisisAplicaciones/datasets/hostApks';
const SUBDIR     = process.env.SUBDIR     || 'social';
const API        = process.env.API        || 'http://127.0.0.1:8020/api/analisis/mobsf/analizar';
const CAT        = process.env.CAT        || 'social';
const LIMIT      = parseInt(process.env.LIMIT || '5', 10);
const RETRIES    = parseInt(process.env.RETRIES || '2', 10);
const SLEEP_BT   = parseInt(process.env.SLEEP_BT || '5', 10); // segundos
const AUTH       = process.env.AUTH || ''; // p.ej. "--user usuario:pass"
const OUT_DIR    = process.env.OUT_DIR || path.join(__dirname, 'out', 'http_batch');
// ===========================================================

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function listPackageDirs() {
  const root = path.join(BASE_DIR, SUBDIR);
  const entries = await fsp.readdir(root, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => path.join(root, e.name)).sort();
}

async function findNewestApk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith('.apk')).map(e => path.join(dir, e.name));
  if (files.length === 0) return null;
  const stats = await Promise.all(files.map(async f => {
    const st = await fsp.stat(f);
    return { f, m: st.mtimeMs, z: st.size };
  }));
  stats.sort((a,b) => (b.m - a.m) || (b.z - a.z));
  return stats[0].f;
}

function runCurlPost(apkPath, pkg, outFile) {
  return new Promise((resolve) => {
    const args = [
      '-sS', '-X', 'POST',
      ... (AUTH ? AUTH.split(' ') : []),
      '-F', `archivo=@${apkPath};type=application/vnd.android.package-archive`,
      '-F', `package=${pkg}`,
      '-F', `category=${CAT}`,
      '-F', `name=${path.basename(apkPath)}`,
      API
    ];
    const child = spawn('curl', args);
    const outStream = fs.createWriteStream(outFile, { flags: 'w' });
    child.stdout.pipe(outStream);
    child.stderr.pipe(outStream);

    child.on('close', (code) => resolve({ code }));
    child.on('error', (err) => resolve({ code: -1, err: String(err) }));
  });
}

async function main() {
  await fsp.mkdir(OUT_DIR, { recursive: true });

  const pkgDirs = await listPackageDirs();
  const packages = pkgDirs.map(d => path.basename(d));

  // Filtra los que NO están analizados todavía
  const pending = [];
  for (const pkg of packages) {
    const exists = await Analisis.findOne({ package_name: pkg }).lean();
    if (!exists) pending.push(pkg);
  }

  console.log(JSON.stringify({
    base_dir: BASE_DIR, subdir: SUBDIR, api: API, cat: CAT,
    total_dirs: packages.length, pending: pending.length, limit_this_run: LIMIT
  }, null, 2));

  if (pending.length === 0) {
    console.log('No hay paquetes pendientes. ¡Todo listo!');
    process.exit(0);
  }

  const slice = pending.slice(0, LIMIT);
  let ok = 0, fail = 0;

  for (let i = 0; i < slice.length; i++) {
    const pkg = slice[i];
    const dir = path.join(BASE_DIR, SUBDIR, pkg);
    const apk = await findNewestApk(dir);
    const tag = pkg.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const outFile = path.join(OUT_DIR, `${tag}.json`);

    console.log(`\n[${i+1}/${slice.length}] ${pkg}`);
    if (!apk) {
      console.log('  No se encontró .apk en', dir);
      fail++; continue;
    }
    console.log('  APK:', apk);

    let attempt = 0, success = false;
    const t0 = Date.now();
    while (attempt < RETRIES && !success) {
      attempt++;
      console.log(`  Intento ${attempt}/${RETRIES} → POST ${API}`);
      const res = await runCurlPost(apk, pkg, outFile);
      const dur = Math.round((Date.now() - t0)/1000);
      try {
        const txt = await fsp.readFile(outFile, 'utf8');
        const okField = /"ok"\s*:\s*true/.test(txt);
        if (res.code === 0 && okField) {
          console.log(`  OK · ${dur}s · respuesta → ${outFile}`);
          ok++; success = true;
        } else {
          console.log(`  FAIL (code=${res.code}) · ${dur}s · ver ${outFile}`);
          if (attempt < RETRIES) {
            console.log(`  Reintentando en ${SLEEP_BT}s...`);
            await sleep(SLEEP_BT*1000);
          }
        }
      } catch (e) {
        console.log(`  ERROR leyendo respuesta: ${e.message}`);
        if (attempt < RETRIES) {
          console.log(`  Reintentando en ${SLEEP_BT}s...`);
          await sleep(SLEEP_BT*1000);
        }
      }
    }
    if (!success) fail++;
  }

  console.log(`\nResumen: OK=${ok} FAIL=${fail} PENDING_AFTER=${pending.length - slice.length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
