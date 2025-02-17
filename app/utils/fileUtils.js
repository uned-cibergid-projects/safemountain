/**
 * @module utils/fileUtils
 *
 * @description Utilidades para la gestión de archivos: búsqueda, validación y carga.
 */

'use strict';
const { exec } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs'); 
const util = require('util');
const path = require('path');
const multer = require('multer');
const execAsync = util.promisify(exec);

/**
 * @description Extensiones de archivo permitidas para la carga.
 * @constant {string[]}
 */
const extensionesPermitidas = ['.apk'];

/**
 * @description Tamaño máximo permitido para los archivos en bytes (50MB).
 * @constant {number}
 */
const tamañoMaximoArchivo = 50 * 1024 * 1024;

/**
 * @description Configuración de almacenamiento de Multer para gestionar la carga de archivos.
 *
 * Por ahora, si el archivo es un .apk, se almacenará en una ubicación específica. Si no es un .apk, se rechazará la carga.
 *
 * @constant {object}
 */
const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    let uploadPath;
    switch(ext){
        case '.apk':
            uploadPath = path.join(__dirname, '../../uploads');
            break;
        default:
            throw new Error(`Extensión de archivo no permitida.`);
    }
    if (!fsSync.existsSync(uploadPath)) {
      fsSync.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    switch(ext){
        case '.apk':
            cb(null, file.originalname);
            break;
        default:
            throw new Error(`Extensión de archivo no permitida.`);
    }
  }
});

/**
 * @description Filtro de archivos para Multer.
 *
 * Solo permite archivos con extensiones especificadas en `extensionesPermitidas`.
 * Si se trata de un .apk y ya existe en la carpeta destino, se rechaza la carga.
 *
 * @function fileFilter
 * @param {object} req - Objeto de solicitud Express.
 * @param {object} file - Archivo recibido.
 * @param {function} cb - Callback para continuar el proceso de carga.
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!extensionesPermitidas.includes(ext)) {
    return cb(new Error('Tipo de archivo no permitido'), false);
  }
  if (ext === '.apk') {
    const targetDir =  path.join(__dirname, '../../uploads');
    const targetPath = path.join(targetDir, file.originalname);
    if (fsSync.existsSync(targetPath)) {
      req.existingFilePath = targetPath;
      return cb(null, false);
    }
  }
  cb(null, true);
};

/**
 * @description Middleware de Multer para manejar la carga de un único archivo. Se espera que el campo en `form-data` se llame "archivo".
 *
 * @constant {object}
 */
const upload = multer({
  storage: uploadStorage,
  fileFilter: fileFilter,
  limits: { fileSize: tamañoMaximoArchivo }
}).single('archivo');

/**
 * @description Busca un archivo .apk en el directorio de APKs.
 *
 * @function buscarApk
 * @param {string} paquete - El nombre del directorio donde se buscará el archivo .apk.
 * @returns {string} La ruta completa al archivo .apk encontrado.
 * @throws {Error} Si no existe el directorio o no contiene un archivo .apk.
 */
async function buscarApk(paquete) {
  const BASE_DIRECTORY = '/home/dblancoaza/SafeMountain/nfs/incibePro/analisisAplicaciones/datasets/hostApks/social';
  const packageDir = path.join(BASE_DIRECTORY, paquete);

  try {
      const stats = await fs.stat(packageDir);
      if (!stats.isDirectory()) {
          throw new Error(`No se encontró el directorio para el paquete: ${paquete}`);
      }

      const files = await fs.readdir(packageDir);
      const apkFile = files.find(file => file.endsWith('.apk'));

      if (!apkFile) {
          throw new Error(`No se encontró ningún archivo .apk en el directorio: ${packageDir}`);
      }

      return path.join(packageDir, apkFile);
  } catch (error) {
      throw new Error(`Error al buscar el archivo APK: ${error.message}`);
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
async function descompilarApk(apkPath) {
  const jadxBin = path.join(__dirname, '../../tools/jadx/bin/jadx');
  const apkDir = path.dirname(apkPath);
  const outputDir = path.join(apkDir, 'decompiled');

  console.log(`Descompilando archivo: ${apkPath}`);
  console.log(`Archivos descompilados se guardarán en: ${outputDir}`);

  try {
      const exists = await fs.stat(outputDir).catch(() => false);
      if (exists) {
          console.log(`Eliminando directorio existente: ${outputDir}`);
          await fs.rm(outputDir, { recursive: true, force: true });
      }

      const command = `${jadxBin} ${apkPath} ${outputDir}`;
      await execAsync(command);

      console.log(`Descompilación completada. Archivos generados en: ${outputDir}`);
  } catch (error) {
      console.error(`Error durante la descompilación: ${error.message}`);
      throw error;
  }
}

/**
 * @description Sube un archivo utilizando Multer.
 *
 * Si ya existe un archivo con el mismo nombre, se devuelve su ruta.
 *
 * @function subirArchivo
 * @param {object} req - Objeto de solicitud Express.
 * @param {object} res - Objeto de respuesta Express.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto JSON conteniendo la ruta del archivo.
 * @throws {Error} Si ocurre un error durante la carga o no se proporciona archivo.
 */
function subirArchivo(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        return reject(err);
      }

      if (req.existingFilePath) {
        return resolve({
          ok: true,
          mensaje: "El archivo ya existía. Se devuelve el filePath del archivo existente.",
          datos: {
            filePath: req.existingFilePath
          }
        });
      }
      if (!req.file) {
        return reject(new Error("No se ha proporcionado ningún archivo."));
      }
      const filePath = req.file.path;
      resolve({
        ok: true,
        mensaje: "Archivo subido correctamente.",
        datos: {
          filePath: filePath
        }
      });
    });
  });
}

module.exports = {
    buscarApk,
    descompilarApk,
    subirArchivo,
};
