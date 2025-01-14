/**
 * @module utils/fileUtils
 *
 * @description Utilidades para la gestión de archivos, como búsqueda y validación.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const BASE_DIRECTORY = '/home/dblancoaza/SafeMountain/nfs/incibePro/analisisAplicaciones/datasets/hostApks/social';
const DOWNLOAD_DIR = path.resolve(__dirname, '../downloads');
const JADX_BIN = path.join(DOWNLOAD_DIR, 'jadx/jadx/bin/jadx');
const JAVA_BIN = path.join(DOWNLOAD_DIR, 'java/jdk-17.0.8.1+1/bin/java');

/**
 * @description Busca un archivo .apk en el directorio especificado.
 *
 * @function buscarApk
 * @param {string} paquete - El nombre del directorio package donde se buscará el archivo .apk.
 * @returns {string} La ruta completa al archivo .apk encontrado.
 * @throws {Error} Si el directorio no existe, no es válido o no contiene un archivo .apk.
 */
function buscarApk(paquete) {
    const packageDir = path.join(BASE_DIRECTORY, paquete);

    if (!fs.existsSync(packageDir) || !fs.statSync(packageDir).isDirectory()) {
        throw new Error(`No se encontró el directorio para el paquete: ${paquete}`);
    }

    const apkFile = fs.readdirSync(packageDir).find(file => file.endsWith('.apk'));
    if (!apkFile) {
        throw new Error(`No se encontró ningún archivo .apk en el directorio: ${packageDir}`);
    }

    return path.join(packageDir, apkFile);
}

/**
 * @description Descompila un archivo APK utilizando JADX.
 *
 * @function descompilarApk
 * @param {string} apkPath - Ruta absoluta al archivo APK que se desea descompilar.
 * @throws {Error} Si no se proporciona una ruta válida al archivo APK.
 * @returns {void} Los archivos descompilados se guardarán en un directorio "decompiled" junto al archivo original, sobrescribiendo cualquier contenido existente.
 */
function descompilarApk(apkPath) {

    const apkDir = path.dirname(apkPath);
    const outputDir = path.join(apkDir, 'decompiled');
  
    cconsole.log(`Decompilando archivo: ${apkPath}`);
    console.log(`Archivos descompilados se guardarán en: ${outputDir}`);
  
    if (fs.existsSync(outputDir)) {
      console.log(`Eliminando directorio existente: ${outputDir}`);
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  
    const command = `${JAVA_BIN} -jar ${JADX_BIN}.jar -d ${outputDir} ${apkPath}`;
  
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error ejecutando JADX: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error: ${stderr}`);
        return;
      }
      console.log(`Decompilación completada. Archivos generados en: ${outputDir}`);
    });
  }

/**
 * @description Descarga un archivo desde una URL utilizando curl.
 * 
 * @function descargarArchivo
 * @param {string} comando - Comando curl completo para ejecutar.
 * @param {Object} [opciones] - Opciones adicionales para la ejecución.
 * @param {string|string[]} [opciones.stdio] - Configuración de stdio (por defecto: 'inherit').
 * @returns {void}
 */
function descargarArchivo(comando, opciones = {}) {
    const { stdio = 'inherit' } = opciones;

    try {
        console.log(`Descargando: ${comando}`);
        execSync(comando, { stdio });
        console.log(`Descarga completada: ${comando}`);
    } catch (error) {
        throw new Error(`Error durante la descarga con curl: ${error.message}`);
    }
}
  

module.exports = {
    buscarApk,
    descompilarApk,
    descargarArchivo,
};
