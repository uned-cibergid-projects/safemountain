/**
 * @module scripts/instalar/privado
 * 
 * @description Módulo para verificar e instalar la herramienta Privado CLI.
 */

'use strict';

const { execSync } = require('child_process');
const { descargarArchivo } = require('../../app/utils/fileUtils'); // Importa tu función genérica


/**
 * @description Verifica si la herramienta Privado CLI está instalada en el sistema.
 *
 * @function comprobarPrivadoCLI
 * @returns {boolean} Devuelve true si Privado CLI está instalado y false en caso contrario.
 * @throws {Error} Si ocurre un error inesperado al intentar ejecutar el comando.
 */
function comprobarPrivadoCLI() {
    try {
        execSync('privado version', { stdio: 'ignore' });
        console.log('Privado CLI ya está instalado.');
        return true;
    } catch (error) {
        console.log('Privado CLI no está instalado. Procediendo a la instalación...');
        return false;
    }
}

/**
 * @description Función principal que verifica e instala Privado CLI si es necesario.
 *
 * @function main
 */
function main() {
    if (!comprobarPrivadoCLI()) {
        descargarArchivo(comando);
    }
}

main();

