'use strict'
const CONFIG = require('../config')[process.env.NODE_ENV ||'desarrollo'];
const debug = require('debug')(`${CONFIG.APP}:middleware`);

const serveIndex = require('serve-index');
const logger = require('morgan');
const rfs = require('rotating-file-stream');

const express = require('express');

// const CRON = require('./cron');

const {grabarLog} = require('../servicios/crud');

module.exports = (app) => {
	var app = express();

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


	// .................................................. 
	// RUTAS
	// rutas sin autenticar

	require('../api/ciber/ciber.rutas')(app)
	
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
