/**
 * @module utils/fileUtils
 *
 * @description Utilidades para la gestión de archivos, como búsqueda y validación.
 */

'use strict';
const { exec } = require('child_process');
const fs = require('fs/promises');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);

/**
 * @description Busca un archivo .apk en el directorio especificado.
 *
 * @function buscarApk
 * @param {string} paquete - El nombre del directorio package donde se buscará el archivo .apk.
 * @returns {string} La ruta completa al archivo .apk encontrado.
 * @throws {Error} Si el directorio no existe, no es válido o no contiene un archivo .apk.
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
 * @throws {Error} Si no se proporciona una ruta válida al archivo APK.
 * @returns {void} Los archivos descompilados se guardarán en un directorio "decompiled" junto al archivo original, sobrescribiendo cualquier contenido existente.
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
 * Copia un directorio a una ubicación local temporal.
 * @param {string} directorioOriginal - El directorio original..
 * @returns {Promise<string>} - La ruta del directorio temporal.
 */
async function copiarEnDirectorioTemporal(directorioOriginal) {
  const directorioTemporal = path.join('/tmp', `privado_temp_${Date.now()}`);
  console.log(`Copiando directorio ${directorioOriginal} a ${directorioTemporal}...`);
  await fs.mkdir(directorioTemporal, { recursive: true });

  const copyCommand = `cp -r ${directorioOriginal}/* ${directorioTemporal}`;
  await execAsync(copyCommand);

  console.log(`Copia completada: ${directorioTemporal}`);
  return directorioTemporal;
}
  
module.exports = {
    buscarApk,
    descompilarApk,
    copiarEnDirectorioTemporal,
};
