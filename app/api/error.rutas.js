'use strict'
const error_api = require('./error.api.js');

module.exports = (app) => {    
    error_api(app, '/')
}