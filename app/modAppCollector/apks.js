/** 
 * @class modAppCollector/apks
 * @description funciones
 * 
 * @see apks_api
 * */
'use strict'
const TABLA = 'apks';
const CRUD = require('../servicios/crud');

module.exports = {
    leerId:leerId,
    leerCampo:leerCampo,
}

/**
 * Lee una APK por su identificador único.
 *
 * @function leerId
 * @memberof modAppCollector/apks
 * @param {string} id - El identificador único de la APK que se desea recuperar.
 * @returns {Promise<Object>} Una promesa que resuelve con el objeto APK correspondiente al ID especificado.
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
 * Recupera múltiples APKs basándose en criterios de búsqueda específicos.
 *
 * @function leerCampo
 * @memberof modAppCollector/apks
 * @param {Object} opciones - Las opciones para la consulta de APKs.
 * @param {Object} [opciones.buscar] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Ordenamiento de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos APK.
 * @param {number} [opciones.limite=0] - Número máximo de registros APK a recuperar.
 * @param {number} [opciones.skip=0] - Número de registros APK a omitir para paginación.
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
