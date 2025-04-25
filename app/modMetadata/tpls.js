/**
 * @module modMetadata/tpls
 *
 * @description Funciones para gestionar TPLs en el módulo modMetadata.
 *
 * @see tpls_api
 */

'use strict'

const COLECCION = require('../servicios/modelos/metadata.model').tpls
const CRUD = require('../servicios/crud')
const { exec } = require('child_process')
const path = require('path')

module.exports = {
  leerId,
  leerCampo,
  descargarTpls
}

/**
 * @description Lee una TPL por su identificador único.
 *
 * @function leerId
 * @param {string} id - El identificador único de la TPL que se desea recuperar.
 * @returns {Promise<Object>} Una promesa que resuelve con el objeto TPL correspondiente al ID especificado.
 * @throws {Error} Si la operación falla, se lanza un error.
 */
function leerId (id) {
  const promesa = (resolve, reject) => {
    CRUD.leerId(id, COLECCION)
      .then((result) => resolve(result))
      .catch((err) => reject(err))
  }
  return new Promise(promesa)
}

/**
 * @description Recupera múltiples TPLs basándose en criterios de búsqueda específicos.
 *
 * @function leerCampo
 * @param {Object} opciones - Las opciones para la consulta de TPLs.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Especificación del orden de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos TPL.
 * @param {number} [opciones.limite] - Número máximo de registros TPL a recuperar.
 * @param {number} [opciones.skip] - Número de registros TPL a omitir para paginación.
 * @returns {Promise<Object>} Una promesa que resuelve con un objeto que contiene el estado de la operación y los datos recuperados.
 * @throws {Error} Si la operación falla, se lanza un error con propiedades adicionales para contexto.
 */
function leerCampo (opciones) {
  const promesa = (resolve, reject) => {
    CRUD.leerCampo(opciones, COLECCION)
      .then((result) => resolve(result))
      .catch((err) => reject(err))
  }
  return new Promise(promesa)
}

/**
 * @description Ejecuta el script Python que descarga las TPLs pendientes.
 *
 * @function descargarTpls
 * @returns {Promise<void>} Una promesa que se resuelve cuando el proceso de descarga finaliza.
 * @throws {Error} Si el script falla al ejecutarse.
 */
async function descargarTpls () {
  try {
    const appCollectorDir = path.join(__dirname, '../../tools/appcollector')
    const pythonEnv = path.join(appCollectorDir, 'appcollector_env', 'bin', 'python3')
    const pythonScriptPath = path.join(appCollectorDir, 'sources', 'downloaders', 'getTpls.py')

    const cmd = `"${pythonEnv}" "${pythonScriptPath}"`
    console.log(`Ejecutando comando para descargar TPLs: ${cmd}`)

    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Error ejecutando script: ${error.message}\nStderr: ${stderr}`))
        }
        console.log('Salida estándar (stdout):', stdout)
        if (stderr) console.error('Errores (stderr):', stderr)
        resolve()
      })
    })

    console.log('Descarga de TPLs completada con éxito.')
  } catch (error) {
    throw new Error(`Fallo al descargar TPLs: ${error.message}`)
  }
}