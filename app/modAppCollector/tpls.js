/** 
 * @module modAppCollector/tpls
 * 
 * @description Funciones para gestionar TPLs en el módulo modAppCollector.
 * 
 * @see tpls_api
 */

'use strict'
const TABLA = 'tpls';
const CRUD = require('../servicios/crud');

module.exports = {
    leerId:leerId,
    leerCampo:leerCampo,
}

/**
 * @description Lee una TPL por su identificador único.
 *
 * @function leerId
 * @param {string} id - El identificador único de la TPL que se desea recuperar.
 * @returns {Promise<Object>} Una promesa que resuelve con el objeto TPL correspondiente al ID especificado.
 * @throws {Error} Si la operación falla, se lanza un error.
 */
function leerId(id){
    let promesa = (resolve,reject) =>{
        CRUD.leerId(id, TABLA)
            .then(result => resolve(result))
            .catch(err => reject(err)
        )
    }
    return new Promise(promesa)
}

/**
 * @description Recupera múltiples TPLs basándose en criterios de búsqueda específicos.
 *
 * @function leerCampo
 * @param {Object} opciones - Las opciones para la consulta de TPLs.
 * @param {Object} [opciones.buscar] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Ordenamiento de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos TPL.
 * @param {number} [opciones.limite] - Número máximo de registros TPL a recuperar.
 * @param {number} [opciones.skip] - Número de registros TPL a omitir para paginación.
 * @returns {Promise<Object>} Una promesa que resuelve con un objeto que contiene el estado de la operación y los datos recuperados.
 * @throws {Error} Si la operación falla, se lanza un error con propiedades adicionales para contexto.
 */
function leerCampo(opciones){
    let promesa = (resolve,reject) =>{
        CRUD.leerCampo(opciones, TABLA)
            .then(result => resolve(result))
            .catch(err => reject(err)
        )
    }
    return new Promise(promesa)
}
