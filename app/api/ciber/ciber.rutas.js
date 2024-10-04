'use strict'
const mantenimiento_difusion_api = require('./ciber.api.js');

module.exports = (app) => {    
    mantenimiento_difusion_api(app, '/api/ciber')
}