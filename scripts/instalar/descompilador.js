/**
 * @module scripts/instalar/descompilador
 * 
 * @description Módulo para verificar e instalar la herramienta JADX y su JDK necesario.
 */

'use strict';

const { execSync } = require('child_process');

const JADX_URL = 'https://github.com/skylot/jadx/releases/latest/download/jadx-1.4.8.zip';
const JDK_URL = 'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.8.1%2B1/OpenJDK17U-jre_x64_linux_hotspot_17.0.8.1_1.tar.gz';

/**
 * @description Verifica si JADX está instalado verificando la existencia del ejecutable.
 * 
 * @function comprobarJADX
 * @returns {boolean} Devuelve `true` si JADX ya está instalado, `false` en caso contrario.
 */
function comprobarJADX() {
    if (fs.existsSync(JADX_PATH)) {
        console.log('JADX ya está instalado.');
        return true;
    }
    console.log('JADX no está instalado.');
    return false;
}

/**
 * @description Verifica si el JDK necesario para JADX está instalado.
 * 
 * @function comprobarJDK
 * @returns {boolean} Devuelve `true` si el JDK ya está instalado, `false` en caso contrario.
 */
function comprobarJDK() {
    if (fs.existsSync(JDK_PATH)) {
        console.log('JDK ya está instalado.');
        return true;
    }
    console.log('JDK no está instalado.');
    return false;
}

/**
 * @description Descarga un archivo desde una URL utilizando curl.
 * 
 * @function descargarArchivo
 * @param {string} url - URL del archivo a descargar.
 * @returns {Promise<void>} Promesa que se resuelve cuando la descarga se completa.
 */
async function descargarArchivo(url) {
    try {
        console.log(`Descargando: ${url}`);
        execSync(`curl -L -o ${destino} ${url}`, { stdio: 'inherit' }); // -L sigue redirecciones
        console.log(`Descarga completada: ${destino}`);
    } catch (error) {
        throw new Error(`Error durante la descarga con curl: ${error.message}`);
    }
}

/**
 * @description Instala JADX descargándolo y extrayéndolo.
 * 
 * @function instalarJADX
 */
async function instalarJADX() {
    try {
        const jadxZipPath = path.join(TOOLS_DIR, 'jadx.zip');
        console.log('Descargando JADX...');
        await descargarArchivo(JADX_URL, jadxZipPath);

        console.log('Extrayendo JADX...');
        execSync(`unzip -o ${jadxZipPath} -d ${TOOLS_DIR}`);
        fs.unlinkSync(jadxZipPath);
        console.log('JADX instalado correctamente.');
    } catch (error) {
        console.error('Error instalando JADX:', error.message);
        process.exit(1);
    }
}

/**
 * @description Instala el JDK descargándolo y extrayéndolo.
 * 
 * @function instalarJDK
 */
async function instalarJDK() {
    try {
        const jdkTarPath = path.join(TOOLS_DIR, 'jdk.tar.gz');
        console.log('Descargando JDK...');
        await descargarArchivo(JDK_URL, jdkTarPath);

        console.log('Extrayendo JDK...');
        execSync(`tar -xzf ${jdkTarPath} -C ${TOOLS_DIR}`, { stdio: 'inherit' });
        fs.unlinkSync(jdkTarPath);
        console.log('JDK instalado correctamente.');
    } catch (error) {
        console.error('Error instalando JDK:', error.message);
        process.exit(1);
    }
}

/**
 * @description Función principal que verifica e instala JADX y JDK si es necesario.
 * 
 * @function main
 */
async function main() {
    if (!fs.existsSync(TOOLS_DIR)) {
        fs.mkdirSync(TOOLS_DIR, { recursive: true });
    }

    if (!comprobarJDK()) {
        await instalarJDK();
    }

    if (!comprobarJADX()) {
        await instalarJADX();
    }
}

main().catch((error) => console.error('Error en la instalación:', error.message));
