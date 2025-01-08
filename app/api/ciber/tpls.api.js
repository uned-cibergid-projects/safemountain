'use strict';
const TPLS = require('../../modAppCollector/tpls.js');

/**
 * @module ciber/tpls_api
 * @description Este módulo define las rutas de la API CRUD para gestionar TPLs dentro de la aplicación modAppCollector.
 * Proporciona endpoints para crear, leer, actualizar y eliminar TPLs, facilitando la interacción con la base de datos a través de operaciones definidas en el módulo tpls.
 * 
 * @requires modAppCollector/tpls
 */
module.exports = (app, ruta) => {
    
    /**
     * Configura las rutas de la API CRUD para TPLs.
     *
     * @param {Object} app - La instancia de la aplicación Express.
     * @param {string} ruta - La ruta base para los endpoints de TPLs ('/api/tpls').
     * 
     */

    /**
     * Define la ruta para obtener una TPL específica por su identificador único.
     *
     * @param {string} ruta - La ruta base para los endpoints de TPLs ('/api/tpls').
     * @param {string} id - Identificador único de la TPL a recuperar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve una TPL específica basada en el ID proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la TPL.
     * 
     */
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            TPLS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * Define la ruta para obtener una TPL específica por su nombre de paquete.
     *
     * @param {string} ruta - La ruta base para los endpoints de TPLs ('/api/tpls').
     * @param {string} package - Nombre del package de la TPL a buscar.
     * @authentication Esta ruta requiere autenticación HTTP.
     * @description Devuelve una TPL específica basada en el nombre de paquete proporcionado.
     * @returns {Object} Respuesta JSON con el estado de la operación y los datos de la TPL.
     * 
     */
    app.route(`${ruta}/package/:package`)
        .get((req, res, next) => {
            let opciones = {
                buscar: { 
                    package: req.params.package 
                },
                orden: {},
                campos: {},
                limite: 1
            };
            TPLS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });
};
