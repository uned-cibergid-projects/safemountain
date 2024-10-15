/** 
 * @class modciber/pruebas
 * @description funciones
 * 
 * @see pruebas_api
 * */
'use strict'
const TABLA = 'apks';
const CRUD = require('../servicios/crud');

module.exports = {
    leerId:leerId,
    leerCampo:leerCampo,
    nuevo:nuevo,
    modificar:modificar,
    borrar:borrar
}

/**
 * @function leerId
 * @description Lee un pruebas
 * @memberOf modciber/pruebas
 * @param {String} id
 * @param {String} buscar búsqueda {nombre:'Ana'}
 * @param {Object} campos lista campos. Ejem.  {fn:1, photo:1} 
 * @see modciber/crud.leerId
 * @return {RespuestaFuncionTipo} res - Respuesta de tipo {@link modciber.RespuestaFuncionTipo}. Data es de tipo  {@link modciber/usuario_model}
 * 
* */
function leerId(id){
    let promesa = (resolve,reject) =>{
        CRUD.leerId(id, TABLA)
            .then(result => resolve(result))
            .catch(err => reject(err)
        )
    }
    return new Promise(promesa)
}

/**
 * @function leerVarios
 * @description Lista pruebas
 * @memberOf modciber/pruebas
 * @param {Object} orden orden. Ejem. {'n.given':'asc'}
 * @param {Object} campos lista campos. Ejem.  {fn:1, photo:1} 
 * @param {Object} buscar búsqueda {nombre:'Ana'}
 * @see modciber/crud.leerVarios
 * @return {RespuestaFuncionTipo} res - Respuesta de tipo {@link modciber.RespuestaFuncionTipo}. Data es de tipo  {@link modciber/usuario_model}
 * 
* */
function leerCampo(opciones){
    let promesa = (resolve,reject) =>{
        CRUD.leerCampo(opciones, TABLA)
            .then(result => resolve(result))
            .catch(err => reject(err)
        )
    }
    return new Promise(promesa)
}

/**
 * @function nuevo
 * @description Crea un nuevo pruebas
 * @memberOf modciber/pruebas
 * @param {Object} reg Datos del registro a crear
 * @return {RespuestaFuncionTipo} res - Respuesta de tipo {@link modciber.RespuestaFuncionTipo}. Data es de tipo  {@link modciber/usuario_model}
 * 
* */
function nuevo(reg, idGcono){
    let promesa = (resolve,reject) =>{
        CRUD.nuevo(reg, TABLA, idGcono)
            .then(result => resolve(result)  )
            .catch(err => reject(err)
        )   
    }
    return new Promise(promesa)
}

/**
 * @function modificar
 * @description Modifica un registro de pruebas
 * @memberOf modciber/pruebas
 * @param {String} id
 * @param {Object} reg Datos del registro a crear
 * @return {RespuestaFuncionTipo} res - Respuesta de tipo {@link modciber.RespuestaFuncionTipo}. Data es de tipo  {@link modciber/usuario_model}
 * 
* */
function modificar(id, reg, idGcono){
    let promesa = (resolve,reject) =>{
        CRUD.modificarId(id, reg, TABLA, idGcono)
            .then(result => resolve(result)  )
            .catch(err => reject(err)
        )   
    }
    return new Promise(promesa)
}

/**
 * @function borrar
 * @description Borra una asignatura
 * @memberOf modciber/pruebas
 * @param {String} id
 * @return {RespuestaFuncionTipo} res - Respuesta de tipo {@link modciber.RespuestaFuncionTipo}. Data es de tipo  {@link modciber/usuario_model}
 * 
* */
function borrar(id, idGcono){
    let promesa = (resolve,reject) =>{
        CRUD.borrar(id, TABLA, idGcono)
            .then(result => resolve(result)  )
            .catch(err => reject(err)
        )    
    }
    return new Promise(promesa)
}

