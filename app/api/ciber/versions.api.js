/**
 * @module ciber/versions_api
 * 
 * @description Este módulo define las rutas de la API CRUD para gestionar versions dentro de la aplicación modAppCollector.
 * Proporciona endpoints para crear, leer, actualizar y eliminar versions, facilitando la interacción con la base de datos a través de operaciones definidas en el módulo versions.
 * 
 * @requires modAppCollector/versions
 */

'use strict';
const VERSIONS = require('../../modAppCollector/versions.js');
const ObjectId = require('mongodb').ObjectId;

module.exports = (app, ruta) => {
    
    /**
     * @description Configura las rutas de la API CRUD para versions.
     *
     * @param {Object} app - La instancia de la aplicación Express.
     * @param {string} ruta - La ruta base para los endpoints de versions ('/api/versions').
     * 
     */

    /**
     * @description Define la ruta para obtener una version específica por su identificador único.
     *
     * @param {string} ruta - La ruta base para los endpoints de versions ('/api/versions').
     * @param {string} id - Identificador único de la version a recuperar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve una version específica basada en el ID proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la version.
     * 
     */
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            VERSIONS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @description Define la ruta para obtener versions por el ID de su parent.
     *
     * @param {string} ruta - La ruta base para los endpoints de versions ('/api/versions').
     * @param {string} package - ID del parent de las versions a buscar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve versions cuyo parentId es el ID proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la version.
     * 
     */
    app.route(`${ruta}/parent/:id`)
        .get((req, res, next) => {
            let opciones = {
                filtro: { 
                    parentId: new ObjectId(req.params.id) 
                },
                orden: {},
                campos: {},
                limite: 0
            };
            VERSIONS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @description Define la ruta para realizar consultas personalizadas sobre las versions.
     *
     * @route {POST} /api/versions/search
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Permite al cliente enviar un objeto de opciones para filtrar, ordenar, seleccionar campos específicos, limitar resultados y omitir registros en la consulta de versions.
     * @param {Object} opciones - Objeto que contiene las opciones de consulta.
     * @param {Object} [opciones.filtro] - Criterios de búsqueda como pares clave-valor.
     * @param {Object} [opciones.orden] - Ordenamiento de los resultados.
     * @param {Object} [opciones.campos] - Campos a seleccionar de los documentos versions.
     * @param {number} [opciones.limite] - Número máximo de registros version a recuperar.
     * @param {number} [opciones.skip] - Número de registros version a omitir para paginación.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de las versions que cumplen con las opciones proporcionadas.
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

        VERSIONS.leerCampo(opciones, 'versions')
            .then(result => res.status(200).json(result))
            .catch(err => next(err));
    });
};