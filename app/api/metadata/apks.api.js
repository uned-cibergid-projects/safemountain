'use strict';
const APKS = require('../../modAppCollector/apks.js');

module.exports = (app, ruta) => {
    
    /**
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las APKs.
     *
     * /api/apks:
     *   get:
     *     summary: Define la ruta para obtener todas las APKs.
     *     tags: [Metadata APK]
     *     responses:
     *       200:
     *         description: La lista con todas las APKs.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Apk'
     */
    app.route(ruta)
        .get((req, res, next) => {
            let opciones = {
                filtro: {},
                campos: {},
                limite: 0,
                orden: {}
            };
            APKS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });


    /**
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las APKs.
     *
     * /api/apks/:id:
     *   get:
     *     summary: Define la ruta para obtener una APK por ID.
     *     tags: [Metadata APK]
     *     responses:
     *       200:
     *         description: Los detalles de una APK buscada por id.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Apk'
     */
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            APKS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las APKs.
     *
     * /api/apks/name/:name:
     *   get:
     *     summary: Define la ruta para obtener una APK por name.
     *     tags: [Metadata APK]
     *     responses:
     *       200:
     *         description: Los detalles de una APK buscada por name.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Apk'
     */
    app.route(`${ruta}/name/:name`)
        .get((req, res, next) => {
            let opciones = {
                filtro: { 
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
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las APKs.
     *
     * /api/apks/package/:package:
     *   get:
     *     summary: Define la ruta para obtener una APK por package.
     *     tags: [Metadata APK]
     *     responses:
     *       200:
     *         description: Los detalles de una APK buscada por package.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Apk'
     */
    app.route(`${ruta}/package/:package`)
        .get((req, res, next) => {
            let opciones = {
                filtro: { 
                    package: req.params.package 
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
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las APKs.
     *
     * /api/apks/search:
     *   post:
     *     summary: Define la ruta para buscar una APK con opciones de búsqueda detalladas.
     *     tags: [Metadata APK]
     *     responses:
     *       200:
     *         description: Los detalles de la/s APK/s buscadas.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Apk'
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