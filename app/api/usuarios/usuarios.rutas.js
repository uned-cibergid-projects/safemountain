'use strict'

const usuarios_api = require('./usuarios.api.js')
const usuarios_auth_api = require('./usuarios.auth.api.js')

module.exports = (app) => {
  usuarios_api(app, '/api/usuarios')
  usuarios_auth_api(app, '/api/auth')
}
