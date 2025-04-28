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

    const cmd = `"${pythonEnv}" main.py --source="${filePath}" --result="${resultDir}"`

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
      console.log('Ya existe un documento con el mismo package_name en la BD. No se inserta.')
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
 * @param {string} filePath - Ruta del archivo APK.
 * @param {Object} analisisData - Objeto con los resultados del análisis actual.
 * @returns {Promise<void>}
 */
async function ejecutarLibLoom(filePath, analisisData) {
  const libloomDir = path.join(__dirname, '../../tools/libloom')
  const classPath = [
    path.join(libloomDir, 'out', 'libloom'),
    path.join(libloomDir, 'lib', '*')
  ].join(process.platform === 'win32' ? ';' : ':')
  const hostApksDir = path.join(libloomDir, 'results', 'hostApks')
  const profilesDir = path.join(libloomDir, 'results', 'libloom', 'profiles')
  const resultDir = path.join(libloomDir, 'results', 'libloom', 'detection')
  const apkCopiedPath = path.join(hostApksDir, path.basename(filePath))

  fs.mkdirSync(hostApksDir, { recursive: true })
  fs.mkdirSync(profilesDir, { recursive: true })
  fs.mkdirSync(resultDir, { recursive: true })

  try {
    fs.copyFileSync(filePath, apkCopiedPath)
    console.log('Ruta absoluta esperada por Node.js para hostApks:', hostApksDir)

    console.log('🟡 Ejecutando LibLoom: Generando perfil del APK...')

    const profileCmd = `java -cp "${classPath}" libloom.LIBLOOM profile`

    console.log('🛠  Ejecutando LibLoom en cwd:', libloomDir)
    console.log('🛠  ClassPath:', classPath)

    const { stdout, stderr } = await execAsync(profileCmd, {
      cwd: libloomDir,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer para evitar errores por logs extensos
    })

    if (stdout) {
      console.log('[LIBLOOM STDOUT]')
      console.log(stdout)
    }

    if (stderr) {
      console.error('[LIBLOOM STDERR]')
      console.error(stderr)
    }

    console.log('Ejecutando LibLoom: Detectando TPLs...')
    const detectCmd = `java -cp "${classPath}" libloom.LIBLOOM detect`
    await execAsync(detectCmd, { cwd: libloomDir })

    // Buscar el resultado JSON más reciente (si existiera)
    const resultFiles = fs.readdirSync(resultDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(resultDir, f)).mtime }))
      .sort((a, b) => b.time - a.time)

    if (resultFiles.length > 0) {
      const libloomResultPath = path.join(resultDir, resultFiles[0].name)
      const libloomData = JSON.parse(fs.readFileSync(libloomResultPath, 'utf8'))
      analisisData.libloom = libloomData
    } else {
      console.warn('No se encontró resultado JSON de LibLoom.')
    }
  } catch (error) {
    console.error('Error ejecutando LibLoom:', error)
  } finally {
    if (fs.existsSync(apkCopiedPath)) {
      try {
        fs.unlinkSync(apkCopiedPath)
        console.log(`APK temporal eliminado de LibLoom: ${apkCopiedPath}`)
      } catch (err) {
        console.error(`Error eliminando APK de LibLoom: ${err.message}`)
      }
    }
  }
}

module.exports = {
  analizar
}
