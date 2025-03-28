'use strict'

const VERSIONS = require('../../modMetadata/versions.js')

module.exports = (app, ruta) => {
  /**
     * @swagger
     * tags:
     *   name: Metadata Versions
     *   description: Rutas para gestionar la metadata de las Versions.
     *
     * /api/versions/:id:
     *   get:
     *     summary: Define la ruta para obtener una version por ID.
     *     tags: [Metadata Versions]
     *     responses:
     *       200:
     *         description: Los detalles de una version buscada por id.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Version'
     */
  app.route(`${ruta}/:id`)
    .get((req, res, next) => {
      VERSIONS.leerId(req.params.id)
        .then((result) => res.status(200).json(result))
        .catch((err) => next(err))
    })

  /**
     * @swagger
     * tags:
     *   name: Metadata Versions
     *   description: Rutas para gestionar la metadata de las Versions.
     *
     * /api/versions/search:
     *   post:
     *     summary: Define la ruta para buscar una version con opciones de búsqueda detalladas.
     *     tags: [Metadata Versions]
     *     responses:
     *       200:
     *         description: Los detalles de la/s Version/s buscadas.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Version'
     */
  app.route(`${ruta}/search`)
    .post((req, res, next) => {
      const opciones = req.body

      if (typeof opciones !== 'object') {
        return res.status(400).json({
          ok: false,
          mensaje: 'Las opciones deben ser un objeto válido.',
          datos: []
        })
      }

      VERSIONS.leerCampo(opciones, 'versions')
        .then((result) => res.status(200).json(result))
        .catch((err) => next(err))
    })
}
