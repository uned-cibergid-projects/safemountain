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

const { subirArchivoTemporal } = require('../utils/fileUtils')
const { detectarCoincidencias } = require('../utils/regexMatcher')
const APKS = require('../modMetadata/apks')
const CRUD = require('../servicios/crud')
const COLECCION = require('../servicios/modelos/analisis.model').estatico
const CONFIG = require('../config.js')[process.env.NODE_ENV || 'development']

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

async function analizar (req, res) {
  let filePath

  try {
    const uploadResult = await subirArchivoTemporal(req, res)
    filePath = uploadResult.datos.filePath

    const mobSFDir = path.join(__dirname, '../../tools/mobsf')
    const resultDir = path.join(mobSFDir, 'results')

    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true })
    }

    const pythonEnv = path.join(mobSFDir, 'mobsf_env', 'bin', 'python3')

    const cmd = `"${pythonEnv}" -d main.py --source="${filePath}" --result="${resultDir}"`

    const { stderr } = await execAsync(cmd, { cwd: mobSFDir })

    if (stderr) {
      console.error('stderr:', stderr)
    }

    const baseName = path.basename(filePath)
    const jsonFile = path.join(resultDir, `${baseName}.json`)

    let analisisData
    try {
      const fileContent = await fs.promises.readFile(jsonFile, 'utf8')
      analisisData = JSON.parse(fileContent)
      analisisData.name = path.parse(analisisData.file_name).name
      const coincidencias = detectarCoincidencias(analisisData.strings)

      const ppiFiltrado = {}
      for (const [key, valores] of Object.entries(coincidencias)) {
        const filtrados = valores.filter((item) => Array.isArray(item.matches) && item.matches.length > 0)
        if (filtrados.length > 0) {
          ppiFiltrado[key] = filtrados
        }
      }
    
      analisisData.ppi = ppiFiltrado
    } catch (readError) {
      throw new Error(`No se pudo realizar un análisis de forma correcta: ${readError}`)
    }

    await ejecutarLibLoom(filePath, analisisData)

    const { BASE_DIRECTORY } = CONFIG
    const categoryDir = path.join(BASE_DIRECTORY, analisisData.playstore_details.genre.toLowerCase())
    const finalDir = path.join(categoryDir, analisisData.package_name)
    const finalPath = path.join(finalDir, analisisData.file_name)

    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true })
    }

    if (fs.existsSync(finalPath)) {
      console.log(`La APK ya estaba guardada previamente en ${finalPath}.`)
    } else {
      fs.copyFileSync(filePath, finalPath)
      fs.unlinkSync(filePath)
      console.log(`La APK se ha guardado con éxito en ${finalPath}.`)
    }

    const { ok: okApk, datos: datosApk } = await APKS.leerCampo(
      {
        filtro: { name: analisisData.name },
        limite: 1
      }
    )

    if (!okApk || !datosApk) {
      await APKS.guardarMetadata(analisisData)
    }

    const { ok: okCrud, datos: datosCrud } = await CRUD.leerCampo(
      {
        filtro: { package_name: analisisData.package_name },
        limite: 1
      },
      COLECCION
    )

    if (!okCrud || !datosCrud) {
      const { ok: okNuevo } = await CRUD.nuevo(analisisData, COLECCION)
      if (!okNuevo) {
        console.log('No se pudo insertar el documento en la colección Apks.')
      } else {
        console.log('Documento insertado correctamente en la colección Apks:')
      }
    } else {
      console.log('Ya existe un documento con el mismo package_name en la BD. Actualizando campo libloom...')

      if (analisisData.libloom) {
        const { ok: okUpdate } = await CRUD.modificarUno(
          { package_name: analisisData.package_name }, // filtro
          { libloom: analisisData.libloom },            // actualización
          COLECCION
        )
      
        if (okUpdate) {
          console.log('Campo libloom actualizado correctamente en la BD.')
        } else {
          console.log('⚠️ No se pudo actualizar el campo libloom en la BD.')
        }
      }
    }

    return {
      ok: true,
      mensaje: 'Archivo analizado correctamente',
      datos: {
        category: analisisData.playstore_details.genre.toLowerCase(),
        package: analisisData.package_name,
        name: analisisData.file_name
      }
    }
  } catch (error) {
    throw new Error(`Error al analizar el archivo con MobSF: ${error.message}`)
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`Archivo temporal ${filePath} eliminado.`)
      } catch (err) {
        console.error(`Error eliminando archivo temporal: ${err.message}`)
      }
    }
  }
}

/**
 * @description Ejecuta LibLoom para generar perfiles y detectar TPLs.
 * @param {string} filePath     - Ruta al APK en hostApks.
 * @param {Object} analisisData - Resultados previos (incluye package_name y name).
 */
async function ejecutarLibLoom(filePath, analisisData) {
  const libloomDir = path.join(__dirname, '../../tools/libloom')
  const classPath  = [
    path.join(libloomDir, 'out', 'libloom'),
    path.join(libloomDir, 'lib', '*')
  ].join(process.platform === 'win32' ? ';' : ':')

  // 1) Rutas fijas en tu NFS
  const baseHostApks    = '/home/dblancoaza/SafeMountain/nfs/incibe/analisisAplicaciones/datasets/hostApks'
  const baseProfiles    = '/home/dblancoaza/SafeMountain/nfs/incibe/analisisAplicaciones/datasets/profiles'
  const tplProfilesDir  = path.join(baseProfiles, 'tpls')
  const apkProfilesDir  = path.join(baseProfiles, 'apks', 'social')

  // 2) Temporal dentro de tools/libloom
  const tmpHostApks = path.join(libloomDir, 'tmpHostApks')
  const resultDir   = path.join(libloomDir, 'results', 'libloom', 'detection')

  // Aseguramos tmpHostApks y resultDir
  for (const d of [ tmpHostApks, resultDir ]) {
    if (!fs.existsSync(d)) {
      console.log(`Creando directorio: ${d}`)
      fs.mkdirSync(d, { recursive: true })
    }
  }

  // Función auxiliar para contar ficheros .ext recursivamente
  function countFilesRecursively(dir, ext) {
    let count = 0
    if (!fs.existsSync(dir)) return 0
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      if (fs.statSync(full).isDirectory()) {
        count += countFilesRecursively(full, ext)
      } else if (name.endsWith(ext)) {
        count++
      }
    }
    return count
  }

  // 3) Debug inicial: conteos
  console.log('=== DEBUG RUTAS Y CONTEOS ===')
  console.log('Base hostApks:', baseHostApks)
  console.log('Base apkProfilesDir:', apkProfilesDir)
  console.log('Base tplProfilesDir:', tplProfilesDir)

  const totalHostApks       = countFilesRecursively(path.join(baseHostApks, 'social'), '.apk')
  const totalApkProfiles    = countFilesRecursively(apkProfilesDir, '.txt')
  const totalTplProfiles    = countFilesRecursively(tplProfilesDir, '.txt')

  console.log(`Total APKs en hostApks/social: ${totalHostApks}`)
  console.log(`Total perfiles APK bajo profiles/apks/social: ${totalApkProfiles}`)
  console.log(`Total perfiles TPL bajo profiles/tpls: ${totalTplProfiles}`)
  console.log('=============================')

  try {
    // 4) Copiar APK a tmpHostApks
    const apkName     = analisisData.name               // nombre sin extensión
    const tmpCopyPath = path.join(tmpHostApks, `${apkName}.apk`)
    console.log(`Copiando APK a temporal: ${tmpCopyPath}`)
    fs.copyFileSync(filePath, tmpCopyPath)

    // 5) Preparamos ruta definitiva de perfil:
    //    /profiles/apks/social/<package_name>/<name>.txt
    const profileDir    = path.join(apkProfilesDir, analisisData.package_name)
    const targetProfile = path.join(profileDir, `${apkName}.txt`)

    console.log('Ruta de perfil APK:', targetProfile)
    if (!fs.existsSync(targetProfile)) {
      console.log(`🟡 Perfil de ${apkName} no existe: generando en '${profileDir}'…`)
      fs.mkdirSync(profileDir, { recursive: true })

      const profileCmd = [
        `java -cp "${classPath}"`,
        'libloom.LIBLOOM profile',
        `-d "${tmpHostApks}"`,
        `-o "${apkProfilesDir}"`
      ].join(' ')
      console.log('Comando profile:', profileCmd)
      await execAsync(profileCmd, { cwd: libloomDir, maxBuffer: 10 * 1024 * 1024 })
    } else {
      console.log(`✅ Perfil de ${apkName} ya existe, omitiendo.`)
    }

    // 6) Volvemos a contar perfiles APK tras posible generación
    const newApkProfiles = countFilesRecursively(apkProfilesDir, '.txt')
    console.log(`Perfiles APK tras generación: ${newApkProfiles}`)

    // 7) Detección contra todos los TPLs
    console.log('🟡 Ejecutando LibLoom detect sobre TODOS los TPLs…')
    const detectCmd = [
      `java -cp "${classPath}"`,
      'libloom.LIBLOOM detect',
      `-ad "${apkProfilesDir}"`,
      `-ld "${tplProfilesDir}"`,
      `-o  "${resultDir}"`
    ].join(' ')
    console.log('Comando detect:', detectCmd)
    const { stdout, stderr } = await execAsync(detectCmd, { cwd: libloomDir, maxBuffer: 10 * 1024 * 1024 })
    if (stdout) console.log('[LIBLOOM STDOUT]\n', stdout)
    if (stderr) console.error('[LIBLOOM STDERR]\n', stderr)

    // 8) Contar resultados JSON generados
    const jsonCount = countFilesRecursively(resultDir, '.json')
    console.log(`Total JSON de detección en ${resultDir}: ${jsonCount}`)

    // 9) Cargar el JSON más reciente
    const files = fs.readdirSync(resultDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ f, m: fs.statSync(path.join(resultDir, f)).mtime }))
      .sort((a,b) => b.m - a.m)

    if (files.length) {
      console.log('JSON seleccionado:', files[0].f)
      analisisData.libloom = JSON.parse(
        fs.readFileSync(path.join(resultDir, files[0].f), 'utf8')
      )
    } else {
      console.warn('⚠️ No se encontró JSON de detección de LibLoom.')
    }

  } catch (err) {
    console.error('Error ejecutando LibLoom:', err)
  } finally {
    // 10) Limpiar copia temporal
    const tmpAPK = path.join(tmpHostApks, `${analisisData.name}.apk`)
    if (fs.existsSync(tmpAPK)) {
      console.log(`Eliminando APK temporal: ${tmpAPK}`)
      try { fs.unlinkSync(tmpAPK) } catch (e) { /* ignore */ }
    }
  }
}


module.exports = {
  analizar
}
