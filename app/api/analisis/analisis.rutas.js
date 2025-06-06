'use strict'

const mobsf_api = require('./mobsf.api.js')
const privado_api = require('./privado.api.js')
const estatico_api = require('./estatico.api.js')

module.exports = (app) => {
  mobsf_api(app, '/api/analisis/mobsf')
  privado_api(app, '/api/analisis/privado')
  estatico_api(app, '/api/analisis/estatico')
}
