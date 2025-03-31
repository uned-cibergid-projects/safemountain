/**
 * @module utils/fileUtils
 *
 * @description Utilidades para la gestión de archivos: búsqueda, validación y carga.
 */

'use strict'

const { exec } = require('child_process')
const fs = require('fs/promises')
const fsSync = require('fs')
const util = require('util')
const path = require('path')
const multer = require('multer')

const execAsync = util.promisify(exec)
const CONFIG = require('../config')[process.env.NODE_ENV || 'development']

/**
 * @description Extensiones de archivo permitidas para la carga.
 * @constant {string[]}
 */
const extensionesPermitidas = ['.apk']

/**
 * @description Tamaño máximo permitido para los archivos en bytes (50MB).
 * @constant {number}
 */
const tamañoMaximoArchivo = 1000 * 1024 * 1024

/**
 * @description Configuración de almacenamiento de Multer para gestionar la carga de archivos.
 *
 * Guarda en una carpeta temporal el archivo con el nombre original.
 *
 * @constant {object}
 */
const uploadStorage = multer.diskStorage({
  destination (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../temp')
    if (!fsSync.existsSync(uploadPath)) {
      fsSync.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename (req, file, cb) {
    cb(null, file.originalname)
  }
})

/**
 * @description Filtro de archivos para Multer.
 *
 * Solo permite archivos con extensiones especificadas en `extensionesPermitidas`.
 *
 * @function fileFilter
 * @param {object} req - Objeto de solicitud Express.
 * @param {object} file - Archivo recibido.
 * @param {function} cb - Callback para continuar el proceso de carga.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (!extensionesPermitidas.includes(ext)) {
    return cb(new Error('Tipo de archivo no permitido'), false)
  }
  cb(null, true)
}

/**
 * @description Middleware de Multer para manejar la carga de un único archivo. Se espera que el campo en `form-data` se llame "archivo".
 *
 * @constant {object}
 */
const upload = multer({
  storage: uploadStorage,
  fileFilter,
  limits: { fileSize: tamañoMaximoArchivo }
}).single('archivo')

/**
 * @description Busca un archivo .apk en el directorio de APKs.
 *
 * @function buscarApk
 * @param {string} paquete - El nombre del directorio donde se buscará el archivo .apk.
 * @returns {string} La ruta completa al archivo .apk encontrado.
 * @throws {Error} Si no existe el directorio o no contiene un archivo .apk.
 */
async function buscarApk (paquete) {
  const { BASE_DIRECTORY } = CONFIG
  const packageDir = path.join(BASE_DIRECTORY, paquete)

  try {
    const stats = await fs.stat(packageDir)
    if (!stats.isDirectory()) {
      throw new Error(`No se encontró el directorio para el paquete: ${paquete}`)
    }

    const files = await fs.readdir(packageDir)
    const apkFile = files.find((file) => file.endsWith('.apk'))

    if (!apkFile) {
      throw new Error(`No se encontró ningún archivo .apk en el directorio: ${packageDir}`)
    }

    return path.join(packageDir, apkFile)
  } catch (error) {
    throw new Error(`Error al buscar el archivo APK: ${error.message}`)
  }
}

/**
 * @description Descompila un archivo APK utilizando JADX.
 *
 * @function descompilarApk
 * @param {string} apkPath - Ruta absoluta al archivo APK que se desea descompilar.
 * @returns {Promise<void>} Los archivos descompilados se almacenan en un subdirectorio "decompiled".
 * @throws {Error} Si ocurre un error durante la descompilación.
 */
async function descompilarApk (apkPath) {
  const jadxBin = path.join(__dirname, '../../tools/jadx/bin/jadx')
  const apkDir = path.dirname(apkPath)
  const outputDir = path.join(apkDir, 'decompiled')

  console.log(`Descompilando archivo: ${apkPath}`)
  console.log(`Archivos descompilados se guardarán en: ${outputDir}`)

  try {
    const exists = await fs.stat(outputDir).catch(() => false)
    if (exists) {
      console.log(`Eliminando directorio existente: ${outputDir}`)
      await fs.rm(outputDir, { recursive: true, force: true })
    }

    const command = `${jadxBin} ${apkPath} ${outputDir}`
    await execAsync(command)

    console.log(`Descompilación completada. Archivos generados en: ${outputDir}`)
  } catch (error) {
    console.error(`Error durante la descompilación: ${error.message}`)
    throw error
  }
}

/**
 * @description Maneja la carga de un archivo utilizando Multer.
 *
 * Almacena el archivo en una carpeta temporal y devuelve su ruta. Si ya existe un archivo con el mismo nombre, lo sobrescribe.
 *
 * @function subirArchivoTemporal
 * @param {object} req - Objeto de solicitud Express.
 * @param {object} res - Objeto de respuesta Express.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto JSON conteniendo la ruta del archivo subido.
 * @throws {Error} Si ocurre un error durante la carga o si no se proporciona un archivo válido.
 */
function subirArchivoTemporal (req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        return reject(err)
      }

      if (!req.file) {
        return reject(new Error('No se ha proporcionado ningún archivo.'))
      }

      const filePath = req.file.path
      resolve({
        ok: true,
        mensaje: 'Archivo subido correctamente a carpeta temporal.',
        datos: {
          filePath
        }
      })
    })
  })
}

module.exports = {
  buscarApk,
  descompilarApk,
  subirArchivoTemporal
}
