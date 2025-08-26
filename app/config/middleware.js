'use strict'

const CONFIG = require('../config')[process.env.NODE_ENV || 'development']
const debug = require('debug')(`${CONFIG.APP}:middleware`)
const path = require('path')
const fs   = require('fs')

const serveIndex = require('serve-index')
const logger = require('morgan')
const rfs = require('rotating-file-stream')
const helmet = require('helmet')
const cors = require('cors')

const express = require('express')

// const CRON = require('./cron');

const swaggerUI = require('swagger-ui-express')
const { grabarLog } = require('../servicios/crud')
const specs = require('./swagger')

module.exports = (app) => {
  var app = express()

  // --- Raíz del proyecto: .../SafeMountain/API
  const ROOT_DIR  = path.resolve(__dirname, '..', '..')
  const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
  const LEGAL_DIR  = path.join(PUBLIC_DIR, 'legal')
  const LOGS_DIR   = path.join(PUBLIC_DIR, 'logs')
  const PROC_DIR   = path.join(PUBLIC_DIR, 'procesos')
  const BACKUP_DIR = path.join(PUBLIC_DIR, 'backup')
  debug('STATIC ROOT_DIR:', ROOT_DIR)

  app.use(helmet({
    // Evita que la aplicación sea incrustada en iframes (protección contra Clickjacking)
    frameguard: { action: 'deny' },

    // Deshabilita la detección automática de contenido en navegadores (protección contra MIMETYPE sniffing)
    noSniff: true,

    // Evita que el navegador cargue la página si detecta ataques XSS (útil solo en navegadores antiguos)
    xssFilter: true,

    // Oculta información del servidor eliminando el encabezado X-Powered-By
    hidePoweredBy: true,

    // Implementa una política estricta de Referer para evitar que otras páginas accedan a información de navegación
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Protección avanzada contra inyección de scripts externos
    contentSecurityPolicy: {
		  directives: {
        defaultSrc: ['\'self\''], // Solo permite contenido de la propia web
        scriptSrc: ['\'self\'', '\'unsafe-inline\''], // Solo scripts internos (ajusta según necesidad)
        styleSrc: ['\'self\'', '\'unsafe-inline\''], // Permite estilos internos y en línea (útil para frameworks CSS)
        imgSrc: ['\'self\'', 'data:'], // Permite imágenes internas y datos embebidos (base64)
        connectSrc: ['\'self\'', 'https://api.mi-dominio.com'], // Permite conexiones a APIs específicas
        fontSrc: ['\'self\'', 'https://fonts.googleapis.com'], // Permite fuentes externas de confianza
        objectSrc: ['\'none\''], // Bloquea contenido embebido de Flash y otros plugins inseguros
        upgradeInsecureRequests: [] // Convierte HTTP a HTTPS automáticamente
		  }
    },

    // Evita que el navegador envíe la página en caché en respuestas sensibles
    cacheControl: true,

    // Configura la política de permisos para APIs del navegador
    permissionsPolicy: {
		  features: {
        geolocation: ['self'], // Solo permitir geolocalización desde la misma web
        microphone: ['none'], // Bloquear acceso al micrófono
        camera: ['none'], // Bloquear acceso a la cámara
        fullscreen: ['self'] // Permitir pantalla completa solo desde la misma web
		  }
    },

    // Habilita HTTP Strict Transport Security (HSTS) para forzar HTTPS
    hsts: {
		  maxAge: 63072000, // 2 años
		  includeSubDomains: true, // Se aplica a subdominios
		  preload: true // Requiere inscripción en el preload list de Chrome
    }
	  }))

  // Configurar CORS para permitir solicitudes desde cualquier origen
  app.use(cors())

  app.use(express.urlencoded({ extended: true }))
  app.use(express.json({ limit: '5Mb' }))

  // LOG
  // create a rotating write stream
  const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: LOGS_DIR
  })

  // setup the logger
  app.use(logger('combined', { stream: accessLogStream, skip: (req, res) => res.statusCode >= 400 }))

  const errorLogStream = rfs.createStream('error.log', {
    interval: '1d', // rotate daily
    path: LOGS_DIR
  })

  app.use(logger('combined', { stream: errorLogStream, skip: (req, res) => res.statusCode < 400 }))

  // logs / procesos / backup
  app.use('/logs',     express.static(LOGS_DIR),    serveIndex(LOGS_DIR,  { icons: true }))
  app.use('/procesos', express.static(PROC_DIR),    serveIndex(PROC_DIR,  { icons: true }))
  app.use('/backup',   express.static(BACKUP_DIR),  serveIndex(BACKUP_DIR,{ icons: true }))

  // legal (PDFs de políticas) — sin listado
  app.use('/legal', express.static(LEGAL_DIR, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      }
    }
  }))

  // Fallback explícito por si express.static no matchea
  app.get('/legal/:file', (req, res, next) => {
    const safe = path.basename(req.params.file)   // evita path traversal
    const filePath = path.join(LEGAL_DIR, safe)
    if (!fs.existsSync(filePath)) return next(new Error('No existe la ruta'))
    res.sendFile(filePath, err => err && next(err))
  })

  // Swagger
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs))

  // ..................................................
  // RUTAS
  // rutas sin autenticar

  require('../api/metadata/metadata.rutas')(app)
  require('../api/analisis/analisis.rutas')(app)
  require('../api/usuarios/usuarios.rutas')(app)
  require('../api/i18n/i18n.rutas')(app);

  require('../api/error.rutas')(app)

  app.use(logErrors)
  // app.use(clientErrorHandler)
  app.use(errorHandler)

  // CRON.cronSchedule()
  return app
}

function logErrors (err, req, res, next) {
  if (err.ok) {
    if (!err.statusCode) err.statusCode = 590
    if (!err.coleccion) err.coleccion = 'middleware'
    if (!err.accion) err.accion = ''

    const error = {
      causa: err.cause,
      url: req.url,
      idciber: req.idciber,
      role: req.role,
      coleccion: err.coleccion,
      accion: err.accion,
      ok: err.ok,
      statusCode: err.statusCode,
      mensaje: err.mensaje || err.message
      // stack: err.stack
    }
    grabarLog(error)

    // res.status(201).json({ok:false, mensaje:err.message, datos:{error:error, err:err}});
    delete error.ok
    error.stack = err.stack
    res.status(err.statusCode).json({
      ok: false,
      mensaje: err.mensaje || err.message,
      datos: [],
      error
    })
  } else {
    next(err)
  }
}

// function clientErrorHandler (err, req, res, next) {
// 	next(err)
// }

function errorHandler (err, req, res, next) {
  const error = {
    causa: err.cause,
    url: req.url,
    idciber: req.idciber,
    role: req.role,
    mensaje: err.message,
    stack: err.stack
  }
  // res.status(201).json({ok:false, mensaje:err.message, datos:{error:error, err:err}});

  res.status(400).json({
    ok: false,
    mensaje: err.message,
    datos: [],
    error
  })
}
