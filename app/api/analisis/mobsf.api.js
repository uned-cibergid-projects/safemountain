'use strict';
const MOBSF = require('../../modAnalisis/mobsf.js');
const { subirArchivo } = require('../../utils/fileUtils');

module.exports = (app, ruta) => {
    
    /**
     * @description Define la ruta para analizar una APK con MobSF.
     *
     * @param {string} ruta - La ruta base para los endpoints (por ejemplo, '/api/analisis/mobsf').
     * @authentication Esta ruta requiere autenticación HTTP.
     * @returns {Object} Respuesta JSON con el resultado del análisis.
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
