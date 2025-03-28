'use strict'

const ESTATICO = require('../../modAnalisis/estatico.js')

module.exports = (app, ruta) => {
  /**
     * @swagger
     * tags:
     *   name: Estático
     *   description: Rutas para gestionar el análisis estático de las APKs.
     *
     * /api/estatico/search:
     *   post:
     *     summary: Define la ruta para buscar una APK con opciones de búsqueda detalladas.
     *     tags: [Estático]
     *     responses:
     *       200:
     *         description: Los detalles del análisis estático de la/s APK/s buscadas.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Estatico'
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

      ESTATICO.leerCampo(opciones)
        .then((result) => res.status(200).json(result))
        .catch((err) => next(err))
    })
}
