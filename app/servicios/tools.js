'use strict'

const debug = require('debug')('metadata:tools')

const fsp = require('fs').promises
const fs = require('fs')
const fse = require('fs-extra')
const Excel = require('exceljs')
const { v4: uuidv4, validate: uuidValidate } = require('uuid')

module.exports = {
  promesaTransparente,
  insertarLogFichero,
  ficheroDisco,
  exportarExcel,
  copiarArrayCarpetas,
  copiarArrayFicheros,
  existeFichero,
  existeDirectorio,
  copiarFichero,
  copiarContenidoDirectorio,
  borrarFichero,
  comprobarCampos,
  comprobarCarpetaYCrear,
  crearCarpeta: crearCarpeta.apply,
  moverFichero,
  crearUuid,
  validarUuid
}

function promesaTransparente (valor) {
  const promesa = (resolve, reject) => {
    resolve(valor)
  }
  return new Promise(promesa)
}

function insertarLogFichero (ruta, contenido) {
  const hoy = new Date()
  contenido.fecha = hoy
  const rutaLogs = `${ruta}/lgs/${hoy.getDate()}_${hoy.getMonth() + 1}_${hoy.getFullYear()}.log`
  fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
    if (err) { debug('error', err) }
  })
}

function copiarCarpeta (origen, destino) {
  const promesa = (resolve, reject) => {
    fse.copy(origen, destino)
      .then(() => {
        resolve({ ok: true, mensaje: `Carpeta ${origen} copiada a ${destino}`, datos: { origen } })
      })
      .catch((err) => {
        console.error(err)
        resolve(err)
      })
  }
  return new Promise(promesa)
}

function copiarArrayCarpetas (rutaLog, carpetas) {
  const promesa = (resolve, reject) => {
    if (carpetas.length > 0) {
      const promiseCopiar = carpetas.map((objeto) => () => copiarCarpeta(objeto.origen, objeto.destino))
      Promise.all(promiseCopiar.map((f) => f()))
        .then((resCopiar) => {
          let contarOk = 0
          let contarFalse = 0
          for (const copiar of resCopiar) {
            (copiar.ok) ? contarOk++ : contarFalse++
          }
          const contenido = {
            accion: 'Copiar carpetas',
            resultado: {
              ok: true, mensaje: 'copiarArrayCarpetas', contar: resCopiar.length, contarOk, contarFalse, datos: resCopiar
            }
          }
          ficheroDisco(rutaLog, 'copiar', contenido, 'mensual')
          resolve({
            ok: true, mensaje: 'copiarArrayCarpetas', contar: resCopiar.length, contarOk, contarFalse, datos: resCopiar
          })
        })
        .catch((err) => { resolve(err) })
    } else {
      const contenido = {
        accion: 'copiarCapertas',
        tratados: carpetas.length,
        resultadoOK: carpetas.length,
        detalle: 'no hay carpetas que procesar'
      }
      ficheroDisco(rutaLog, 'copiar', contenido, 'mensual')
      resolve({ ok: true, mensaje: contenido, datos: '' })
    }
  }
  return new Promise(promesa)
}

function copiarArrayFicheros (rutaLog, ficheros) {
  const promesa = (resolve, reject) => {
    if (ficheros.length > 0) {
      const promiseCopiar = ficheros.map((fichero) => () => fs.copyFileSync(fichero.origen, fichero.destino))
      Promise.all(promiseCopiar.map((f) => f()))
        .then((resCopiar) => {
          let contarOk = 0
          let contarFalse = 0
          for (const copiar of resCopiar) {
            (copiar.ok) ? contarOk++ : contarFalse++
          }
          const contenido = {
            accion: 'Copiar ficheros',

            resultado: {
              ok: true, mensaje: 'copiarArrayFicheros', contar: resCopiar.length, contarOk, contarFalse, datos: resCopiar
            }
          }

          insertarLogFichero(rutaLog, contenido)
          resolve({
            ok: true, mensaje: 'copiarArrayCarpetas', contar: resCopiar.length, contarOk, contarFalse, datos: resCopiar
          })
        })
        .catch((err) => { resolve(err) })
    } else {
      const contenido = {
        accion: 'copiarFicheros',
        tratados: ficheros.length,
        resultadoOK: ficheros.length,
        detalle: 'no hay ficheros que procesar'
      }
      insertarLogFichero(rutaLog, contenido)
      resolve({ ok: true, mensaje: contenido, datos: '' })
    }
  }
  return new Promise(promesa)
}

function ficheroDisco (ruta, preFichero, contenido, proceso) {
  const hoy = new Date(`${new Date()}UTC`)

  contenido.fecha = hoy

  let rutaLogs = ''
  switch (proceso) {
    case 'crear': {
      rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth() + 1}${hoy.getDate()}\-${hoy.getHours()}${hoy.getMinutes() + hoy.getSeconds()}-${preFichero}.log`

      fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
        if (err) { debug('error', err) }
      })
      break
    }
    case 'machacar': {
      rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth() + 1}${hoy.getDate()}-${preFichero}.log`

      fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
        if (err) { debug('error', err) }
      })
      break
    }
    case 'eterno': {
      rutaLogs = `${ruta}/${preFichero}.log`

      existeFichero(rutaLogs)
        .then((resultado) => {
          if (resultado) {
            fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          } else {
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          }
          return resultado
        })
        .catch((error) => debug(error))
      break
    }

    case 'diario': {
      rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth() + 1}${hoy.getDate()}-${preFichero}.log`

      existeFichero(rutaLogs)
        .then((resultado) => {
          if (resultado) {
            fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          } else {
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          }
          return resultado
        })
        .catch((error) => debug(error))
      break
    }
    case 'mensual': {
      rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth() + 1}-${preFichero}.log`

      existeFichero(rutaLogs)
        .then((resultado) => {
          if (resultado) {
            fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          } else {
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          }
          return resultado
        })
        .catch((error) => debug(error))
      break
    }
    case 'anual': {
      rutaLogs = `${ruta}/${hoy.getFullYear()}-${preFichero}.log`

      existeFichero(rutaLogs)
        .then((resultado) => {
          if (resultado) {
            fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          } else {
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), (err) => {
              if (err) { debug('error', err) }
            })
          }
          return resultado
        })
        .catch((error) => debug(error))
      break
    }
  }
}

function exportarExcel (ruta, preFichero, contenido, proceso) {
  const hoy = new Date()
  contenido.fecha = hoy

  const workbook = new Excel.Workbook()

  const worksheet = workbook.addWorksheet('Datos')
  const propiedades = Object.getOwnPropertyNames(contenido[0])

  const columnas = []
  for (const propiedad of propiedades) {
    if (typeof contenido[0][propiedad] === 'object') {
      const subPropiedades = Object.getOwnPropertyNames(contenido[0][propiedad])
      for (const subPropiedad of subPropiedades) {
        columnas.push({
          header: `${propiedad}.${subPropiedad}`,
          key: `${propiedad}.${subPropiedad}`
        })
      }
    } else {
      columnas.push({
        header: `${propiedades[i]}`,
        key: propiedades[i]
      })
    }
  }

  worksheet.columns = columnas

  worksheet.columns.forEach((column) => {
    column.width = column.header.length < 12 ? 12 : column.header.length
  })

  contenido.forEach((fila, index) => {
    const datos = []
    for (const propiedad of propiedades) {
      if (typeof contenido[0][propiedad] === 'object') {
        const subPropiedades = Object.getOwnPropertyNames(contenido[0][propiedad])
        for (const subPropiedad of subPropiedades) {
          datos.push(fila[propiedad][subPropiedad])
        }
      } else {
        datos.push(fila[propiedad])
      }
    }
    worksheet.addRow(datos)
  })

  let rutaExcel = ''
  switch (proceso) {
    case 'fijo': {
      rutaExcel = `${ruta}/${preFichero}.xlsx`

      workbook.xlsx.writeFile(rutaExcel)
      break
    }
    case 'machacar': {
      rutaExcel = `${ruta}/${hoy.getDate()}_${hoy.getMonth() + 1}_${hoy.getFullYear()}_${preFichero}.xlsx`

      workbook.xlsx.writeFile(rutaExcel)
      break
    }
    case 'añadir': {
      rutaExcel = `${ruta}/${hoy.getDate()}_${hoy.getMonth() + 1}_${hoy.getFullYear()}_${preFichero}.xlsx`

      workbook.xlsx.writeFile(rutaExcel)
      break
    }
    case 'crear': {
      rutaExcel = `${ruta}/${hoy.getDate()}_${hoy.getMonth() + 1}_${hoy.getFullYear()}_${hoy.getHours()}${hoy.getMinutes()}${hoy.getSeconds()}_${preFichero}.xlsx`

      workbook.xlsx.writeFile(rutaExcel)
      break
    }
  }
}

function existeFichero (fichero) {
  return new Promise((resolve, reject) => {
    fs.stat(fichero, (err, stats) => {
      if (err) {
        return resolve(false)
      } return resolve(stats.isFile())
    })
  })
}

function existeDirectorio (directorio) {
  return new Promise((resolve, reject) => {
    fs.stat(directorio, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') reject('ENOENT')
        else reject(err)
      } else resolve(stats.isDirectory())
    })
  })
}

function copiarFichero (origen, destino) {
  return new Promise((resolve, reject) => {
    fs.copyFile(origen, destino, (err) => {
      if (err) {
        if (err.code === 'ENOENT') reject(`Fichero ${origen} no existe`)
        reject(err)
      }
      resolve({ ok: true, mensaje: `Fichero ${origen} copiado a ${destino}`, datos: { origen } })
    })
  })
}

function moverFichero (origen, destino) {
  return new Promise((resolve, reject) => {
    fs.copyFile(origen, destino, (err) => {
      if (err) {
        if (err.code === 'ENOENT') resolve({ ok: false, mensaje: `Fichero ${origen} no existe`, datos: origen })
        resolve({ ok: false, mensaje: `Fichero ${origen} no existe`, datos: origen })
      } else {
        fs.unlink(origen, (err) => {
          if (err && err.code === 'ENOENT') resolve({ ok: false, mensaje: `Fichero ${origen} no existe`, datos: origen })
          else if (err) reject(err)
          else resolve({ ok: true, mensaje: `Fichero ${origen} movido a ${destino}`, datos: origen })
        })
      }
    })
  })
}

function copiarContenidoDirectorio (origen, destino) {
  if (!origen) resolve()
  const filtro = []
  return new Promise((resolve, reject) => {
    fs.readdir(origen, (err, files) => {
      files.forEach((file) => {
        copiarFichero(`${origen}/${file}`, `${destino}/${file}`)
        filtro.push(file)
      })
      resolve(filtro)
    })
  })
}

function borrarFichero (fichero) {
  return new Promise((resolve, reject) => {
    fs.unlink(fichero, (err) => {
      if (err && err.code === 'ENOENT') resolve({ ok: false, mensaje: `${fichero} no se puede borrar porque no existe`, datos: { origen: fichero } })
      else if (err) reject(err)
      else resolve({ ok: true, mensaje: 'Borrado en disco', datos: { origen: fichero } })
    })
  })
}

function comprobarCampos (objeto, campo) {
  const promesa = (resolve, reject) => {
    const campos = campo.split('.')
    let resultado = 'no'
    if (objeto[campos[0]]) {
      if (campos.length < 2) resultado = campos[0]
      else if (objeto[campos[0]][campos[1]]) {
        if (campos.length < 3) resultado = campos[1]
        else if (objeto[campos[0]][campos[1]][campos[2]]) {
          if (campos.length < 4) resultado = campos[2]
          else if (objeto[campos[0]][campos[1]][campos[2]][campos[3]]) {
            if (campos.length < 5) resultado = campos[3]
            else debug('comprobarCampos --> demasiados campos')
          }
        }
      }
    }
    if (resultado === 'no') resolve({ status: 200, mensaje: 'no', data: 'no existe' })
    else resolve({ status: 200, mensaje: 'ok', data: resultado })
  }
  return new Promise(promesa)
}

function comprobarCarpetaYCrear (objeto) {
  const promesa = (resolve, reject) => {
    debug(`objeto ${JSON.stringify(objeto)}`)
    const nCarpetas = Object.keys(objeto.CARPETAS).length

    for (let i = 0; i < nCarpetas; i++) {
      const carpeta = Object.values(objeto.CARPETAS)[i]
      existeDirectorio(carpeta)
        .then((result) => {
          resolve(result)
        })
        .catch((err) => {
          crearCarpeta(carpeta)
            .then((result) => {
              debug(result)
              resolve(result)
            })
            .catch((err) => reject(err))
        })
    }
  }
  return new Promise(promesa)
}

function crearCarpeta (carpeta) {
  const promesa = (resolve, reject) => {
    fs.mkdir(carpeta, (err) => {
      if (err) {
        reject(err)
      }
      resolve(`Carpeta creada: ${carpeta}`)
    })
  }
  return new Promise(promesa)
}

function crearUuid () {
  const promesa = (resolve, reject) => {
    resolve(uuidv4())
  }
  return new Promise(promesa)
}

function validarUuid (uuid) {
  const promesa = (resolve, reject) => {
    resolve(uuidValidate(uuid))
  }
  return new Promise(promesa)
}
