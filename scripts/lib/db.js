// scripts/lib/db.js
'use strict';
const path = require('path');
const mongoose = require('mongoose');

// Reutiliza el módulo oficial del proyecto (lee app/config.* para escoger BDs)
const { metadataConnection, analisisConnection } = require(path.join(__dirname, '../../app/servicios/mongoose'));

// Modelos oficiales del proyecto
const Analisis = require(path.join(__dirname, '../../app/servicios/modelos/analisis.model.js')).estatico;
const { apks: Apks, tpls: Tpls, versions: Versions } = require(path.join(__dirname, '../../app/servicios/modelos/metadata.model.js'));

// Permite acceder también a colecciones “auxiliares” si existen (p.ej., matches de política)
function getAuxCollection(name) {
  try {
    return metadataConnection().model(name);
  } catch (e) {
    // Si no existe el modelo, crea uno “laissez-faire” para lectura
    const s = new mongoose.Schema({}, { strict: false, collection: name });
    return metadataConnection().model(name, s, name);
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
