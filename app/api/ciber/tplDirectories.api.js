/**
 * @module modAppCollector/pruebas_api
 * @description API CRUD de pruebas
 * @see modAppCollector
 * @requires modAppCollector/pruebas
 * 
 */

'use strict'
const PRUEBAS = require('../../modAppCollector/tplDirectories.js');

module.exports = (app, ruta) => {
   /**
     * @name GET /
     * @route {GET} /api/ciber/
     * @authentication Esta ruta requiere autenticación HTTP.
     * @see modAppCollector/pruebas.leerVarios
     * @description Devuelve todos los pruebas
     * - **Devuelve** {result}
    */
     app.route(ruta)
        .get((req, res, next) => {
            let opciones = {
                buscar:{},
                campos:{},
                limite: 0,
                orden: {}
            }
            PRUEBAS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err))
        });


    /**
     * @name GET /:id
     * @route {GET} /api/ciber/:id
     * @routeparam {String} :id Identificador del usuario
     * @authentication Esta ruta requiere autenticación HTTP.
     * @see modAppCollector/pruebas.leerId
     * @description Devuelve un pruebas por id
     * - **Devuelve** {result}
     */ 
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            PRUEBAS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err))
        })

   /**
   * @name POST /
   * @route {POST} /api/ciber/
   * @bodyparam {Object} registro Ver MODELO {@link modAppCollector/pruebas_model}
   * @authentication Esta ruta requiere autenticación HTTP.
   * @see modAppCollector/pruebas.nuevo
     * @description Crea un nuevo asignatura
     * - **Devuelve** {result} 
     */ 
    app.route(ruta)
        .post((req, res,next) => {
            PRUEBAS.nuevo(req.body, req.idciber)
                .then(result => res.status(201).json(result))
                .catch(err => next(err))
        }) 

    /**
     * @name PUT /:id
     * @route {PUT} /api/ciber/:id`
     * @routeparam {String} :id Identificador del usuario
     * @bodyparam {Object} registro Ver MODELO {@link modAppCollector/pruebas_model}
     * @authentication Esta ruta requiere autenticación HTTP
     * @see modAppCollector/pruebas.modificar
     * @description Modifica un pruebas
     * - **Devuelve** { result }
     */ 
    app.route(`${ruta}/:id`)
        .put((req, res,next) => {
            let id = req.params.id;
            PRUEBAS.modificar(id, req.body, req.idciber)
                .then(result => res.status(200).json(result))
                .catch(err => next(err))
        }) 

    /**
     * @name DELETE /:id
     * @route {DELETE} /api/ciber/:id`
     * @routeparam {String} :id Identificador del usuario
     * @authentication Esta ruta requiere autenticación HTTP.
     * @see modAppCollector/pruebas.borrar 
     * @description Elimina un asignatsuras
     * - **Devuelve** {result} 
     */ 
    app.route(`${ruta}/:id`)
        .delete((req, res,next) => {
            PRUEBAS.borrar(req.params.id, req.idciber)
                .then(result => res.status(200).json(result))
                .catch(err => next(err))
        })
    /**
     * @name POST /query
     * @route {GET} /api/ciber/query
     * @authentication Esta ruta requiere autenticación HTTP.
     * @see modAppCollector/pruebas.leerCampo
     * @bodyparam {Object} Opciones de búsqueda
     * @description Devuelve todos los registros que cumplen la condición de búsqueda
     * - **Devuelve** {result}
     */         
    // app.route(`${ruta}/query`)
    //     .post((req, res, next) => {
    //         let opciones = {
    //             coleccion: '',
    //             buscar : {},
    //             campos : {},
    //             limite : 0,
    //             skip: 0,
    //             orden : {'f_creacion':'desc'}
    //         };
    //         if(req.body.buscar) opciones.buscar = req.body.buscar;
    //         if(req.body.limite) opciones.limite = req.body.limite;
    //         if(req.body.skip) opciones.skip = req.body.skip;
    //         if(req.body.campos) opciones.campos = req.body.campos;
    //         if(req.body.orden) opciones.orden = req.body.orden;
    //         PRUEBAS.leerCampo(opciones)
    //             .then(result => res.status(200).json(result))
    //             .catch(err => next(err))
    //     })        
}
