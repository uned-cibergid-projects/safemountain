/**
 * @module ciber/apks_api
 * 
 * @description Este módulo define las rutas de la API CRUD para gestionar APKs dentro de la aplicación modAppCollector.
 * Proporciona endpoints para crear, leer, actualizar y eliminar APKs, facilitando la interacción con la base de datos a través de operaciones definidas en el módulo apks.
 * 
 * @requires modAppCollector/apks
 */

'use strict';
const APKS = require('../../modAppCollector/apks.js');

module.exports = (app, ruta) => {
    
    /**
     * @description Configura las rutas de la API CRUD para APKs.
     *
     * @param {Object} app - La instancia de la aplicación Express.
     * @param {string} ruta - La ruta base para los endpoints de APKs ('/api/apks').
     * 
     */
    
    /**
     * @description Define la ruta para obtener todas las APKs.
     *
     * @param {string} ruta - La ruta base para los endpoints de APKs ('/api/apks').
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve todas las APKs disponibles en la base de datos.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de las APKs.
     *
     */
    app.route(ruta)
        .get((req, res, next) => {
            let opciones = {
                buscar: {},
                campos: {},
                limite: 0,
                orden: {}
            };
            APKS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @description Define la ruta para obtener una APK específica por su identificador único.
     *
     * @param {string} ruta - La ruta base para los endpoints de APKs ('/api/apks').
     * @param {string} id - Identificador único de la APK a recuperar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve una APK específica basada en el ID proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la APK.
     * 
     */
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            APKS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @description Define la ruta para obtener una APK específica por su nombre.
     *
     * @param {string} ruta - La ruta base para los endpoints de APKs ('/api/apks').
     * @param {string} name - Nombre de la APK a buscar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve una APK específica basada en el nombre proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la APK.
     * 
     */
    app.route(`${ruta}/name/:name`)
        .get((req, res, next) => {
            let opciones = {
                buscar: { 
                    name: req.params.name 
                },
                orden: {},
                campos: {},
                limite: 1
            };
            APKS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @description Define la ruta para realizar consultas personalizadas sobre las APKs.
     *
     * @route {POST} /api/apks/search
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Permite al cliente enviar un objeto de opciones para filtrar, ordenar, seleccionar campos específicos, limitar resultados y omitir registros en la consulta de APKs.
     * @param {Object} opciones - Objeto que contiene las opciones de consulta.
     * @param {Object} [opciones.buscar] - Criterios de búsqueda como pares clave-valor.
     * @param {Object} [opciones.orden] - Ordenamiento de los resultados.
     * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos APK.
     * @param {number} [opciones.limite] - Número máximo de registros APK a recuperar.
     * @param {number} [opciones.skip] - Número de registros APK a omitir para paginación.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de las APKs que cumplen con las opciones proporcionadas.
     * 
     */
    app.route(`${ruta}/search`)
    .post((req, res, next) => {
        const opciones = req.body;

        if (typeof opciones !== 'object') {
            return res.status(400).json({
                ok: false,
                mensaje: 'Las opciones deben ser un objeto válido.',
                datos: []
            });
        }

        APKS.leerCampo(opciones, 'apks')
            .then(result => res.status(200).json(result))
            .catch(err => next(err));
    });
};