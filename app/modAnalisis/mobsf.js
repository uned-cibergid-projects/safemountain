'use strict';
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const path = require('path');
const fs = require('fs');

/**
 * @description Ejecuta el análisis de un archivo APK utilizando MobSF. Este método invoca la herramienta MobSF, la cual debe estar clonada y configurada
 * en la carpeta `mobsf` en el directorio tools/ del proyecto.
 *
 * @param {string} filePath - Ruta absoluta del archivo APK a analizar.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto JSON con el resultado del análisis.
 * @throws {Error} Si ocurre un error durante la ejecución del análisis.
 */
async function analizar(filePath) {
  try {
    const mobSFDir = path.join(__dirname, '../../tools/mobsf');
    const resultDir = path.join(mobSFDir, 'results');

    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const pythonEnv = path.join(mobSFDir, 'mobsf_env', 'bin', 'python3');

    const cmd = `"${pythonEnv}" main.py --source="${filePath}" --result="${resultDir}"`;

    const { stdout, stderr } = await execAsync(cmd, { cwd: mobSFDir });

    if (stderr) {
      console.error('stderr:', stderr);
    }

    const baseName = path.basename(filePath);
    const jsonFile = path.join(resultDir, `${baseName}.json`);

    let analisisData;
    try {
      const fileContent = await fs.promises.readFile(jsonFile, 'utf8');
      analisisData = JSON.parse(fileContent);
    } catch (readError) {
      throw new Error(`No se obtuvo salida del análisis: ${readError}`);
    }

    return {
      ok: true,
      mensaje: "Archivo analizado correctamente",
      datos: {
        analisis: analisisData
      }
    };
  } catch (error) {
    throw new Error(`Error al analizar el archivo con MobSF: ${error.message}`);
  }
}

module.exports = {
  analizar
};
