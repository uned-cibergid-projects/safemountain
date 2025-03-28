/**
 * @module scripts/instalar/jadx
 *
 * @description Módulo para descargar, descomprimir e instalar el descompilador JADX.
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

/**
 * @description Verifica si Java 11 o una versión superior está instalado en el sistema.
 *
 * @function verificarJava
 * @returns {void} Detiene el proceso si no se encuentra Java 11 o superior instalado.
 * @throws {Error} Si Java no está instalado o no es accesible, o si la versión detectada no es compatible.
 *
 */
function verificarJava () {
  try {
    const versionOutput = execSync('java -version 2>&1', { encoding: 'utf8' })
    console.log(`Version de Java:\n${versionOutput}`)

    const match = versionOutput.match(/version\s+"(\d+)\.(\d+)\.(\d+)/)

    if (match) {
      const major = parseInt(match[1], 10) // Versión principal
      const minor = parseInt(match[2], 10) // Versión menor
      const patch = parseInt(match[3], 10) // Versión de parche

      console.log(`Java detectado: ${major}.${minor}.${patch}`)

      if (major >= 11) {
        console.log('Java 11+ está correctamente instalado.')
        return
      }
    }

    console.error('Se requiere Java 11 o superior.')
    process.exit(1)
  } catch (error) {
    console.error('Java no está instalado o no es accesible.')
    process.exit(1)
  }
}

/**
 * @description Descarga y descomprime JADX, asegurando una instalación limpia en el directorio especificado.
 *
 * @function instalarJADX
 * @throws {Error} Si ocurre un error durante la descarga, descompresión o instalación.
 * @returns {void} No retorna ningún valor. Configura el entorno con JADX instalado.
 */
function instalarJADX () {
  const jadxUrl = 'https://github.com/skylot/jadx/releases/download/v1.5.1/jadx-1.5.1.zip'
  const destinoZip = path.join(__dirname, '../../tools/jadx.zip')
  const destinoDirectorio = path.join(__dirname, '../../tools/jadx')

  if (fs.existsSync(destinoDirectorio)) {
    console.log('JADX ya está instalado.')
    return
  }

  try {
    console.log('Descargando JADX:')
    execSync(`curl -L -o ${destinoZip} ${jadxUrl}`, { stdio: 'inherit' })

    if (!fs.existsSync(destinoDirectorio)) {
      fs.mkdirSync(destinoDirectorio, { recursive: true })
    }

    console.log('Descomprimiendo JADX:')
    execSync(`unzip -o ${destinoZip} -d ${destinoDirectorio}`, { stdio: 'inherit' })

    fs.unlinkSync(destinoZip)

    console.log('JADX instalado correctamente en:', destinoDirectorio)
  } catch (error) {
    console.error(`Error durante la instalación de JADX: ${error.message}`)
    if (fs.existsSync(destinoZip)) {
      fs.unlinkSync(destinoZip)
    }
    if (fs.existsSync(destinoDirectorio)) {
      fs.rmdirSync(destinoDirectorio, { recursive: true })
    }

    process.exit(1)
  }
}

/**
 * @description Verifica y prepara el entorno para usar JADX.
 */
function prepararEntornoJADX () {
  verificarJava()
  instalarJADX()
}

prepararEntornoJADX()
