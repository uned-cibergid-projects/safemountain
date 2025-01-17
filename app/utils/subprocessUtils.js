/**
 * @module utils/subprocessUtils
 *
 * @description Utilidades para facilitar la ejecución de procesos por comando.
 */

'use strict';
const { spawn } = require('child_process');

/**
 * Ejecuta un comando usando spawn, esperando a que termine realmente.
 * Acepta options para, por ejemplo, establecer cwd.
 *
 * @param {string} command - El comando a ejecutar.
 * @param {string[]} args - Argumentos para el comando.
 * @param {object} [options={}] - Opciones adicionales para spawn (ej. cwd).
 * @returns {Promise<void>} - Resuelve cuando el comando termina.
 */
async function ejecutarSpawn(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        ...options,
      });
  
      child.on('error', reject);
  
      child.on('close', (code) => {
        if (code !== 0) {
          console.warn(`Advertencia: Proceso terminó con código de salida ${code}. Continuando...`);
        }
        resolve();
      });
    });
  }

  module.exports = {
    ejecutarSpawn,
};
