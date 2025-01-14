/**
 * @module app/modAnalisis/privado
 * 
 * @description Funciones para gestionar análisis de código utilizando Privado y almacenar resultados en MongoDB.
 */

'use strict';
const path = require('path');
const { exec } = require('child_process');
const CRUD = require('../servicios/crud');
const { buscarApk } = require('../utils/fileUtils'); // Importar la función buscarApk desde el nuevo archivo utils.js

const COLECCION = 'analisis';

module.exports = {
    analizar,
};

/**
 * @description Ejecuta el análisis con Privado CLI y guarda los resultados en MongoDB.
 *
 * @function analizar
 * @param {string} paquete - El nombre del paquete de la APK que se analizará.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado del análisis almacenado.
 * @throws {Error} Si el análisis falla o no se puede guardar en la base de datos.
 */
function analizar(paquete) {
    return new Promise((resolve, reject) => {
        try {
            const apkPath = buscarApk(paquete);

            const command = `privado scan ${apkPath}`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject({
                        ok: false,
                        mensaje: 'Error al ejecutar el análisis.',
                        detalles: stderr,
                    });
                }

                const resultPath = path.join(path.dirname(apkPath), '.privado', 'privado.json');
                fs.readFile(resultPath, 'utf8', (err, data) => {
                    if (err) {
                        return reject({
                            ok: false,
                            mensaje: 'No se pudo leer el archivo de resultados.',
                            detalles: err.message,
                        });
                    }

                    const result = JSON.parse(data);

                    CRUD.crear({ data: result, timestamp: new Date() }, COLECCION)
                        .then(savedResult => resolve({
                            ok: true,
                            mensaje: 'Análisis ejecutado y resultados almacenados con éxito.',
                            datos: savedResult,
                        }))
                        .catch(dbErr => reject({
                            ok: false,
                            mensaje: 'No se pudo guardar el resultado en la base de datos.',
                            detalles: dbErr.message,
                        }));
                });
            });
        } catch (error) {
            return reject({
                ok: false,
                mensaje: error.message,
            });
        }
    });
}
