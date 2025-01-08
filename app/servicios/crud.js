'use strict'
const debug = require('debug')('gcono:crud');
debug('CRUD Versión: 3.0.1')

const {tablas} = require('./modelos/appCollector.model')

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

function contar(buscar={}, tabla){
    let promesa = (resolve,reject) =>{

        const MODELO = tablas[tabla].modelo;

        MODELO.countDocuments(buscar)
            .then(cuenta => {
                resolve({ok:true, mensaje:tabla, datos:cuenta})
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = tabla;
                err.accion = 'contar';
                reject(err)
            });

    }
    return new Promise(promesa)
}

function leerId(id, tabla){
    let promesa = (resolve,reject) =>{
        const MODELO = tablas[tabla].modelo;
        MODELO.findById(id).lean()
            .then(registro =>{
                //if (!registro) resolve({ok:false, mensaje:'Colección: '+tabla+'. No existe el registro id='+id,datos:''})
                if (!registro){
                    resolve({ok:false, mensaje:'Colección: '+tabla+'. No existe el registro id='+id,datos:''})
                }else{
                    resolve({ok:true, mensaje:tabla, datos:registro})
                }
            })
            .catch(err => {
                err.ok= true;
                err.coleccion = tabla;
                err.accion = 'leerId';
                reject(err)
            });
    }
    return new Promise(promesa)
}

function leerCampo(opciones, tabla){
    let promesa = (resolve,reject) =>{
        let buscar = {};
        let campos = {};
        let orden = {};
        let limite = 0;
        let skip = 0;

        if(opciones.hasOwnProperty('buscar') && opciones.buscar != null && opciones.buscar !='') buscar = opciones.buscar;
        if(opciones.hasOwnProperty('orden') && opciones.orden != null && opciones.orden !='') orden = opciones.orden;
        if(opciones.hasOwnProperty('campos') && opciones.campos != null && opciones.campos !='') campos = opciones.campos;
        if(opciones.hasOwnProperty('limite') && opciones.limite != null && opciones.limite !='') limite = opciones.limite;
        if(opciones.hasOwnProperty('skip') && opciones.skip != null && opciones.skip !='') skip = opciones.skip;
        const MODELO = tablas[tabla].modelo;
        if(limite== 1){
            MODELO.findOne(buscar).lean()
                .sort(orden)
                .select(campos)
                .then(registro => {
                    if (!registro) {
                        resolve({
                            ok:false, 
                            mensaje:`${tabla} Lectura: No encontrado búsqueda= ${JSON.stringify(opciones.buscar).replace(/\"/g,"")}`, 
                            datos:[]
                        });
                    }else{
                        resolve({ok:true, mensaje:tabla, datos:registro})
                    }
                })
                .catch(err => {
                    err.ok= true;
                    err.coleccion = tabla;
                    err.accion = 'leerCampo';
                    reject(err)
                });
        }else{
            MODELO.find(buscar).lean()
                .sort(orden)
                .limit(limite)
                .skip(skip)
                .select(campos)
                .then(registros => {
                    if (registros.length<1) {
                        resolve({
                            ok:false, 
                            mensaje:`${tabla} Lectura: No encontrado búsqueda= ${JSON.stringify(opciones.buscar).replace(/\"/g,"")}`,
                            datos:[]
                        })
                    }else {
                        resolve({ok:true, mensaje:tabla, contar:registros.length, datos:registros})
                    }
                })
                .catch(err => {
                    err.ok= true;
                    err.coleccion = tabla;
                    err.accion = 'leerCampo';
                    reject(err)
                });
        }  
    }
    return new Promise(promesa)
}

function nuevo(reg, tabla, idGcono=0,  {tipo='log', mensaje='', accion='nuevo'}= {}){    
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            const nuevoRegistro = await MODELO.create(reg)

            if (!nuevoRegistro){
                const err = new Error('Error no se pudo crear el nuevo Registro');
                err.ok= true;
                err.coleccion = tabla;
                err.accion = accion;
                err.mensaje = `No se pudo crear el nuevo Registro`;
                reject(err)
            }else{
                resolve({
                    ok:true, 
                    // mensaje: tabla + '. Nuevo nuevoRegistro creado. id= '+ nuevoreg._id,
                    mensaje: tabla + '. Nuevo Registro creado',
                    datos: nuevoRegistro.toObject()
                });
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
                        accion: accion,
                        ok: 201,
                        id_: nuevoRegistro._id.toString()
                    }; 
                    grabarLog(log)
                };
            } 
        }catch(err){
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

function modificarId(id, reg, tabla, idGcono=0,  {tipo='log', mensaje='', accion='modificar'}= {}){
// function modificarId(id, reg, tabla, idGcono=0,  {tipo='log', mensaje='', accion='modificar', notimestamp=false}={}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            delete reg._id;
            // borro f_modificacion para que actualize la fecha de modificación, pues no lo hace automáticamente, aunque está así configurado en el esquema
            delete reg.f_modificacion;

            const registro = await MODELO.findOneAndUpdate({_id:id}, reg, {new:true})
            
            if (!registro){
                const err = new Error('Error no existe el registro id= '+id);
                err.ok= true;
                err.coleccion = tabla;
                err.accion = accion;
                err.mensaje = `No existe el registro id= ${id}`;
                reject(err)
            }else {
                // debug(registro.toObject())
                const salida = registro.toObject()
                resolve({ok:true, mensaje:tabla+'. Modificado registro id='+id, datos:registro.toObject()});

                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
                        accion: accion ,
                        ok: 200,
                        id_: id.toString(),
                        mensaje: ''
                    }; 
                    grabarLog(log);
                }
            }            
 
        }catch(err){
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

function modificarUno(buscar, reg, tabla, idGcono=0,  {tipo='log', mensaje='', accion='modificar'}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            delete reg._id;
            // borro f_modificacion para que actualize la fecha de modificación, pues no lo hace automáticamente, aunque está así configurado en el esquema
            delete reg.f_modificacion;
            
            const registro = await MODELO.findOneAndUpdate(buscar, reg, {new:true}).lean()
            
            if (!registro){
                reject({ok:false, message: tabla + '. Modificar: No se encuentran registros en la búsqueda'+ JSON.stringify(buscar).replace(/\"/g,""), coleccion: tabla, accion:'modificar'})
            }else{
                
                // resolve({ok:true, mensaje:tabla+'. Modificado en búsqueda= '+buscar, datos:registro.toObject()})
                resolve({ok:true, mensaje:`${tabla}. Modificado en búsqueda: ${JSON.stringify(buscar).replace(/\"/g,"")}`, datos:registro})
                
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
                        accion: 'modificar',
                        ok: 200,
                        id_: registro._id.toString(),
                        mensaje: JSON.stringify(buscar).replace(/\"/g,""),
                        tipo: tipo
                    }; 
                    grabarLog(log)
                }
            }
     
        }catch(err){
            err.coleccion = tabla;
            err.accion = 'modificar';
            reject(err)
        };   
    }
    return new Promise(promesa)
}

function borrar(id, tabla, idGcono=0,  {tipo='log', mensaje='', accion='borrar'}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            const resultado = await MODELO.deleteOne({_id:id})
            
            if(resultado.deletedCount < 1){
                resolve({ok:false, mensaje: `Borrado ${tabla}. No encontrado id: ${id}`, datos:resultado})
            }else {
                resolve({ok:true, mensaje: `Borrado ${tabla}. id: ${id}`, datos:resultado});

                if(tabla != 'Log') {
                // no creo log de las operaciones realizadas sobre la colección Log. 
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
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
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        };  
    }
    return new Promise(promesa)
}

function borrarVarios(buscar, tabla, idGcono=0, {tipo='log', mensaje='', accion='borrarVarios'}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            const resultado = await MODELO.deleteMany(buscar)

            if(resultado.deletedCount < 1){
                resolve({ok:false, mensaje: `Borrar ${tabla} => No encontrado en búsqueda: ${JSON.stringify(buscar).replace(/\"/g,"")}`, datos:resultado})
            }else {
                resolve({ok:true, mensaje: `Borrados ${resultado.deletedCount} ${tabla} de búsqueda: ${JSON.stringify(buscar).replace(/\"/g,"")}`, datos:resultado})

                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
                        accion: 'borrar',
                        ok: 200,
                        id_:'0',                    
                        mensaje: `Borrados: ${resultado.deletedCount} en búsqueda: ${JSON.stringify(buscar).replace(/\"/g,"")}`,
                        tipo: tipo
                    };
                    grabarLog(log);
                }
            }            
        }catch(err){
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        };              
    }
    return new Promise(promesa)
}

function modificarVarios(buscar, modificar, tabla, idGcono=0, {tipo='log', mensaje='', accion='modificarVarios'}= {}){
    let promesa = async (resolve,reject) =>{
        try{
            const MODELO = tablas[tabla].modelo;
            const resultado = await MODELO.updateMany(buscar, modificar)
                if (resultado.n==0) {
                    resolve({ok:false, mensaje: tabla +'. Modificar: No se encuentran registros en la búsqueda= '+ JSON.stringify(buscar).replace(/\"/g,""), datos:''});
                } else resolve({ok:true, mensaje:tabla+'. Modificados (' + resultado.n + ' registros)', datos:resultado});
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
                        accion: 'modificarVarios',
                        ok: 201,
                        id_:"0",
                        mensaje: `Modificados: ${resultado.length} en búsqueda: ${JSON.stringify(buscar).replace(/\"/g,"")}`,
                        tipo: tipo
                    }; 
                    grabarLog(log);
                }
        }catch(err){
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa)
}

function insertarVarios(registros, tabla, idGcono=0,  {tipo='log', mensaje='', accion='insertarVarios'}= {}){
    let promesa = async (resolve, reject)=>{
        try{
            const MODELO = tablas[tabla].modelo;
            // Inserta varios registros, leídos de un array
            const docs = await MODELO.insertMany(registros)
            resolve({
                ok:true,
                mensaje: tabla+'. Insertar: '+registros.length+' registros',
                datos: docs.map(reg=> (reg.toObject()))
            })
                
            if(tabla != 'Log') {
                let log ={
                    idgcono: idGcono,
                    coleccion: tabla,
                    accion: 'insertarVarios',
                    ok: 201,
                    id_:'0',
                    mensaje: `Insertar varios: ${registros.length}`,
                    tipo: tipo
                }; 
                grabarLog(log);
            }
        }catch(err){
            err.coleccion = tabla;
            err.accion = accion;
            reject(err)
        }; 
    }
    return new Promise(promesa);
};

function modificarArray(array, tabla, idGcono=0,  {tipo='log', mensaje='', accion='modificar'}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
            modificarId(item._id, item, tabla, idGcono)
        })
        Promise.all(promiseArray.map(f => f()))
            .then(modificado => {
                resolve({
                    ok:true,
                    mensaje: 'modificado',
                    datos: ''
                })
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
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
                err.coleccion = tabla;
                err.accion = 'modificarArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

function borrarArray(array, tabla, idGcono=0,  {tipo='log', mensaje='', accion='borrar'}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
        borrar(item._id, tabla, idGcono)
    })
        Promise.all(promiseArray.map(f => f()))
            .then(borrados => {
                resolve({
                    ok:true,
                    mensaje: 'borrado',
                    datos: ''
                })
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
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
                err.coleccion = tabla;
                err.accion = 'borrarArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

function nuevoArray(array, tabla, idGcono=0,  {tipo='log', mensaje='', accion='nuevo'}= {}){
    let promesa = (resolve,reject) =>{
        let promiseArray = array.map(item => () =>{
        nuevo(item, tabla, idGcono)
    })
        Promise.all(promiseArray.map(f => f()))
            .then(nuevos => {
                resolve({
                    ok:true,
                    mensaje: 'nuevo',
                    datos: ''
                })
                if(tabla != 'Log') {
                    let log ={
                        idgcono: idGcono,
                        coleccion: tabla,
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
                err.coleccion = tabla;
                err.accion = 'nuevoArray';
                reject(err)
            })
    }
    return new Promise(promesa)
}

async function grabarLog(log){
    try{
        const MODELO = tablas['Log'].modelo;
        const nuevoReg = await MODELO.create(log)
        return
    }catch(err){
        err.coleccion = 'Log';
        err.accion = 'nuevo';
        return err
    }; 
}