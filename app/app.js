'use strict'

const CONFIG = require('./config.js')[process.env.NODE_ENV || 'desarrollo'];

process.env.DEBUG = CONFIG.DEBUG || '*:*';

// const debug = require('debug')('metadata:inicio');

const debug = require('debug')(`${CONFIG.APP}:inicio`);

const SISTEMA = require('./servicios/sistema.js')

const mongoose = require('./servicios/mongoose.js');

mongoose.cargarBd();

const middleware = require('./config/middleware.js')
var app = middleware()

// Comprobamos existencia carpetas definidas dentro de config
const TOOLS = require('./servicios/tools.js')

const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Express API for JSONPlaceholder',
    version: '1.0.0',
  },
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

TOOLS.comprobarCarpetaYCrear(CONFIG)
    .then(result => debug('Comprobación carpetas ok'))
    .catch(err => debug(err))


debug('process.cwd()',process.cwd())

debug(`Entorno: ${[process.env.NODE_ENV]}\n
VERSION: ${CONFIG.VERSION}\n
MONGO_HOST:${CONFIG.MONGO.host}\n
MONGO_DB:${CONFIG.MONGO.db}\n
MONGO_PORT:${CONFIG.MONGO.port}\n
APP_LISTEN_PORT:${CONFIG.PORT}\n
`);


// versiones básicas instaladas
// const COMANDOS = ["node --version", "npm --version", "npm list express", "npm list mongoose"];

const COMANDOS = ["node --version", "npm --version"];

SISTEMA.runComandos(COMANDOS)
	.then(res => debug(res))
    .catch(err => debug(err))

module.exports = app;
