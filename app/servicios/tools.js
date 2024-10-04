'use strict'
 // Versión 1.0.5
 const debug = require('debug')('ciber:tools');
 
 const fsp = require('fs').promises;
 const fs = require('fs');
 const fse = require('fs-extra');
 const Excel = require('exceljs');
 const {v4:uuidv4, validate:uuidValidate} = require('uuid');
 module.exports = {
     promesaTransparente:promesaTransparente,
     insertarLogFichero:insertarLogFichero,
     ficheroDisco:ficheroDisco,
     exportarExcel:exportarExcel,
     copiarArrayCarpetas:copiarArrayCarpetas,
     copiarArrayFicheros:copiarArrayFicheros,
     existeFichero:existeFichero,
     existeDirectorio:existeDirectorio,
     copiarFichero: copiarFichero,
     copiarContenidoDirectorio:copiarContenidoDirectorio,
     borrarFichero:borrarFichero,
     comprobarCampos:comprobarCampos,
     comprobarCarpetaYCrear:comprobarCarpetaYCrear,
     crearCarpeta:crearCarpeta.apply,
     moverFichero:moverFichero,
     crearUuid:crearUuid,
     validarUuid:validarUuid
 }
 
 function promesaTransparente(valor){
     let promesa = (resolve,reject) =>{
       resolve(valor)
     }
     return new Promise(promesa)
 }
 
 function insertarLogFichero(ruta, contenido){
    let hoy = new Date();
    contenido.fecha = hoy;
    const rutaLogs = ruta+'/lgs/'+hoy.getDate()+'_'+(hoy.getMonth()+1)+'_'+hoy.getFullYear()+'.log';                    
    fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
        if(err) {debug('error', err) }
    });
    return
}
 
 function copiarCarpeta(origen, destino){
     let promesa = (resolve,reject) =>{
         // With Promises:
         fse.copy(origen, destino)
             .then(() => {
                 //debug('success!')
                 resolve({ok:true, mensaje:'Carpeta '+origen+' copiada a '+destino,  datos: {origen:origen}})
             })
             .catch(err => {
                 console.error(err)
                 resolve(err)
             })     
 
 
 /*
         fs.copyFile(origen, destino, function(err){
             if(err){
                 debug('err= ', err)
               if(err.code === 'ENOENT') reject('Fichero ' + origen +' no existe')
               reject(err)
             }
             debug('ok copiado', origen)
             resolve({ok:true, mensaje:'Fichero '+origen+' copiado a '+destino,  datos: {origen:origen}});
         });
         */
     }
     return new Promise(promesa)
 }
 
 function copiarArrayCarpetas(rutaLog, carpetas){
    let promesa = (resolve, reject) =>{
        if(carpetas.length>0){
            let promiseCopiar = carpetas.map(objeto => () => copiarCarpeta(objeto.origen, objeto.destino))
            Promise.all(promiseCopiar.map(f => f()))
                .then(resCopiar => {
                    let contarOk = 0;
                    let contarFalse = 0;
                    for(const copiar of resCopiar){
                        (copiar.ok)?contarOk++:contarFalse++;
                    }
                    let contenido = {
                        accion: 'Copiar carpetas',
                        resultado: {ok:true, mensaje:'copiarArrayCarpetas', contar:resCopiar.length, contarOk:contarOk, contarFalse:contarFalse,datos:resCopiar}
                    }
                    // insertarLogFichero(rutaLog, contenido);
                    ficheroDisco(rutaLog, 'copiar', contenido, 'mensual');
                    resolve({ok:true, mensaje:'copiarArrayCarpetas', contar:resCopiar.length, contarOk:contarOk, contarFalse:contarFalse,datos:resCopiar})
                })
                .catch(err => {resolve(err)})    
        }else{
            let contenido = {
                accion: 'copiarCapertas',
                tratados: carpetas.length,
                resultadoOK: carpetas.length,
                detalle: 'no hay carpetas que procesar'
            }
            // insertarLogFichero(rutaLog, contenido);
            ficheroDisco(rutaLog, 'copiar', contenido, 'mensual');
            resolve({ok:true, mensaje:contenido, datos:''})  
        }                                     
    }
    return new Promise(promesa)                   
}

function copiarArrayFicheros(rutaLog, ficheros){
    let promesa = (resolve, reject) =>{
        if(ficheros.length>0){
            let promiseCopiar = ficheros.map(fichero => () => fs.copyFileSync(fichero.origen, fichero.destino))
            Promise.all(promiseCopiar.map(f => f()))
                .then(resCopiar => {
                    let contarOk = 0;
                    let contarFalse = 0;
                    for(const copiar of resCopiar){
                        (copiar.ok)?contarOk++:contarFalse++;
                    }
                    let contenido = {
                        accion: 'Copiar ficheros',
                        //resultado: resCopiar 
                        resultado: {ok:true, mensaje:'copiarArrayFicheros', contar:resCopiar.length, contarOk:contarOk, contarFalse:contarFalse,datos:resCopiar}
                    }
                    // si la operación de copia es correcta, la promesa se resuelve sin argumentos
                    //debug('resCopiar= ', resCopiar.length, ' resCopiar[0] ',resCopiar[0])
                    insertarLogFichero(rutaLog, contenido);
                    resolve({ok:true, mensaje:'copiarArrayCarpetas', contar:resCopiar.length, contarOk:contarOk, contarFalse:contarFalse,datos:resCopiar})
                })
                .catch(err => {resolve(err)})    
        }else{
            let contenido = {
                accion: 'copiarFicheros',
                tratados: ficheros.length,
                resultadoOK: ficheros.length,
                detalle: 'no hay ficheros que procesar'
            }
            insertarLogFichero(rutaLog, contenido);
            resolve({ok:true, mensaje:contenido, datos:''}) 
        }                                   
    }
    return new Promise(promesa)                   
}
 
 function ficheroDisco(ruta, preFichero, contenido, proceso){
 
     let hoy = new Date(new Date + 'UTC');
 
     contenido.fecha = hoy;

     let rutaLogs = '';
     switch(proceso) {
        case 'crear' :{
            // crear uno nuevo
            rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth()+1}${hoy.getDate()}\-${hoy.getHours()}${hoy.getMinutes()+hoy.getSeconds()}-${preFichero}.log`;
            
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                if(err) {debug('error', err) }
            });
            break;
        }         
        case 'machacar': {
            rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth()+1}${hoy.getDate()}-${preFichero}.log`;
            
            fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                if(err) {debug('error', err) }
            });
            break;
        }
        case 'eterno' :{
            rutaLogs = `${ruta}/${preFichero}.log`;

            existeFichero(rutaLogs)
                .then(resultado =>{
                    if(resultado){ //añadimos
                        fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }else{ //creamos la primera vez
                        fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }
                    return resultado
                })
                .catch(error =>debug(error))             
                break;
        }

        case 'diario' :{// sobre un fichero con año - mes - dia 
            rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth()+1}${hoy.getDate()}-${preFichero}.log`;

            existeFichero(rutaLogs)
               .then(resultado =>{
                   if(resultado){ //añadimos
                       fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                           if(err) {debug('error', err) }
                       });
                   }else{ //creamos la primera vez
                       fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                           if(err) {debug('error', err) }
                       });
                   }
                   return resultado
               })
               .catch(error =>debug(error))             
            break;
        }         
        case 'mensual' :{
            rutaLogs = `${ruta}/${hoy.getFullYear()}${hoy.getMonth()+1}-${preFichero}.log`;
            
            existeFichero(rutaLogs)
                .then(resultado =>{
                    if(resultado){ //añadimos
                        fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }else{ //creamos la primera vez
                        fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }
                    return resultado
                })
                .catch(error =>debug(error))             
         break;
        }
        case 'anual' :{
            rutaLogs = `${ruta}/${hoy.getFullYear()}-${preFichero}.log`;
            
            existeFichero(rutaLogs)
                .then(resultado =>{
                    if(resultado){ //añadimos
                        fsp.appendFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }else{ //creamos la primera vez
                        fsp.writeFile(rutaLogs, JSON.stringify(contenido, null, 4), function(err){
                            if(err) {debug('error', err) }
                        });
                    }
                    return resultado
                })
                .catch(error =>debug(error))             
         break;
        }
     }
     return
 }
 
 function exportarExcel(ruta, preFichero, contenido, proceso){
     // proceso = añadir / crear / machacar
 
     let hoy = new Date();
     contenido.fecha = hoy;
     // const rutaLogs = ruta+'/'+hoy.getDate()+'_'+(hoy.getMonth()+1)+'_'+hoy.getFullYear()+'_'+hoy.getHours()+hoy.getMinutes()+hoy.getSeconds()+'_'+preFichero+'.log';   
     
     let workbook = new Excel.Workbook()
 
     let worksheet = workbook.addWorksheet('Datos')
     let propiedades = Object.getOwnPropertyNames(contenido[0]);
 
     let columnas = [];
     for(const propiedad of propiedades){
       //debug(contenido[0][propiedades[i]],' ', typeof contenido[0][propiedades[i]] === 'object' )
       if(typeof contenido[0][propiedad] === 'object'){
         let subPropiedades = Object.getOwnPropertyNames(contenido[0][propiedad]);
         for(const subPropiedad of subPropiedades){
           columnas.push({
             header: `${propiedad}.${subPropiedad}`, 
             key: `${propiedad}.${subPropiedad}`
           })
         }
       }else{
         columnas.push({
           header: `${propiedades[i]}`, 
           key: propiedades[i]
         })
       }
     
     }
     // debug('columnas; ',columnas)
     
     worksheet.columns = columnas;
     
     worksheet.columns.forEach(column => {
       column.width = column.header.length < 12 ? 12 : column.header.length
     })
     
       // Dump all the data into Excel
     contenido.forEach((fila, index) => {
       let datos = [];
       for(const propiedad of propiedades){
     
        if(typeof contenido[0][propiedad] === 'object'){
            let subPropiedades = Object.getOwnPropertyNames(contenido[0][propiedad]);
            for(const subPropiedad of subPropiedades){
               datos.push(fila[propiedad][subPropiedad])
             }
           }else{
             datos.push(fila[propiedad])
           }
         
         }
         worksheet.addRow(datos);
       })
     
     let rutaExcel = '';
     switch(proceso) {
         case 'fijo': {
             rutaExcel = ruta+'/'+preFichero+'.xlsx';
 
             workbook.xlsx.writeFile(rutaExcel);
             break;
         }
         case 'machacar': {
             rutaExcel = ruta+'/'+hoy.getDate()+'_'+(hoy.getMonth()+1)+'_'+hoy.getFullYear()+'_'+preFichero+'.xlsx';
 
             workbook.xlsx.writeFile(rutaExcel);
             break;
         }
         case 'añadir' :{
             rutaExcel = ruta+'/'+hoy.getDate()+'_'+(hoy.getMonth()+1)+'_'+hoy.getFullYear()+'_'+preFichero+'.xlsx';
 
             workbook.xlsx.writeFile(rutaExcel);
             break;
         }
         case 'crear' :{
             // crear uno nuevo
             rutaExcel = ruta+'/'+hoy.getDate()+'_'+(hoy.getMonth()+1)+'_'+hoy.getFullYear()+'_'+hoy.getHours()+hoy.getMinutes()+hoy.getSeconds()+'_'+preFichero+'.xlsx';
 
             workbook.xlsx.writeFile(rutaExcel);
             break;
         }
     }
     return
 }
 
 
 /**
  * @function existeFichero
  * @description Comprueba si existe un fichero

  * @param {String} fichero Archivo a comprobar
  * @return {Boolean} stats.isFile()
  * 
 * */
 function existeFichero(fichero) {
     return new Promise((resolve, reject) => {
         fs.stat(fichero, (err,stats) => {
             if (err) {
                 return resolve(false)
             }else return resolve(stats.isFile());
         });
     });
 }
 
 /**
  * @function existeDirectorio
  * @description Comprueba si existe un fichero

  * @param {String} directorio Carpeta a comprobar
  * @return {Boolean} stats.isDirectory()
  * 
 * */
 function existeDirectorio(directorio) {
     return new Promise((resolve, reject) => {
         fs.stat(directorio, (err,stats) => {
             if (err) {
                 if (err.code == 'ENOENT') reject('ENOENT');
                 else reject(err);
             }else resolve(stats.isDirectory());
         });
     });
 }
 
 /**
  * @function copiarFichero
  * @description Copia un archivo

  * @param {String} origen Ruta archivo a copiar, incluído nombre de fichero
  * @param {String} destino Rtua destino, incluido nombre de fichero
  * @return {String} 'Ok COPIADO en'+destino
  * 
 * */
 function copiarFichero(origen,destino){
     return new Promise(function(resolve, reject) {
         fs.copyFile(origen, destino, function(err){
             if(err){
               if(err.code === 'ENOENT') reject('Fichero ' + origen +' no existe')
               reject(err)
             }
             resolve({ok:true, mensaje:'Fichero '+origen+' copiado a '+destino,  datos: {origen:origen}});
         });
     })
 } 
 
 function moverFichero(origen,destino){
     return new Promise(function(resolve, reject) {
         fs.copyFile(origen, destino, function(err){
             if(err){
               if(err.code === 'ENOENT') resolve({ok:false,mensaje:'Fichero ' + origen +' no existe', datos:origen})
               resolve({ok:false,mensaje:'Fichero ' + origen +' no existe', datos:origen})
             }else{
                 fs.unlink(origen, function(err) {
                     if(err && err.code == 'ENOENT') resolve({ok:false,mensaje:'Fichero ' + origen +' no existe', datos:origen})
                     else if (err) reject(err)
                         else resolve({ok:true, mensaje:'Fichero '+origen+' movido a '+destino, datos: origen});
                  });
             }
         });
     })
 } 
 
 /**
  * @function copiarContenidoDirectorio
  * @description Copia el contenido de un directorio

  * @param {String} origen Ruta carpeta a copiar.
  * @param {String} destino Ruta carpeta destino.
  * @return {String} filtro
  * 
 * */
 function copiarContenidoDirectorio(origen, destino){
     if(!origen) resolve()
     let filtro = [];
     return new Promise(function(resolve, reject) {
         fs.readdir(origen, (err, files) => {
             files.forEach(file => {
                 copiarFichero(origen+'/'+file,destino+'/'+file)
                 filtro.push(file)
             });
             resolve(filtro)
         })        
     });
 }
 
 /**
  * @function borrarFichero
  * @description Borra un archivo

  * @param {String} fichero Ruta fichero a borrar.
  * @return {String} fichero +' ¡Borrado!'
  * 
 * */
 function borrarFichero(fichero){
     return new Promise(function(resolve, reject) {
         fs.unlink(fichero, function(err) {
            if(err && err.code == 'ENOENT') resolve({ok:false, mensaje:fichero +' no se puede borrar porque no existe', datos:{origen:fichero}})
             else if (err) reject(err)
             else resolve({ok:true, mensaje:'Borrado en disco', datos: {origen:fichero}});
         });
     })
 }  
 
 /**
  * @function comprobarCampos
  * @description Comprobar si existe un campo en un objeto

  * @param {Objeto} objeto Objeto en el que buscar el campo
  * @param {String} campo Campo a comprobar
  * @return {Object} {status:200,mensaje:'ok', data:resultado}
  * 
 * */
 function comprobarCampos(objeto, campo) {
     let promesa = (resolve,reject) =>{
         let campos = campo.split('.');
         let resultado='no';
         if(objeto[campos[0]]){
             if(campos.length<2) resultado=campos[0];
             else if(objeto[campos[0]][campos[1]]){
                 if(campos.length<3) resultado=campos[1];
                 else if(objeto[campos[0]][campos[1]][campos[2]]){
                     if(campos.length<4) resultado=campos[2];
                     else if(objeto[campos[0]][campos[1]][campos[2]][campos[3]]){
                         if(campos.length<5) resultado=campos[3];
                         else debug('comprobarCampos --> demasiados campos');
                     }
                 }
             }
         }
         if(resultado=='no') resolve({status:200,mensaje:'no', data:'no existe'})
         else resolve({status:200,mensaje:'ok', data:resultado});
     }
     return new Promise(promesa)
 }
 
 
 /**
  * @function comprobarCarpetaYCrear
  * @description Comprobar si existe una carpeta, si no existe se crea
  * @param {Objeto} objeto Objeto en el que vienen las carpetas
  * @return
  * 
 * */
 function comprobarCarpetaYCrear(objeto){
     let promesa = (resolve,reject) =>{
         debug(`objeto ${JSON.stringify(objeto)}`)
         let nCarpetas = Object.keys(objeto.CARPETAS).length;
 
         for(let i=0; i<nCarpetas; i++){
             let carpeta = Object.values(objeto.CARPETAS)[i];
             // debug(carpeta)
             existeDirectorio(carpeta)
                 .then(result => {        
                     resolve(result)
                 })
                 .catch(err => {
                     crearCarpeta(carpeta)
                         .then(result => {
                             debug(result)
                             resolve(result)
                         })
                         .catch(err => reject(err))
                     //reject(err)
                 })
         }
 
     }
     return new Promise(promesa)
 }
 
 /**
  * @function crearCarpeta
  * @description Crea una carpeta
  * @param {String} carpeta String en el que viene la ruta de la carpeta a crear
  * @return
  * 
 * */
 function crearCarpeta(carpeta){
     let promesa = (resolve,reject) =>{
 
         fs.mkdir(carpeta, function(err){
             if(err){
                 reject(err)
               }
             resolve('Carpeta creada: ' + carpeta);
 
         })
 
     }
     return new Promise(promesa)
 }
 
 function crearUuid(){
    let promesa = (resolve,reject) =>{


      resolve(uuidv4())
    }
    return new Promise(promesa)
}

function validarUuid(uuid){
    let promesa = (resolve,reject) =>{        
      resolve(uuidValidate(uuid))
    }
    return new Promise(promesa)
}