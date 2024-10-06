'use strict';
const ciberAPI = require('./prueba.api.js'); // si este archivo define funciones o controladores

module.exports = (app) => {    
    // Definir una ruta básica para /api/ciber
    app.get('/api/ciber', (req, res) => {
        res.json({
            ok: true,
            mensaje: 'Bienvenido a la API Ciber',
            datos: []
        });
    });
};