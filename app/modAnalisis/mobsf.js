/** 
 * @module modAnalisis/mobsf
 * 
 * @description Funciones para analizar APKs con MobSF.
 * @see mobsf_api
 */

'use strict';
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const path = require('path');
const fs = require('fs');
const { subirArchivoTemporal } = require('../utils/fileUtils');
const APKS = require('../modMetadata/apks');
const CRUD = require('../servicios/crud');
const COLECCION = require('../servicios/modelos/analisis.model').estatico
const CONFIG = require('../config.js')[process.env.NODE_ENV || 'development'];


/**
 * @description Procesa y analiza un archivo APK utilizando MobSF. 
 * Sube primero el APK a carpeta temporal, lo analiza y, una vez finalizado el proceso,
 * elimina siempre el archivo temporal para evitar basura.
 * 
 * @param {Object} req - Objeto de solicitud HTTP, que contiene el archivo APK a analizar.
 * @param {Object} res - Objeto de respuesta HTTP utilizado para la subida del archivo.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto que contiene los resultados del análisis.
 * @throws {Error} Si ocurre un error durante la ejecución del análisis, lectura del archivo de resultados o almacenamiento del APK.
 */

async function analizar(req, res) {
  
  let filePath;

  try {
    const uploadResult = await subirArchivoTemporal(req, res);
    filePath = uploadResult.datos.filePath;

    const mobSFDir = path.join(__dirname, '../../tools/mobsf');
    const resultDir = path.join(mobSFDir, 'results');

    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    const pythonEnv = path.join(mobSFDir, 'mobsf_env', 'bin', 'python3');

    const cmd = `"${pythonEnv}" main.py --source="${filePath}" --result="${resultDir}"`;

    const { stdout, stderr } = await execAsync(cmd, { cwd: mobSFDir });

    if (stderr) {
      console.error('stderr:', stderr);
    }

    const baseName = path.basename(filePath);
    const jsonFile = path.join(resultDir, `${baseName}.json`);

    let analisisData;
    try {
      const fileContent = await fs.promises.readFile(jsonFile, 'utf8');
      analisisData = JSON.parse(fileContent);
      analisisData.name = path.parse(analisisData.file_name).name;
    } catch (readError) {
      throw new Error(`No se pudo realizar un análisis de forma correcta: ${readError}`);
    }

    const BASE_DIRECTORY = CONFIG.BASE_DIRECTORY;
    const categoryDir = path.join(BASE_DIRECTORY, analisisData.playstore_details.genre.toLowerCase());
    const finalDir = path.join(categoryDir, analisisData.package_name);
    const finalPath = path.join(finalDir, analisisData.file_name);

    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    if (fs.existsSync(finalPath)) {
      console.log(`La APK ya estaba guardada previamente en ${finalPath}.`);
    } else {
      fs.copyFileSync(filePath, finalPath);
      fs.unlinkSync(filePath);
      console.log(`La APK se ha guardado con éxito en ${finalPath}.`);
    }

    
    const { ok: okApk, datos: datosApk } = await APKS.leerCampo(
      {
      filtro: { name: analisisData.name },
      limite: 1
      }
    );

    if (!okApk || !datosApk) {
      await APKS.guardarMetadata(analisisData);
    }
    
    const { ok: okCrud, datos: datosCrud } = await CRUD.leerCampo(
      {
        filtro: { package_name: analisisData.package_name },
        limite: 1
      },
      COLECCION
    );

    if (!okCrud || !datosCrud) {
      const { ok: okNuevo, datos: docInsertado } = await CRUD.nuevo(analisisData, COLECCION);
      if (!okNuevo) {
        console.log('No se pudo insertar el documento en la colección Apks.');
      } else {
        console.log('Documento insertado correctamente en la colección Apks:');
      }
    } else {
      console.log('Ya existe un documento con el mismo package_name en la BD. No se inserta.');
    }

    return {
      ok: true,
      mensaje: "Archivo analizado correctamente",
      datos: {
        category: analisisData.playstore_details.genre.toLowerCase(),
        package: analisisData.package_name,
        name: analisisData.file_name,
      }
    };
  } catch (error) {
    throw new Error(`Error al analizar el archivo con MobSF: ${error.message}`);

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Archivo temporal ${filePath} eliminado.`);
      } catch (err) {
        console.error(`Error eliminando archivo temporal: ${err.message}`);
      }
    }
  }
}

module.exports = {
  analizar
};
