/**
 * @module modMetadata/versions
 *
 * @description Funciones para gestionar versions en el módulo modMetadata.
 *
 * @see versions_api
 */

'use strict'

const COLECCION = require('../servicios/modelos/metadata.model').versions
const CRUD = require('../servicios/crud')

module.exports = {
  leerId,
  leerCampo
}

/**
 * @description Lee una version por su identificador único.
 *
 * @function leerId
 * @param {string} id - El identificador único de la version que se desea recuperar.
 * @returns {Promise<Object>} Una promesa que resuelve con el objeto version correspondiente al ID especificado.
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
 * @description Recupera múltiples versions basándose en criterios de búsqueda específicos.
 *
 * @function leerCampo
 * @param {Object} opciones - Las opciones para la consulta de versions.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Especificación del orden de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos version.
 * @param {number} [opciones.limite] - Número máximo de registros version a recuperar.
 * @param {number} [opciones.skip] - Número de registros version a omitir para paginación.
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
