/** 
 * @class modbasico/sistema
 * @description Funciones básicas sin dependencias que cargar.
 * @see modbasico
 * */

'use strict'
var {exec} = require("child_process");

module.exports = {
    runComandos:runComandos
}

/**
 * @function runComando
 * @description Ejecuta un comando exec de child_process.
 * @memberOf modbasico/sistema
 * @param {String} comando
 * @return {Object} {comando:commandDescription, salida:finsalida}
 * 
* */

function runComando(comando) {
    let promesa = (resolve,reject) =>{        
        exec(comando, (execError, stdout, stderr) => {
            let comandoDescripcion = JSON.stringify(comando);
            if (execError && execError.code === 127) {
                reject({notfound: true})
            }
            else if (execError) {
                let runError = new Error("Command failed: " + comandoDescripcion);
                if (stderr) runError.stderr = stderr.trim();
                if (execError) runError.execError = execError;

                reject({error: runError})
            }
            else {
                const salidas= stdout.toString().split('\n');
                let finsalida='';
                for(const salida of salidas){
                    if(salida!='') finsalida=salida
                }
                resolve({comando:comandoDescripcion, salida:finsalida})
            }
        });
    }
    return new Promise(promesa)
}

/**
 * @function runComandos
 * @description Promise.all de runComando(comando)
 * @memberOf modbasico/sistema
 * @return {Object} {data}
 * 
* */
function runComandos(comandos) {
    let promesa = (resolve,reject) => {
        var promesaComandos = [];
        for(const registro in comandos){ 
            promesaComandos.push(runComando(comandos[registro]));
        }
        Promise.all(promesaComandos)    
            .then(data => resolve(data))
            .catch(err => reject(err))
    }
    return new Promise(promesa)
}