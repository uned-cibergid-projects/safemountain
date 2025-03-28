'use strict'

const { exec } = require('child_process')

module.exports = {
  runComandos
}

function runComando (comando) {
  const promesa = (resolve, reject) => {
    exec(comando, (execError, stdout, stderr) => {
      const comandoDescripcion = JSON.stringify(comando)
      if (execError && execError.code === 127) {
        reject({ notfound: true })
      } else if (execError) {
        const runError = new Error(`Command failed: ${comandoDescripcion}`)
        if (stderr) runError.stderr = stderr.trim()
        if (execError) runError.execError = execError

        reject({ error: runError })
      } else {
        const salidas = stdout.toString().split('\n')
        let finsalida = ''
        for (const salida of salidas) {
          if (salida !== '') finsalida = salida
        }
        resolve({ comando: comandoDescripcion, salida: finsalida })
      }
    })
  }
  return new Promise(promesa)
}

function runComandos (comandos) {
  const promesa = (resolve, reject) => {
    const promesaComandos = []
    for (const registro in comandos) {
      promesaComandos.push(runComando(comandos[registro]))
    }
    Promise.all(promesaComandos)
      .then((data) => resolve(data))
      .catch((err) => reject(err))
  }
  return new Promise(promesa)
}
