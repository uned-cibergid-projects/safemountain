/** 
 * @module app/modAppCollector/apks
 * 
 * @description Funciones para gestionar APKs en el módulo modAppCollector.
 * 
 * @see apks_api
 */

'use strict';
const COLECCION = 'apks';
const CRUD = require('../servicios/crud');

module.exports = {
    leerId: leerId,
    leerCampo: leerCampo,
};

/**
 * @description Lee una APK por su identificador único.
 *
 * @function leerId
 * @param {string} id - El identificador único de la APK que se desea recuperar.
 * @returns {Promise<Object>} Una promesa que resuelve con un objeto que contiene el estado de la operación y los datos recuperados.
 * @throws {Error} Si la operación falla, se lanza un error.
 */
function leerId(id){
    let promesa = (resolve, reject) =>{
        CRUD.leerId(id, COLECCION)
            .then(result => resolve(result))
            .catch(err => reject(err));
    }
    return new Promise(promesa);
}

/**
 * @description Recupera múltiples APKs basándose en criterios de búsqueda específicos.
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
function leerCampo(opciones){
    let promesa = (resolve, reject) =>{
        CRUD.leerCampo(opciones, COLECCION)
            .then(result => resolve(result))
            .catch(err => reject(err));
    }
    return new Promise(promesa);
}
