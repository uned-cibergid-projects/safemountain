'use strict'
const apks_api = require('./apks.api.js');
const versions_api = require('./versions.api.js');
const tpls_api = require('./tpls.api.js')


module.exports = (app) => {    
    apks_api(app, '/api/apks'),
    versions_api(app, '/api/versions'),
    tpls_api(app, '/api/tpls')
}
