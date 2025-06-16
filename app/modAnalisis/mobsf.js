/**
 * @module modAnalisis/mobsf
 *
 * @description Funciones para analizar APKs con MobSF.
 * @see mobsf_api
 */

'use strict'

const { exec } = require('child_process')
const util = require('util')
const path = require('path')
const fs = require('fs')

const execAsync = util.promisify(exec)

// Utils & servicios
const { subirArchivoTemporal } = require('../utils/fileUtils')
const { detectarCoincidencias } = require('../utils/regexMatcher')
const APKS = require('../modMetadata/apks')
const CRUD = require('../servicios/crud')
const COLECCION = require('../servicios/modelos/analisis.model').estatico
const CONFIG = require('../config.js')[process.env.NODE_ENV || 'development']


// --------------------------------------------------------- //
//  CONSTANTES DE RUTAS (mantener en sync con despliegue NFS)//
// --------------------------------------------------------- //
const NFS_BASE           = '/home/ciber/projects/SafeMountain/nfs/incibe/analisisAplicaciones/datasets'
const BASE_HOST_APKS     = path.join(NFS_BASE, 'hostApks')           // árbol completo de APKs
const BASE_PROFILES      = path.join(NFS_BASE, 'profiles')           // raíz de perfiles
const PROFILE_APK_DIR    = path.join(BASE_PROFILES, 'apks', 'social')
const PROFILE_TPL_DIR    = path.join(BASE_PROFILES, 'tpls')
const DETECTS_DIR        = path.join(NFS_BASE, 'detects')            // destino final de JSON detect


/**
 * @description Procesa y analiza un archivo APK utilizando MobSF.
 * Sube primero el APK a carpeta temporal, lo analiza y, una vez finalizado el proceso,
 * elimina siempre el archivo temporal para evitar basura.
 *
 * @param {Object} req - Objeto de solicitud HTTP, que contiene el archivo APK a analizar.
 * @param {Object} res - Objeto de respuesta HTTP utilizado para la subida del archivo.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto que contiene los resultados del análisis.
 * @throws {Error} Si ocurre un error durante la ejecución del análisis, lectura del archivo de resultados o almacenamiento del APK.
 */

// Carpeta local donde vive LibLoom dentro del repo
const LIBLOOM_DIR        = path.join(__dirname, '../../tools/libloom')
const LIBLOOM_CP         = [
  path.join(LIBLOOM_DIR, 'out'),
  path.join(LIBLOOM_DIR, 'lib', '*')
].join(process.platform === 'win32' ? ';' : ':')

// Directorios temporales internos a tools/libloom
const TMP_HOST_APKS      = path.join(LIBLOOM_DIR, 'tmpHostApks')           // para generar perfil puntual
const TMP_SINGLE_APK_DIR = path.join(LIBLOOM_DIR, 'tmpSingleApkProfiles')  // para detect
const DETECT_OUTPUT_DIR  = path.join(LIBLOOM_DIR, 'results', 'libloom', 'detection') // lo usa LibLoom por defecto

// Aseguramos que existan los temporales y destino de detects
for (const d of [ TMP_HOST_APKS, TMP_SINGLE_APK_DIR, DETECT_OUTPUT_DIR, DETECTS_DIR ]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
}

/* -----------------------
 * API principal exportado
 * -----------------------*/
async function analizar (req, res) {
  let tmpFilePath // ruta de la APK subida al tmp de subidaArchivoTemporal

  try {
    /* SUBIDA TEMPORAL DEL APK ORIGEN */
    const uploadResult = await subirArchivoTemporal(req, res)
    tmpFilePath = uploadResult.datos.filePath

    /* Lanzamos MobSF (sin cambios) y obtenemos analisisData */
    const analisisData = await ejecutarMobSF(tmpFilePath)

    /* === NUEVO: integrar LibLoom === */
    await ejecutarLibLoom(tmpFilePath, analisisData)

    if (!analisisData.playstore_details || !analisisData.playstore_details.genre) {
      console.warn('[WARN] APK sin categoría definida — playstore_details incompleto.');
      analisisData.playstore_details = { genre: 'unknown' };
    }

    /* Guarda APK definitiva en NFS y metadatos en Mongo (sin cambios) */
    await persistirResultados(tmpFilePath, analisisData)

    return {
      ok: true,
      mensaje: 'Archivo analizado correctamente',
      datos: {
        category: analisisData.playstore_details.genre.toLowerCase(),
        package: analisisData.package_name,
        name: analisisData.file_name
      }
    }
  } catch (err) {
    throw new Error(`Error en analizar(): ${err.message}`)
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath)
    }
  }
}

/* --------------------------------------------------------------------------
 *                       1) Ejecución de MobSF
 * ------------------------------------------------------------------------*/
async function ejecutarMobSF (apkTmpPath) {
  // (Copiado en esencia de la versión original, simplificado)
  const mobSFDir  = path.join(__dirname, '../../tools/mobsf')
  const resultDir = path.join(mobSFDir, 'results')
  if (!fs.existsSync(resultDir)) fs.mkdirSync(resultDir, { recursive: true })

  const pythonEnv = path.join(mobSFDir, 'mobsf_env', 'bin', 'python3')
  const cmd = `"${pythonEnv}" -d main.py --source="${apkTmpPath}" --result="${resultDir}"`

  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: mobSFDir, maxBuffer: 10 * 1024 * 1024 })
    console.log('✔️ MobSF stdout:', stdout)
    if (stderr) console.warn('⚠️ MobSF stderr:', stderr)
  } catch (e) {
    console.error('❌ Error al ejecutar MobSF:', e)
    throw new Error(`Fallo al ejecutar MobSF: ${e.message}`)
  }

  /* Parseamos JSON de MobSF */
  const jsonFile = path.join(resultDir, `${path.basename(apkTmpPath)}.json`)
  const raw      = await fs.promises.readFile(jsonFile, 'utf8')
  const data     = JSON.parse(raw)
  data.name      = path.parse(data.file_name).name

  // Extraemos coincidencias regex (sin cambios)
  const coincidencias   = detectarCoincidencias(data.strings)
  const ppiFiltrado     = {}
  for (const [k, vals] of Object.entries(coincidencias)) {
    const filtrados = vals.filter(v => Array.isArray(v.matches) && v.matches.length)
    if (filtrados.length) ppiFiltrado[k] = filtrados
  }
  data.ppi = ppiFiltrado
  return data
}

/* --------------------------------------------------------------------------
 *                       2) Ejecución de LibLoom
 * ------------------------------------------------------------------------*/
async function ejecutarLibLoom (apkTmpPath, analisisData) {
  const apkNameNoExt   = analisisData.name              // p.ej. com.foo.bar_123
  const packageName    = analisisData.package_name      // del Play Store / MobSF

  /* 2.1) ¿Existe perfil de la APK? */
  const apkProfileDir  = path.join(PROFILE_APK_DIR, packageName)
  const apkProfilePath = path.join(apkProfileDir, `${apkNameNoExt}.txt`)
  const profileExists  = fs.existsSync(apkProfilePath)

  if (profileExists) {
    console.log(`✅ Perfil de ${apkNameNoExt} YA existe — se usará directamente.`)
  } else {
    console.log(`🟡 Generando perfil para ${apkNameNoExt}…`)
    // Copia temporal a TMP_HOST_APKS
    const tmpCopy = path.join(TMP_HOST_APKS, `${apkNameNoExt}.apk`)
    fs.copyFileSync(apkTmpPath, tmpCopy)

    // Comando: java -cp … libloom.LIBLOOM profile
    const profileCmd = [
      `java -cp "${LIBLOOM_CP}"`,
      'libloom.LIBLOOM', 'profile'
    ].join(' ')

    // LIBLOOM usa rutas absolutas definidas en parameters.properties, por lo que
    // simplemente lanzar "profile" procesará TODO tmpHostApks. Crearemos un
    // symlink dentro de hostApks/social para mantener la estructura esperada.
    const socialDir = path.join(BASE_HOST_APKS, 'social', packageName)
    fs.mkdirSync(socialDir, { recursive: true })
    const finalDst = path.join(socialDir, `${apkNameNoExt}.apk`)
    if (!fs.existsSync(finalDst)) fs.copyFileSync(apkTmpPath, finalDst)

    try {
      const { stdout, stderr } = await execAsync(profileCmd, { cwd: LIBLOOM_DIR, maxBuffer: 20 * 1024 * 1024 })
      console.log('✔️ LIBLOOM profile stdout:', stdout)
      if (stderr) console.warn('⚠️ LIBLOOM profile stderr:', stderr)
    } catch (e) {
      console.error('❌ Error al ejecutar LIBLOOM profile:', e)
      throw new Error(`Fallo al ejecutar LIBLOOM profile: ${e.message}`)
    }

    if (!fs.existsSync(apkProfilePath)) {
      throw new Error('LibLoom no generó el perfil esperado.')
    }
  }

  /* 2.2) Preparar detect con UN SOLO perfil APK (copiarlo a TMP_SINGLE_APK_DIR) */
  const singleProfile = path.join(TMP_SINGLE_APK_DIR, `${apkNameNoExt}.txt`)
  // Limpiamos dir temporal
  for (const f of fs.readdirSync(TMP_SINGLE_APK_DIR)) {
    fs.unlinkSync(path.join(TMP_SINGLE_APK_DIR, f))
  }
  fs.copyFileSync(apkProfilePath, singleProfile)

  /* 2.3) Ejecutar detect */
  console.log('🟡 Ejecutando LibLoom detect para la APK…')
  const detectCmd = [
    `java -cp "${LIBLOOM_CP}"`,
    'libloom.LIBLOOM', 'detect', "--debug"
  ].join(' ')

  try {
    const { stdout, stderr } = await execAsync(detectCmd, { cwd: LIBLOOM_DIR, maxBuffer: 20 * 1024 * 1024 })
    console.log('✔️ LIBLOOM detect stdout:', stdout)
    if (stderr) console.warn('⚠️ LIBLOOM detect stderr:', stderr)
  } catch (e) {
    console.error('❌ Error al ejecutar LIBLOOM detect:', e)
    throw new Error(`Fallo al ejecutar LIBLOOM detect: ${e.message}`)
  }

if (!fs.existsSync(apkProfilePath)) {
  throw new Error('LibLoom no generó el perfil esperado.')
}

  /* 2.4) Localizar JSON generado (debería estar en DETECT_OUTPUT_DIR bajo root) */
  const detectJsonPath = path.join(DETECT_OUTPUT_DIR, `${apkNameNoExt}.json`)
  if (!fs.existsSync(detectJsonPath)) {
    console.warn('⚠️ No se encontró JSON de detección para la APK.')
    return
  }

  // Copiar al directorio final /datasets/detects
  const finalDetectPath = path.join(DETECTS_DIR, `${apkNameNoExt}.json`)
  fs.copyFileSync(detectJsonPath, finalDetectPath)
  console.log(`JSON de detección guardado en ${finalDetectPath}`)

  /* 2.5) Filtrar librerías con similarity == 1.0 y anexar a analisisData */
  try {
    const detectData = JSON.parse(fs.readFileSync(detectJsonPath, 'utf8'))
    const libsArray  = Array.isArray(detectData.libraries) ? detectData.libraries : []

  // Filtramos solo los que tienen similarity == 1.0
  const filtered = libsArray
    .filter(lib => lib.similarity === 1.0)
    .map(lib => ({
      package: lib.package,
      name: lib.name,
      version: lib.version
    }))

    if (filtered.length > 0) {
      analisisData.libloom = filtered
    } else {
      console.log('LibLoom no encontró TPLs con similitud 1.0.')
    }

  } catch (e) {
    console.error('Error leyendo/parsing JSON de LibLoom:', e)
  }
}

/* --------------------------------------------------------------------------
 *                  3) Persistencia en NFS y Mongo
 * ------------------------------------------------------------------------*/
async function persistirResultados(tmpApkPath, analisisData) {
  const { BASE_DIRECTORY } = CONFIG
  const categoryDir = path.join(BASE_DIRECTORY, analisisData.playstore_details.genre.toLowerCase())
  const finalDir    = path.join(categoryDir, analisisData.package_name)
  const finalPath   = path.join(finalDir, analisisData.file_name)

  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true })
  if (!fs.existsSync(finalPath)) {
    fs.copyFileSync(tmpApkPath, finalPath)
  }

  // Guardar metadatos en Mongo (idéntico a la versión previa)
  const { ok: okApk, datos: datosApk } = await APKS.leerCampo({
    filtro: { name: analisisData.name },
    limite: 1
  })
  if (!okApk || !datosApk) {
    console.log('[INFO] Guardando metadata con:', dataBasica);
    await APKS.guardarMetadata(analisisData)
  }

  const { ok: okCrud, datos: datosCrud } = await CRUD.leerCampo({
    filtro: { package_name: analisisData.package_name },
    limite: 1
  }, COLECCION)

  if (!okCrud || !datosCrud) {
    await CRUD.nuevo(analisisData, COLECCION)
  } else if (analisisData.libloom) {
    await CRUD.modificarUno(
      { package_name: analisisData.package_name },
      { libloom: analisisData.libloom },
      COLECCION
    )
  }
}

module.exports = {
  analizar
}

