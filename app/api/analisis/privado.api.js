/**
 * @module analisis/privado_api
 * 
 * @description Este módulo define las rutas de la API para gestionar análisis de código usando Privado Scan.
 * Proporciona endpoints para ejecutar un análisis, obtener resultados y almacenarlos en MongoDB.
 */

'use strict';
const PRIVADO = require('../../modAnalisis/privado.js');

module.exports = (app, ruta) => {
    
    /**
     * @description Define la ruta para ejecutar un análisis de código con Privado.
     *
     * @param {string} ruta - La ruta base para los endpoints de análisis ('/api/analisis/privado').
     * @param {string} package - Paquete de la APK a analizar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @returns {Object} Respuesta JSON con el estado de la operación y el resultado almacenado en MongoDB.
     * 
     */
    app.route(`${ruta}/:package`)
        .get((req, res, next) => {
            const paquete = req.params.package;

            PRIVADO.analizar(paquete)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });
};
