'use strict'
const privado_api = require('./privado.api.js')

module.exports = (app) => {    
    privado_api(app, '/api/analisis/privado')
}
