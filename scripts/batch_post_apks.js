// scripts/batch_post_apks.js
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { Analisis } = require('./lib/db');

// =================== CONFIG por entorno ===================
const BASE_DIR      = process.env.BASE_DIR      || '/home/ciber/projects/ePalSafer/nfs/incibe/analisisAplicaciones/datasets/hostApks';
const SUBDIR        = process.env.SUBDIR        || 'social';
const API           = process.env.API           || 'http://127.0.0.1:8020/api/analisis/mobsf/analizar';
const CAT           = process.env.CAT           || 'social';
const LIMIT         = parseInt(process.env.LIMIT || '5', 10);  // éxitos por ejecución
const RETRIES       = parseInt(process.env.RETRIES || '2', 10);
const SLEEP_BT      = parseInt(process.env.SLEEP_BT || '5', 10); // seg entre reintentos
const AUTH          = process.env.AUTH || ''; // p.ej. "--user user:pass"
const OUT_DIR       = process.env.OUT_DIR || path.join(__dirname, 'out', 'http_batch');
const SKIP_FILE     = process.env.SKIP_FILE || path.join(__dirname, 'out', 'skip_failed.json');
// timeout de curl en segundos (para que no se eternice)
const CURL_MAX_TIME = parseInt(process.env.CURL_MAX_TIME || '900', 10); // 15 min
const CURL_CONN_TO  = parseInt(process.env.CURL_CONN_TO  || '10', 10);  // connect-timeout
// ===========================================================

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function loadSkiplist() {
  try {
    const txt = await fsp.readFile(SKIP_FILE, 'utf8');
    return JSON.parse(txt);
  } catch {
    return {};
  }
}
async function saveSkiplist(obj) {
  await fsp.mkdir(path.dirname(SKIP_FILE), { recursive: true });
  await fsp.writeFile(SKIP_FILE, JSON.stringify(obj, null, 2));
}

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
      `--max-time`, `${CURL_MAX_TIME}`,
      `--connect-timeout`, `${CURL_CONN_TO}`,
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

  // 1) Carga lista de ignorados
  const skip = await loadSkiplist();

  // 2) Construye lista de pendientes (en disco) y resta ya-analizadas y skiplist
  const pkgDirs = await listPackageDirs();
  const packages = pkgDirs.map(d => path.basename(d));

  const pendingDisk = [];
  for (const pkg of packages) {
    if (skip[pkg]?.ignored) continue; // ignorado previamente
    const exists = await Analisis.findOne({ package_name: pkg }).lean();
    if (!exists) pendingDisk.push(pkg);
  }

  console.log(JSON.stringify({
    base_dir: BASE_DIR, subdir: SUBDIR, api: API, cat: CAT,
    total_dirs: packages.length, pending: pendingDisk.length, limit_successes: LIMIT,
    skip_ignored: Object.keys(skip).filter(k => skip[k]?.ignored).length
  }, null, 2));

  if (pendingDisk.length === 0) {
    console.log('No hay paquetes pendientes. ¡Todo listo!');
    process.exit(0);
  }

  // 3) Procesa hasta LIMIT éxitos por ejecución
  let success = 0, failed = 0, skipped_now = 0, checked = 0;

  for (const pkg of pendingDisk) {
    if (success >= LIMIT) break;
    checked++;

    const dir = path.join(BASE_DIR, SUBDIR, pkg);
    const apk = await findNewestApk(dir);
    const tag = pkg.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const outFile = path.join(OUT_DIR, `${tag}.json`);

    console.log(`\n[${checked}/${pendingDisk.length}] ${pkg}`);
    if (!apk) {
      console.log('  No se encontró .apk en', dir, '→ IGNORADO');
      failed++;
      skip[pkg] = { ignored: true, reason: 'no_apk_found', ts: new Date().toISOString() };
      await saveSkiplist(skip);
      continue;
    }
    console.log('  APK:', apk);

    let attempt = 0, okThis = false;
    const t0 = Date.now();
    while (attempt < RETRIES && !okThis) {
      attempt++;
      console.log(`  Intento ${attempt}/${RETRIES} → POST ${API} (timeout ${CURL_MAX_TIME}s)`);
      const res = await runCurlPost(apk, pkg, outFile);
      const dur = Math.round((Date.now() - t0)/1000);
      let txt = '';
      try { txt = await fsp.readFile(outFile, 'utf8'); } catch {}
      const okField = /"ok"\s*:\s*true/.test(txt);

      if (res.code === 0 && okField) {
        console.log(`  OK · ${dur}s · respuesta → ${outFile}`);
        // doble verificación: ¿ya está en Mongo?
        const exists = await Analisis.findOne({ package_name: pkg }).lean();
        if (!exists) {
          console.log('  WARN: ok:true pero no aparece aún en Mongo (posible latencia).');
        }
        success++; okThis = true;
      } else {
        console.log(`  FAIL (code=${res.code}) · ${dur}s · ver ${outFile}`);
        if (attempt < RETRIES) {
          console.log(`  Reintentando en ${SLEEP_BT}s...`);
          await sleep(SLEEP_BT*1000);
        }
      }
    }

    if (!okThis) {
      failed++;
      // Marca como ignorado permanente (se puede “desbloquear” editando el skiplist)
      skip[pkg] = { ignored: true, reason: 'retries_exhausted', ts: new Date().toISOString() };
      await saveSkiplist(skip);
      console.log('  Marcado como IGNORADO (retries exhausted).');
    }
  }

  console.log(`\nResumen: SUCCESS=${success} FAILED=${failed} SKIPLIST_TOTAL=${Object.keys(skip).filter(k => skip[k]?.ignored).length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
