const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { buscarApk } = require('../utils/fileUtils');

module.exports = {
  analizar,
};

/**
 * Ejecuta un comando usando spawn, esperando a que termine realmente.
 * Acepta options para, por ejemplo, establecer cwd.
 *
 * @param {string} command - El comando a ejecutar.
 * @param {string[]} args - Argumentos para el comando.
 * @param {object} [options={}] - Opciones adicionales para spawn (ej. cwd).
 * @returns {Promise<void>} - Resuelve cuando el comando termina.
 */
async function ejecutarSpawn(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options, // Inyectamos las opciones, ej. { cwd: ... }
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        console.warn(`Advertencia: Proceso terminó con código de salida ${code}. Continuando...`);
      }
      resolve();
    });
  });
}

/**
 * @description Busca, descompila y analiza un archivo APK utilizando Privado CLI, y guarda los resultados.
 *
 * @function analizar
 * @param {string} paquete - El nombre del paquete de la APK que se analizará.
 * @returns {Promise<Object>} - Una promesa que resuelve con el resultado del análisis.
 * @throws {Error} Si alguna etapa falla.
 */
async function analizar(paquete) {
  try {
    // 1. Buscamos el APK
    const apkPath = await buscarApk(paquete);
    console.log(`Archivo APK encontrado: ${apkPath}`);

    // 2. Paths para descompilar con jadx
    const jadxBin = path.join(__dirname, '../../tools/jadx/bin/jadx');
    const outputDir = path.resolve(path.dirname(apkPath), 'decompile');

    console.log(`Descompilando archivo: ${apkPath}`);

    // 3. Ejecutar Jadx (descompilación)
    try {
      await ejecutarSpawn(jadxBin, [
        '--deobf',
        '--deobf-use-sourcename',
        '--show-bad-code',
        '--decompilation-mode', 'simple',
        '--no-inline-anonymous',
        '--no-inline-methods',
        '--respect-bytecode-access-modifiers',
        '--no-replace-consts',
        '--no-debug-info',
        '-ds', outputDir,
        '-r',
        apkPath
      ]);
      console.log(`Descompilación completada. Archivos generados en: ${outputDir}`);
    } catch (decompileError) {
      console.warn(
        `Advertencia: Falló durante la descompilación. Continuando con el análisis. Error: ${decompileError.message}`
      );
    }

    // 4. Ejecutar Privado CLI
    console.log(`Ejecutando análisis con Privado CLI en: ${outputDir}`);
    try {
      const sourcesPath = path.join(outputDir);

      // Importante: forzamos cwd a outputDir para que Privado cree .privado en ese directorio
      await ejecutarSpawn(
        'privado',
        ['scan', sourcesPath, '--debug', '--skip-dependency-download'],
        { cwd: outputDir }
      );

      console.log(`Análisis de Privado CLI completado.`);
    } catch (cliError) {
      console.warn(`Advertencia: Falló durante la ejecución de Privado CLI. Error: ${cliError.message}`);
    }

    // 5. Leer resultados
    const resultadoPath = path.join(outputDir, '.privado', 'privado.json');

    // Comprobamos que el archivo exista antes de leer
    try {
      await fs.access(resultadoPath);
    } catch (err) {
      throw new Error(`No se encontró el archivo de resultados en: ${resultadoPath}. Error: ${err.message}`);
    }

    const resultContent = await fs.readFile(resultadoPath, 'utf-8');
    const resultJson = JSON.parse(resultContent);

    console.log(`Resultados cargados desde: ${resultadoPath}`);

    return resultJson;
  } catch (error) {
    console.error(`Error durante el análisis con Privado CLI: ${error.message}`);
    if (error.message.includes('StackOverflowError')) {
      console.warn(
        'Advertencia: Error de pila detectado. Revisa la configuración del análisis o simplifica las reglas.'
      );
    }
    throw error;
  }
}
