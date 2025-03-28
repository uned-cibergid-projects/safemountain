/**
 * @module modAnalisis/estatico
 *
 * @description Funciones para gestionar análisis estatico en el módulo modAnalisis.
 *
 * @see estatico_api
 */

'use strict'

const CRUD = require('../servicios/crud')
const COLECCION = require('../servicios/modelos/analisis.model').estatico

module.exports = {
  leerCampo
}

/**
 * @description Recupera múltiples análisis estáticos basándose en criterios de búsqueda específicos.
 *
 * @function leerCampo
 * @param {Object} opciones - Las opciones para la consulta de APKs.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Especificación del orden de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos APK.
 * @param {number} [opciones.limite] - Número máximo de registros APK a recuperar.
 * @param {number} [opciones.skip] - Número de registros APK a omitir para paginación.
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
