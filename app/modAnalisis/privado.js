const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const { buscarApk, copiarEnDirectorioTemporal } = require('../utils/fileUtils')
const execAsync = util.promisify(exec);

const COLECCION = 'analisis';

module.exports = {
    analizar,
};

/**
 * Ejecuta un comando usando spawn y maneja grandes volúmenes de salida.
 * @param {string} command - El comando a ejecutar.
 * @param {string[]} args - Los argumentos para el comando.
 * @returns {Promise<void>} - Resuelve cuando el comando termina.
 */
async function ejecutarSpawn(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit' });
        child.on('error', reject);
        child.on('close', code => {
            if (code !== 0) {
                console.warn(`Advertencia: Proceso terminó con código de salida ${code}. Continuando...`);
                resolve();
            } else {
                resolve();
            }
        });
    });
}

/**
 * @description Busca, descompila y analiza un archivo APK utilizando Privado CLI, y guarda los resultados en MongoDB.
 *
 * @function analizar
 * @param {string} paquete - El nombre del paquete de la APK que se analizará.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado del análisis almacenado.
 * @throws {Error} Si alguna etapa falla (búsqueda, descompilación o análisis).
 */
async function analizar(paquete) {
    try {
        const apkPath = await buscarApk(paquete);
        console.log(`Archivo APK encontrado: ${apkPath}`);

        const jadxBin = path.join(__dirname, '../../tools/jadx/bin/jadx');
        const outputDir = path.resolve(path.dirname(apkPath));

        console.log(`Descompilando archivo: ${apkPath}`);

        try {
            await ejecutarSpawn(jadxBin, ['--log-level', 'DEBUG', '-d', outputDir, apkPath]);
            console.log(`Descompilación completada. Archivos generados en: ${outputDir}`);
        } catch (decompileError) {
            console.warn(`Advertencia: Fallo durante la descompilación. Continuando con el análisis. Error: ${decompileError.message}`);
        }

        try {
            console.log(`Ejecutando análisis con Privado CLI en: ${tempDir}`);
            const privadoCommand = `privado scan --debug ${tempDir}`;
            const { stdout } = await execAsync(privadoCommand);

            console.log(`Análisis completado. Resultado: ${stdout}`);

            const resultPath = path.join(apkPath, 'privado.json');
            const resultStats = await fs.stat(resultPath);

            if (!resultStats.isFile()) {
                throw new Error(`No se encontró el archivo de resultados en la ruta esperada: ${resultPath}`);
            }

            const resultContent = await fs.readFile(resultPath, 'utf-8');
            const resultJson = JSON.parse(resultContent);

            console.log(`Resultados cargados desde ${resultPath}`);

            // Opcional: Guardar en MongoDB u otra base de datos aquí si es necesario.

            return resultJson;
        } finally {
            await limpiarDirectorioTemporal(tempDir);
        }
    } catch (error) {
        console.error(`Error durante el proceso: ${error.message}`);
        throw error;
    }
}
