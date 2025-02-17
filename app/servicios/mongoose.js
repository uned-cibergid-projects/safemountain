'use strict'
const debug = require('debug')('metadata:cargarBD');
const mongoose = require('mongoose');

// Obtenemos la configuración correspondiente al entorno actual
const config = require('../config')[process.env.NODE_ENV || 'desarrollo'];

// Construimos la URL de conexión para la base 'metadata'
let db_addr_metadata;
if (!config.MONGO_METADATA.user && !config.MONGO_METADATA.pass) {
  db_addr_metadata = 'mongodb://' + config.MONGO_METADATA.host + ':' + config.MONGO_METADATA.port + '/' + config.MONGO_METADATA.db;
  debug('db_addr_metadata= ', db_addr_metadata);
} else {
  db_addr_metadata = 'mongodb://' + config.MONGO_METADATA.user + ':' + config.MONGO_METADATA.pass + '@'
    + config.MONGO_METADATA.host + ':' + config.MONGO_METADATA.port + '/' + config.MONGO_METADATA.db;
}

// Construimos la URL de conexión para la base 'analisis'
let db_addr_analisis;
if (!config.MONGO_ANALISIS.user && !config.MONGO_ANALISIS.pass) {
  db_addr_analisis = 'mongodb://' + config.MONGO_ANALISIS.host + ':' + config.MONGO_ANALISIS.port + '/' + config.MONGO_ANALISIS.db;
  debug('db_addr_analisis= ', db_addr_analisis);
} else {
  db_addr_analisis = 'mongodb://' + config.MONGO_ANALISIS.user + ':' + config.MONGO_ANALISIS.pass + '@'
    + config.MONGO_ANALISIS.host + ':' + config.MONGO_ANALISIS.port + '/' + config.MONGO_ANALISIS.db;
}

////////////////////////////////////////////////////////////////
// ALMACENAREMOS NUESTRAS CONEXIONES (opcional para reutilizar) 
////////////////////////////////////////////////////////////////
let metadataConnection = null;
let analisisConnection = null;

///////////////////////////////////////////////////////////////
// Función principal para “cargar” (inicializar) nuestras BDs
///////////////////////////////////////////////////////////////
let cargarBd = function() {

  // mongoose 4.13
  // Promesas nativas ES6
  mongoose.Promise = global.Promise;

  // cambios versión 5.22
  // useCreateIndex, useNewUrlParser, useFindAndModify
  // cambio 6.0.0
  // mongoose.set('strictQuery', true);

  // versión 7
  mongoose.set('strictQuery', false);

  // 1) Creamos la conexión para METADATA con createConnection
  metadataConnection = mongoose.createConnection(db_addr_metadata, { authSource: "admin" });
  
  metadataConnection.on('connected', () => {
    console.log('[METADATA] Connected Successfully');
    require('./modelos/metadata.model');
  });

  metadataConnection.on('error', (err) => {
    console.error('[METADATA] Mongoose connection error:', err);
  });

  // 2) Creamos la conexión para ANALISIS
  analisisConnection = mongoose.createConnection(db_addr_analisis, { authSource: "admin" });

  analisisConnection.on('connected', () => {
    console.log('[ANALISIS] Connected Successfully');
    require('./modelos/analisis.model'); 
  });

  analisisConnection.on('error', (err) => {
    console.error('[ANALISIS] Mongoose connection error:', err);
  });

};

///////////////////////////////////////////////////////////////
// Exportamos la función principal y, opcionalmente, las dos
// conexiones, si quieres usarlas directamente en otros lados.
///////////////////////////////////////////////////////////////
module.exports = {
  cargarBd: cargarBd,
  metadataConnection: () => metadataConnection,
  analisisConnection: () => analisisConnection
}
