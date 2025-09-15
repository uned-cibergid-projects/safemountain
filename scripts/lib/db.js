// scripts/lib/db.js
'use strict';
const path = require('path');
const mongoose = require('mongoose');

// 1) Carga el módulo de mongoose del proyecto y **arranca conexiones**
const mg = require(path.join(__dirname, '../../app/servicios/mongoose'));

// OBLIGATORIO: inicializa (crea los objetos de conexión) antes de requerir modelos
// - esto suele hacer `mongoose.createConnection(...)` y deja disponibles
//   metadataConnection / analisisConnection aunque aún no estén "connected".
mg.cargarBd();

// 2) Accesores a las conexiones (funciones que devuelven los objetos)
const { metadataConnection, analisisConnection } = mg;

// 3) Ahora sí, importa los modelos que usan esas conexiones
const Analisis = require(path.join(__dirname, '../../app/servicios/modelos/analisis.model.js')).estatico;
const { apks: Apks, tpls: Tpls, versions: Versions } = require(path.join(__dirname, '../../app/servicios/modelos/metadata.model.js'));

// 4) Utilidad para colecciones auxiliares (p.ej., emparejamientos política↔permiso)
function getAuxCollection(name, useMeta = true) {
  const conn = useMeta ? metadataConnection() : analisisConnection();
  try {
    return conn.model(name);
  } catch (e) {
    const s = new mongoose.Schema({}, { strict: false, collection: name });
    return conn.model(name, s, name);
  }
}

module.exports = {
  Analisis,
  Apks,
  Tpls,
  Versions,
  metadataConnection,
  analisisConnection,
  getAuxCollection,
};
