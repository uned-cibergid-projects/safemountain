/**
 * @module modAnalisis/privado
 *
 * @description Funciones para descompilar y analizar APKs con Privado CLI.
 * @see privado_api
 */

const fs = require('fs').promises
const path = require('path')
const { buscarApk } = require('../utils/fileUtils')
const { ejecutarSpawn } = require('../utils/subprocessUtils')

module.exports = {
  analizar
}

/**
 * @description Busca, descompila y analiza un archivo APK utilizando Privado CLI, y guarda los resultados en formato JSON.
 *
 * @function analizar
 * @param {string} paquete - El nombre del paquete de la APK que se analizará.
 * @returns {Promise<Object>} - Una promesa que resuelve con el resultado del análisis.
 * @throws {Error} Si alguna etapa falla.
 */
async function analizar (paquete) {
  try {
    const apkPath = await buscarApk(paquete)
    console.log(`Archivo APK encontrado: ${apkPath}`)

    const jadxBin = path.join(__dirname, '../../tools/jadx/bin/jadx')
    const outputDir = path.resolve(path.dirname(apkPath), 'decompile')

    console.log(`Descompilando archivo: ${apkPath}`)

    try {
      await ejecutarSpawn(jadxBin, [
        '--deobf',
        '--deobf-use-sourcename',
        '--decompilation-mode', 'simple',
        '--no-debug-info',
        '-ds', outputDir,
        '-r',
        apkPath
      ])
      console.log(`Descompilación completada. Archivos generados en: ${outputDir}`)
    } catch (decompileError) {
      console.warn(
        `Advertencia: Falló durante la descompilación. Continuando con el análisis. Error: ${decompileError.message}`
      )
    }

    console.log(`Ejecutando análisis con Privado CLI en: ${outputDir}`)
    try {
      await ejecutarSpawn(
        'privado',
        ['scan', outputDir, '--debug', '--skip-dependency-download'],
        {
          stdio: 'inherit',
          cwd: outputDir
        }
      )

      console.log('Análisis de Privado CLI completado.')
    } catch (cliError) {
      console.warn(`Advertencia: Falló durante la ejecución de Privado CLI. Error: ${cliError.message}`)
    }

    const resultadoPath = path.join(outputDir, '.privado', 'privado.json')

    try {
      await fs.access(resultadoPath)
    } catch (err) {
      throw new Error(`No se encontró el archivo de resultados en: ${resultadoPath}. Error: ${err.message}`)
    }

    const resultContent = await fs.readFile(resultadoPath, 'utf-8')
    const resultJson = JSON.parse(resultContent)

    console.log(`Resultados cargados desde: ${resultadoPath}`)

    return resultJson
  } catch (error) {
    console.error(`Error durante el análisis con Privado CLI: ${error.message}`)
    if (error.message.includes('StackOverflowError')) {
      console.warn(
        'Advertencia: Error de pila detectado. Revisa la configuración del análisis o simplifica las reglas.'
      )
    }
    throw error
  }
}
