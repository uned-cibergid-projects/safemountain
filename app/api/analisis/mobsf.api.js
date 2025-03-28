'use strict'

const MOBSF = require('../../modAnalisis/mobsf.js')

module.exports = (app, ruta) => {
  /**
    * @swagger
    * tags:
    *   name: Análisis de APK
    *   description: Rutas para analizar archivos APK utilizando MobSF.
    *
    * /api/analisis/mobsf/analizar:
    *   post:
    *     summary: Analiza un archivo APK utilizando MobSF.
    *     tags: [Análisis de APK]
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             properties:
    *               file:
    *                 type: string
    *                 format: binary
    *                 description: Archivo APK a analizar.
    *     responses:
    *       200:
    *         description: Resultado del análisis de la APK.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Archivo analizado correctamente"
    *                 datos:
    *                   type: object
    *                   description: Resultados detallados del análisis.
    *                   example:
    *                     category: "social"
    *                     package: "com.instagram.lite"
    *                     name: "instagram-lite.apk"
    */
  app.route(`${ruta}/analizar`)
    .post(async (req, res, next) => {
      try {
        const result = await MOBSF.analizar(req, res)
        res.status(200).json(result)
      } catch (err) {
        next(err)
      }
    })
}
