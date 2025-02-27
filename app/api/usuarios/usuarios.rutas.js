'use strict'
const usuarios_api = require('./usuarios.api.js');

module.exports = (app) => {    
    usuarios_api(app, '/api/usuarios')
}