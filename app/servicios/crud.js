/** 
 * @module servicios/crud
 * 
 * @description Funciones CRUD para interactuar con diferentes modelos y colecciones en la base de datos.
 */

'use strict'
const debug = require('debug')('gcono:crud');
debug('CRUD Versión: 3.0.1')

const {colecciones} = require('./modelos/metadata.model')

module.exports = {
    contar: contar, 
    leerId:leerId,
    leerCampo:leerCampo,
    nuevo:nuevo,
    modificarId:modificarId,
    modificarUno: modificarUno,
    borrar:borrar,
    borrarVarios:borrarVarios,
    modificarVarios:modificarVarios,
    modificarArray:modificarArray,
    borrarArray:borrarArray,
    nuevoArray:nuevoArray,
    insertarVarios:insertarVarios,
    grabarLog:grabarLog
}

/**
 * @description Cuenta documentos en la colección especificada basándose en criterios de búsqueda.
 * 
 * @function contar
 * @param {Object} [filtro={}] - Criterios de búsqueda para contar documentos.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @returns {Promise<Object>} Una promesa que resuelve con el número de documentos contados y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function contar(filtro={}, coleccion){
    let promesa = (resolve,reject) =>{

        const MODELO = colecciones[coleccion].modelo;

        MODELO.countDocuments(filtro)
            .then(cuenta => {
                resolve({ok:true, mensaje:coleccion, datos:cuenta})
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = 'contar';
                reject(err)
            });

    }
    return new Promise(promesa)
}

/**
 * @description Recupera un documento por su ID único.
 * 
 * @function leerId
 * @param {string} id - El identificador único del documento a recuperar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la búsqueda.
 * @returns {Promise<Object>} Una promesa que resuelve con el documento recuperado y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación o el documento no se encuentra, lanza un error con detalles del contexto.
 */
function leerId(id, coleccion){
    let promesa = (resolve,reject) =>{
        const MODELO = colecciones[coleccion].modelo;
        MODELO.findById(id).lean()
            .then(registro =>{
                if (!registro){
                    resolve({ok:false, mensaje:'Colección: '+coleccion+'. No existe el registro id='+id,datos:''})
                }else{
                    resolve({ok:true, mensaje:coleccion, datos:registro})
                }
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = 'leerId';
                reject(err)
            });
    }
    return new Promise(promesa)
}

/**
 * @description Recupera documentos basándose en criterios específicos.
 * 
 * @function leerCampo
 * @param {Object} opciones - Opciones para la consulta, incluyendo criterios de búsqueda, ordenamiento, campos seleccionados, límite y paginación.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda como pares clave-valor.
 * @param {Object} [opciones.orden] - Especificación del orden de los resultados.
 * @param {Object} [opciones.campos] - Campos a seleccionar en los documentos.
 * @param {number} [opciones.limite] - Número máximo de documentos a recuperar.
 * @param {number} [opciones.skip] - Número de documentos a omitir para paginación.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la consulta.
 * @returns {Promise<Object>} Una promesa que resuelve con los documentos recuperados y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function leerCampo(opciones, coleccion){
    let promesa = (resolve,reject) =>{
        let filtro = {};
        let campos = {};
        let orden = {};
        let limite = 0;
        let skip = 0;

        if(opciones.hasOwnProperty('filtro') && opciones.filtro != null && opciones.filtro !='') filtro = opciones.filtro;
        if(opciones.hasOwnProperty('orden') && opciones.orden != null && opciones.orden !='') orden = opciones.orden;
        if(opciones.hasOwnProperty('campos') && opciones.campos != null && opciones.campos !='') campos = opciones.campos;
        if(opciones.hasOwnProperty('limite') && opciones.limite != null && opciones.limite !='') limite = opciones.limite;
        if(opciones.hasOwnProperty('skip') && opciones.skip != null && opciones.skip !='') skip = opciones.skip;
        const MODELO = colecciones[coleccion].modelo;
        if(limite== 1){
            MODELO.findOne(filtro).lean()
                .sort(orden)
                .select(campos)
                .then(registro => {
                    if (!registro) {
                        resolve({
                            ok:false, 
                            mensaje:`${coleccion} Lectura: No encontrado búsqueda= ${JSON.stringify(opciones.filtro).replace(/\"/g,"")}`, 
                            datos:[]
                        });
                    }else{
                        resolve({ok:true, mensaje:coleccion, datos:registro})
                    }
                })
                .catch(err => {
                    err.ok= true;
                    err.coleccion = coleccion;
                    err.accion = 'leerCampo';
                    reject(err)
                });
        }else{
            MODELO.find(filtro).lean()
                .sort(orden)
                .limit(limite)
                .skip(skip)
                .select(campos)
                .then(registros => {
                    if (registros.length<1) {
                        resolve({
                            ok:false, 
                            mensaje:`${coleccion} Lectura: No encontrado búsqueda= ${JSON.stringify(opciones.filtro).replace(/\"/g,"")}`,
                            datos:[]
                        })
                    }else {
                        resolve({ok:true, mensaje:coleccion, contar:registros.length, datos:registros})
                    }
                })
                .catch(err => {
                    err.ok= true;
                    err.coleccion = coleccion;
                    err.accion = 'leerCampo';
                    reject(err)
                });
        }  
    }
    return new Promise(promesa)
}

/**
 * @description Inserta un nuevo documento en la colección especificada.
 * 
 * @function nuevo
 * @param {Object} reg - Datos del nuevo documento a insertar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [opciones] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [opciones.tipo="log"] - Tipo de operación.
 * @param {string} [opciones.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [opciones.accion="nuevo"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el documento insertado y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function nuevo(reg, coleccion, {tipo="log", mensaje="", accion="nuevo"}= {}){    
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            const nuevoRegistro = await MODELO.create(reg)

            if (!nuevoRegistro){
                const err = new Error('Error no se pudo crear el nuevo Registro');
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = accion;
                err.mensaje = `No se pudo crear el nuevo Registro`;
                reject(err)
            }else{
                resolve({
                    ok:true, 
                    // mensaje: coleccion + '. Nuevo nuevoRegistro creado. id= '+ nuevoreg._id,
                    mensaje: coleccion + '. Nuevo Registro creado',
                    datos: nuevoRegistro.toObject()
                });
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: accion,
                        ok: 201,
                        id_: nuevoRegistro._id.toString()
                    }; 
                    grabarLog(log)
                };
            } 
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

/**
 * @description Modifica un documento en la colección especificada por su ID.
 * 
 * @function modificarId
 * @param {string} id - Identificador único del documento a modificar.
 * @param {Object} reg - Nuevos datos para actualizar el documento.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="modificar"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el documento modificado y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function modificarId(id, reg, coleccion, {tipo="log", mensaje="", accion="modificar"}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            delete reg._id;
            delete reg.f_modificacion;

            const registro = await MODELO.findOneAndUpdate({_id:id}, reg, {new:true})
            
            if (!registro){
                const err = new Error('Error no existe el registro id= '+id);
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = accion;
                err.mensaje = `No existe el registro id= ${id}`;
                reject(err)
            }else {
                // debug(registro.toObject())
                const salida = registro.toObject()
                resolve({ok:true, mensaje:coleccion+'. Modificado registro id='+id, datos:registro.toObject()});

                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: accion ,
                        ok: 200,
                        id_: id.toString(),
                        mensaje: ''
                    }; 
                    grabarLog(log);
                }
            }            
 
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

/**
 * @description Modifica un documento en la colección especificada basado en criterios de búsqueda.
 * 
 * @function modificarUno
 * @param {Object} filtro - Criterios para identificar el documento a modificar.
 * @param {Object} reg - Nuevos datos para actualizar el documento.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="modificar"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el documento modificado y el estado de la operación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function modificarUno(filtro, reg, coleccion, {tipo="log", mensaje="", accion="modificar"}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            delete reg._id;
            delete reg.f_modificacion;
            
            const registro = await MODELO.findOneAndUpdate(filtro, reg, {new:true}).lean()
            
            if (!registro){
                reject({ok:false, message: coleccion + '. Modificar: No se encuentran registros en la búsqueda'+ JSON.stringify(filtro).replace(/\"/g,""), coleccion: coleccion, accion:'modificar'})
            }else{
                
                resolve({ok:true, mensaje:`${coleccion}. Modificado en búsqueda: ${JSON.stringify(filtro).replace(/\"/g,"")}`, datos:registro})
                
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'modificar',
                        ok: 200,
                        id_: registro._id.toString(),
                        mensaje: JSON.stringify(filtro).replace(/\"/g,""),
                        tipo: tipo
                    }; 
                    grabarLog(log)
                }
            }
     
        }catch(err){
            err.coleccion = coleccion;
            err.accion = 'modificar';
            reject(err)
        };   
    }
    return new Promise(promesa)
}

/**
 * @description Elimina un documento de la colección especificada por su ID.
 * 
 * @function borrar
 * @param {string} id - Identificador único del documento a eliminar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="borrar"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de eliminación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function borrar(id, coleccion, {tipo="log", mensaje="", accion="borrar"}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            const resultado = await MODELO.deleteOne({_id:id})
            
            if(resultado.deletedCount < 1){
                resolve({ok:false, mensaje: `Borrado ${coleccion}. No encontrado id: ${id}`, datos:resultado})
            }else {
                resolve({ok:true, mensaje: `Borrado ${coleccion}. id: ${id}`, datos:resultado});

                if(coleccion != 'Log') {
                // no creo log de las operaciones realizadas sobre la colección Log. 
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'borrar',
                        ok: 200,
                        id_: id.toString(),
                        mensaje: '',
                        tipo: tipo
                    };
                    grabarLog(log);
                }
            }            
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        };  
    }
    return new Promise(promesa)
}

/**
 * @description Elimina múltiples documentos de la colección especificada basándose en criterios de búsqueda.
 * 
 * @function borrarVarios
 * @param {Object} filtro - Criterios para identificar los documentos a eliminar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="borrarVarios"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de eliminación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function borrarVarios(filtro, coleccion, {tipo="log", mensaje="", accion="borrarVarios"}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            const resultado = await MODELO.deleteMany(filtro)

            if(resultado.deletedCount < 1){
                resolve({ok:false, mensaje: `Borrar ${coleccion} => No encontrado en búsqueda: ${JSON.stringify(filtro).replace(/\"/g,"")}`, datos:resultado})
            }else {
                resolve({ok:true, mensaje: `Borrados ${resultado.deletedCount} ${coleccion} de búsqueda: ${JSON.stringify(filtro).replace(/\"/g,"")}`, datos:resultado})

                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'borrar',
                        ok: 200,
                        id_:'0',                    
                        mensaje: `Borrados: ${resultado.deletedCount} en búsqueda: ${JSON.stringify(filtro).replace(/\"/g,"")}`,
                        tipo: tipo
                    };
                    grabarLog(log);
                }
            }            
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        };              
    }
    return new Promise(promesa)
}

/**
 * @description Modifica múltiples documentos en la colección especificada basándose en criterios de búsqueda.
 * 
 * @function modificarVarios
 * @param {Object} buscar - Criterios para identificar los documentos a modificar.
 * @param {Object} actualizacion - Datos que se usarán para actualizar los documentos encontrados.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="modificarVarios"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de modificación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function modificarVarios(filtro, actualizacion, coleccion, {tipo="log", mensaje="", accion="modificarVarios"}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            const resultado = await MODELO.updateMany(filtro, actualizacion)
                if (resultado.n==0) {
                    resolve({ok:false, mensaje: coleccion +'. Modificar: No se encuentran registros en la búsqueda= '+ JSON.stringify(filtro).replace(/\"/g,""), datos:''});
                } else resolve({ok:true, mensaje:coleccion+'. Modificados (' + resultado.n + ' registros)', datos:resultado});
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'modificarVarios',
                        ok: 201,
                        id_:"0",
                        mensaje: `Modificados: ${resultado.length} en búsqueda: ${JSON.stringify(filtro).replace(/\"/g,"")}`,
                        tipo: tipo
                    }; 
                    grabarLog(log);
                }
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

/**
 * @description Inserta múltiples documentos en la colección especificada.
 * 
 * @function insertarVarios
 * @param {Array<Object>} registros - Array de documentos a insertar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="insertarVarios"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de inserción.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function insertarVarios(registros, coleccion, {tipo="log", mensaje="", accion="insertarVarios"}= {}){
    let promesa = async (resolve, reject)=>{
        try{
            const MODELO = colecciones[coleccion].modelo;
            const docs = await MODELO.insertMany(registros)
            resolve({
                ok:true,
                mensaje: coleccion+'. Insertar: '+registros.length+' registros',
                datos: docs.map(reg=> (reg.toObject()))
            })
                
            if(coleccion != 'Log') {
                let log ={
                    idgcono: idGcono,
                    coleccion: coleccion,
                    accion: 'insertarVarios',
                    ok: 201,
                    id_:'0',
                    mensaje: `Insertar varios: ${registros.length}`,
                    tipo: tipo
                }; 
                grabarLog(log);
            }
        }catch(err){
            err.coleccion = coleccion;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa);
};

/**
 * @description Modifica múltiples documentos en la colección basándose en un array de registros.
 * 
 * @function modificarArray
 * @param {Array<Object>} array - Array de registros a modificar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="modificarArray"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de modificación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function modificarArray(array, coleccion, {tipo="log", mensaje="", accion="modificar"}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
            modificarId(item._id, item, coleccion, idGcono)
        })
        Promise.all(promiseArray.map(f => f()))
            .then(modificado => {
                resolve({
                    ok:true,
                    mensaje: 'modificado',
                    datos: ''
                })
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'modificarArray',
                        ok: 201,
                        id_:'0',
                        mensaje: `Modificados array: ${modificado.length}`,
                        tipo: tipo
                    }; 
                    grabarLog(log);
                }
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = 'modificarArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

/**
 * @description Elimina múltiples documentos en la colección basándose en un array de IDs.
 * 
 * @function borrarArray
 * @param {Array<Object>} array - Array de documentos a eliminar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="borrarArray"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de eliminación.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function borrarArray(array, coleccion, {tipo="log", mensaje="", accion="borrar"}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
        borrar(item._id, coleccion, idGcono)
    })
        Promise.all(promiseArray.map(f => f()))
            .then(borrados => {
                resolve({
                    ok:true,
                    mensaje: 'borrado',
                    datos: ''
                })
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'borrarArray',
                        ok: 201,
                        id_:'0',
                        mensaje: `Borrados array: ${borrados.length}`,
                        tipo: tipo
                    }; 
                    grabarLog(log);
                }
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = 'borrarArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

/**
 * @description Inserta múltiples documentos en la colección basándose en un array de registros.
 * 
 * @function nuevoArray
 * @param {Array<Object>} array - Array de documentos a insertar.
 * @param {string} coleccion - Nombre de la colección en la que se realizará la operación.
 * @param {Object} [options] - Opciones adicionales como tipo, mensaje y acción.
 * @param {string} [options.tipo="log"] - Tipo de operación.
 * @param {string} [options.mensaje=""] - Mensaje adicional para el log.
 * @param {string} [options.accion="nuevoArray"] - Acción realizada.
 * @returns {Promise<Object>} Una promesa que resuelve con el resultado de la operación de inserción.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
function nuevoArray(array, coleccion, {tipo='log', mensaje='', accion="nuevo"}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
        nuevo(item, coleccion, idGcono)
    })
        Promise.all(promiseArray.map(f => f()))
            .then(nuevos => {
                resolve({
                    ok:true,
                    mensaje: 'nuevo',
                    datos: ''
                })
                if(coleccion != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: coleccion,
                        accion: 'nuevoArray',
                        ok: 201,
                        id_:'0',
                        mensaje: `Nuevos array: ${nuevos.length}`,
                        tipo: tipo
                    }; 
                    grabarLog(log);
                }
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = coleccion;
                err.accion = 'nuevoArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

/**
 * @description Registra un log de operación en la colección correspondiente.
 * 
 * @function grabarLog
 * @param {Object} log - Objeto con los detalles del log.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el log es registrado exitosamente.
 * @throws {Error} Si ocurre un error durante la operación, lanza un error con detalles del contexto.
 */
async function grabarLog(log){
    try{
        const MODELO = colecciones['Log'].modelo;
        const nuevoReg = await MODELO.create(log)
        return
    }catch(err){
        err.coleccion = 'Log';
        err.accion = 'nuevo';
        return err
    }; 
}