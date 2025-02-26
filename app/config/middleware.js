'use strict'
const CONFIG = require('../config')[process.env.NODE_ENV ||'desarrollo'];
const debug = require('debug')(`${CONFIG.APP}:middleware`);

const serveIndex = require('serve-index');
const logger = require('morgan');
const rfs = require('rotating-file-stream');
const helmet = require('helmet');

const express = require('express');

// const CRON = require('./cron');

const {grabarLog} = require('../servicios/crud');
const swaggerUI = require('swagger-ui-express');
const specs = require('./swagger');

module.exports = (app) => {
	var app = express();

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
			defaultSrc: ["'self'"], // Solo permite contenido de la propia web
			scriptSrc: ["'self'", "'unsafe-inline'"], // Solo scripts internos (ajusta según necesidad)
			styleSrc: ["'self'", "'unsafe-inline'"], // Permite estilos internos y en línea (útil para frameworks CSS)
			imgSrc: ["'self'", "data:"], // Permite imágenes internas y datos embebidos (base64)
			connectSrc: ["'self'", "https://api.mi-dominio.com"], // Permite conexiones a APIs específicas
			fontSrc: ["'self'", "https://fonts.googleapis.com"], // Permite fuentes externas de confianza
			objectSrc: ["'none'"], // Bloquea contenido embebido de Flash y otros plugins inseguros
			upgradeInsecureRequests: [], // Convierte HTTP a HTTPS automáticamente
		  }
		},
	  
		// Evita que el navegador envíe la página en caché en respuestas sensibles
		cacheControl: true,
	  
		// Configura la política de permisos para APIs del navegador
		permissionsPolicy: {
		  features: {
			geolocation: ["self"], // Solo permitir geolocalización desde la misma web
			microphone: ["none"], // Bloquear acceso al micrófono
			camera: ["none"], // Bloquear acceso a la cámara
			fullscreen: ["self"], // Permitir pantalla completa solo desde la misma web
		  }
		},
	  
		// Habilita HTTP Strict Transport Security (HSTS) para forzar HTTPS
		hsts: {
		  maxAge: 63072000, // 2 años
		  includeSubDomains: true, // Se aplica a subdominios
		  preload: true // Requiere inscripción en el preload list de Chrome
		}
	  }));

	app.use(express.urlencoded({ extended: true }))
	app.use(express.json({limit:'5Mb'}))

	// LOG
	// create a rotating write stream
	const accessLogStream = rfs.createStream('access.log', {
		interval: '1d', // rotate daily
		path: `${process.cwd()}/public/logs`		
	});
	
	// setup the logger
	app.use(logger('combined', { stream: accessLogStream, skip: (req, res) => res.statusCode >= 400 }));
	
	const errorLogStream = rfs.createStream('error.log', {
		interval: '1d', // rotate daily
		path: `${process.cwd()}/public/logs`		
	});
	
	app.use(logger('combined', { stream: errorLogStream, skip: (req, res) => res.statusCode < 400 }));

	// logs
	app.use("/logs", express.static(`${process.cwd()}/public/logs`), serveIndex('app/public/logs', { 'icons': true }));

	// procesos
	app.use("/procesos", express.static(`${process.cwd()}/public/procesos`), serveIndex('app/public/procesos', { 'icons': true }));

	// backup
	app.use("/backup", express.static(`${process.cwd()}/public/backup`), serveIndex('app/public/backup', { 'icons': true }));

	// Swagger
	app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));


	// .................................................. 
	// RUTAS
	// rutas sin autenticar

	require('../api/metadata/metadata.rutas')(app)
	require('../api/analisis/analisis.rutas')(app)
	
	require('../api/error.rutas')(app)
	
	app.use(logErrors)
	// app.use(clientErrorHandler)
	app.use(errorHandler)

	// CRON.cronSchedule()
	return app
}

function logErrors(err, req, res, next) {

	if(err.ok){
		if(!err.statusCode) err.statusCode = 590;
		if(!err.coleccion) err.coleccion = 'middleware';
		if(!err.accion) err.accion = "";

		let error = {
			causa: err.cause,
			url: req.url,
			idciber: req.idciber,
			role: req.role,
			coleccion: err.coleccion,
			accion: err.accion,
			ok: err.ok,
			statusCode: err.statusCode,
			mensaje: err.mensaje || err.message,
			// stack: err.stack
		}
		grabarLog(error);

		// res.status(201).json({ok:false, mensaje:err.message, datos:{error:error, err:err}});
		delete error.ok;
		error.stack = err.stack;
		res.status(err.statusCode).json({
			ok:false, 
			mensaje: err.mensaje || err.message,
			datos:[],
			error: error	
		});
	}else{
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
		mensaje:err.message,
		stack: err.stack
	}
	// res.status(201).json({ok:false, mensaje:err.message, datos:{error:error, err:err}});
	
	res.status(201).json({
		ok:false, 
		mensaje:err.message, 
		datos:[],
		error: error	
	});
}
