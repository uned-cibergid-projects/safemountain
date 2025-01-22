'use strict';
const TPLS = require('../../modAppCollector/tpls.js');

module.exports = (app, ruta) => {
    
    /**
     * @swagger
     * tags:
     *   name: Metadata TPL
     *   description: Rutas para gestionar la metadata de las TPLs.
     */

    /**
     * @swagger
     * /api/tpls/:id:
     *   get:
     *     summary: Define la ruta para obtener una TPL por ID.
     *     tags: [Metadata TPL]
     *     responses:
     *       200:
     *         description: Los detalles de una TPL buscada por id.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Tpl'
     */
    app.route(`${ruta}/:id`)
        .get((req, res, next) => {
            TPLS.leerId(req.params.id)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });

    /**
     * @swagger
     * tags:
     *   name: Metadata APK
     *   description: Rutas para gestionar la metadata de las TPLs.
     */

    /**
     * @swagger
     * /api/tpls/package/:package:
     *   get:
     *     summary: Define la ruta para obtener una TPL por package.
     *     tags: [Metadata TPL]
     *     responses:
     *       200:
     *         description: Los detalles de una TPL buscada por package.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Tpl'
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
            TPLS.leerCampo(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        });
};
