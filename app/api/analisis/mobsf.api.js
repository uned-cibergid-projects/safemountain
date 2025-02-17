'use strict';
const MOBSF = require('../../modAnalisis/mobsf.js');
const { subirArchivo } = require('../../utils/fileUtils');

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
     *                     {
     *                       "analisis": {
     *                         "file_name": "instagram-lite.apk",
     *                         "app_name": "Instagram Lite",
     *                         "app_type": "apk",
     *                         "size": "2.8MB",
     *                         "md5": "6b143cd6ead16d6a22f46c9a90c2ddb4945744eed641fda9eca82a97cccaa8a9",
     *                         "sha1": "1c2245e0c9b55f9706d2b3c936083d0745dc72fb",
     *                         "sha256": "6b143cd6ead16d6a22f46c9a90c2ddb4945744eed641fda9eca82a97cccaa8a9",
     *                         "package_name": "com.instagram.lite",
     *                         "main_activity": "com.facebook.lite.MainActivity",
     *                         "exported_activities": [
     *                           "com.facebook.lite.loginWithFacebook.wrapper.CustomTabActivity",
     *                           "com.instagram.lite.stories.activities.ShareToIgStoriesAlias",
     *                           "com.instagram.lite.stories.activities.ShareToIgFeedAlias",
     *                           "com.instagram.lite.deeplinking.activities.E2EActivityAlias",
     *                           "com.instagram.lite.stories.activities.ShareToIgChatsAlias",
     *                           "com.instagram.lite.stories.activities.ShareTextToIgChatsAlias"
     *                         ],
     *                         "...": "..."
     *                       }
     *                     }
     */
    app.route(`${ruta}/analizar`)
        .post(async (req, res, next) => {
            try {
                const result = await MOBSF.analizar(req, res);
                res.status(200).json(result);
            } catch (err) {
                next(err);
            }
        });
};
