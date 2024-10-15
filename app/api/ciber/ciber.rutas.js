'use strict'
const prueba_api = require('./prueba.api.js');

module.exports = (app) => {    
    prueba_api(app, '/api/ciber')
}
