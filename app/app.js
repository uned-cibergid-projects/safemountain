'use strict'

const CONFIG = require('./config.js')[process.env.NODE_ENV || 'development']

process.env.DEBUG = CONFIG.DEBUG || '*:*'

// const debug = require('debug')('metadata:inicio');

const debug = require('debug')(`${CONFIG.APP}:inicio`)

const SISTEMA = require('./servicios/sistema.js')

const mongoose = require('./servicios/mongoose.js')

mongoose.cargarBd()

const middleware = require('./config/middleware.js')

const app = middleware()

// Comprobamos existencia carpetas definidas dentro de config
const TOOLS = require('./servicios/tools.js')

const swaggerJSDoc = require('swagger-jsdoc')

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SafeMountain API',
    version: '1.0.0'
  }
}

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js']
}

swaggerJSDoc(options)

TOOLS.comprobarCarpetaYCrear(CONFIG)
  .then(() => debug('Comprobación carpetas ok'))
  .catch((err) => debug(err))

debug('process.cwd()', process.cwd())

debug(`
  Entorno: ${process.env.NODE_ENV}
  VERSION: ${CONFIG.VERSION}
  
  --- METADATA ---
  MONGO_HOST_METADATA: ${CONFIG.MONGO_METADATA.host}
  MONGO_DB_METADATA:   ${CONFIG.MONGO_METADATA.db}
  MONGO_PORT_METADATA: ${CONFIG.MONGO_METADATA.port}
  
  --- ANALISIS ---
  MONGO_HOST_ANALISIS: ${CONFIG.MONGO_ANALISIS.host}
  MONGO_DB_ANALISIS:   ${CONFIG.MONGO_ANALISIS.db}
  MONGO_PORT_ANALISIS: ${CONFIG.MONGO_ANALISIS.port}
  
  APP_LISTEN_PORT: ${CONFIG.PORT}
  `)

// versiones básicas instaladas
// const COMANDOS = ["node --version", "npm --version", "npm list express", "npm list mongoose"];

const COMANDOS = ['node --version', 'npm --version']

SISTEMA.runComandos(COMANDOS)
  .then((res) => debug(res))
  .catch((err) => debug(err))

module.exports = app
