/** 
 * @module modMetadata/apks
 * 
 * @description Funciones para gestionar APKs en el módulo modMetadata.
 * 
 * @see apks_api
 */

'use strict';
const CRUD = require('../servicios/crud');
const COLECCION = require('../servicios/modelos/metadata.model').apks
const { exec } = require('child_process');
const path = require('path');

module.exports = {
    leerId: leerId,
    leerCampo: leerCampo,
    guardarMetadata: guardarMetadata
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


async function guardarMetadata(data){
    try {
        const appCollectorDir = path.join(__dirname, '../../tools/appcollector');
        const pythonEnv = path.join(appCollectorDir, 'appcollector_env', 'bin', 'python3');
        const pythonScriptPath = path.join(appCollectorDir, 'sources', 'dataCollectors', 'getHostAppsMetadata.py');

        const dataBasica = {
            "name": data.name,
            "package": data.package_name,
            "category": data.playstore_details.genre.toLowerCase()
        }

        const dataBasicaJson = JSON.stringify(dataBasica);

        const cmd = `"${pythonEnv}" "${pythonScriptPath}" '${dataBasicaJson}'`;

        console.log(`Ejecutando comando: ${cmd}`);

        await new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
              if (error) {
                return reject(new Error(`Error ejecutando script: ${error.message}\nStderr: ${stderr}`));
              }
              console.log('Salida estándar (stdout):', stdout);
              console.log('Errores (stderr):', stderr);
              resolve();
            });
          });

          console.log('Metadata guardada correctamente en MongoDB');

    } catch (error) {
        throw new Error(`Error al guardar metadata en MongoDB de la APK ${data.package_name}: ${error.message}`);
    }

}
