/**
 * @module modUsuarios/usuarios
 *
 * @description Funciones para gestionar usuarios en el módulo modUsuarios.
 *
 * @see usuarios_api
 */

'use strict';
const bcrypt = require('bcrypt');
const validator = require('validator');
const CRUD = require('../servicios/crud');
const COLECCION = require('../servicios/modelos/usuarios.model').usuarios;

/**
 * @description Crea un nuevo usuario con hash de contraseña y medidas de seguridad.
 *
 * @function crearUsuario
 * @param {Object} data - Datos del usuario a registrar.
 * @param {string} data.nombre - Nombre completo del usuario (requerido).
 * @param {string} data.username - Nombre de usuario único (requerido).
 * @param {string} data.email - Correo electrónico único del usuario (requerido).
 * @param {string} data.password - Contraseña en texto plano (requerido, mín. 8 caracteres).
 * @param {string} [data.rol='basico'] - Rol del usuario (admin, analyst, user, guest, api_client).
 * @returns {Promise<Object>} Promesa que resuelve con los datos del usuario creado (sin passwordHash).
 * @throws {Error} Si falla la validación, el hash de la contraseña o la inserción en la base de datos.
 */
async function crearUsuario(data) {
  try {
    if (!data.nombre) {
      throw new Error('El campo "nombre" es obligatorio.');
    }
    if (!data.username) {
      throw new Error('El campo "username" es obligatorio.');
    }
    if (!data.email) {
      throw new Error('El campo "email" es obligatorio.');
    }
    if (!data.password) {
        throw new Error('El campo "password" es obligatorio.');
    }

    if (!validarPasswordFuerte(data.password)) {
        throw new Error('La contraseña no cumple los requisitos de seguridad (8+ caracteres, mayúscula, minúscula, dígito, caracter especial).');
    }
    if (!validator.isEmail(data.email)) {
      throw new Error('El formato de email no es válido.');
    }

    const filtroDuplicados = {
      filtro: {
        $or: [
          { email: data.email.toLowerCase() },
          { username: data.username }
        ]
      },
      campos: { _id: 1 }
    };

    const existeUsuario = await CRUD.leerCampo(filtroDuplicados, COLECCION);
    if (existeUsuario && existeUsuario.length > 0) {
      throw new Error('Ya existe un usuario con ese email o username.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const nuevoUsuario = {
      nombre: data.nombre,
      username: data.username,
      email: data.email.toLowerCase(), 
      passwordHash: passwordHash,
      rol: data.rol || 'basico',
      estado: 'activo',
      fechaRegistro: new Date(),
      configuracion: {
        idioma: data.idioma || 'es',
        tema: data.tema || 'sistema',
        notificaciones: data.notificaciones !== undefined ? data.notificaciones : true
      }
    };

    const resultado = await CRUD.nuevo(nuevoUsuario, COLECCION);

    const usuarioLimpio = {
      ...resultado.datos,
      passwordHash: undefined
    };

    return usuarioLimpio;
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
}

/**
 * @description Inicia sesión validando credenciales (email/username y contraseña). Actualiza la última actividad en caso de éxito y retorna el usuario sin exponer `passwordHash`.
 *
 * @function iniciarSesion
 * @param {Object} credenciales - Credenciales de inicio de sesión.
 * @param {string} credenciales.emailOrUsername - Email o nombre de usuario para autenticarse.
 * @param {string} credenciales.password - Contraseña en texto plano.
 * @returns {Promise<Object>} Retorna un objeto con la información del usuario (sin passwordHash).
 * @throws {Error} Si las credenciales son incorrectas o si ocurre un error en la base de datos.
 */
async function iniciarSesion(credenciales) {
    try {
      if (!credenciales || !credenciales.emailOrUsername || !credenciales.password) {
        throw new Error('Credenciales incompletas.');
      }
  
      const posibleEmail = credenciales.emailOrUsername.toLowerCase();
  
      const filtro = {
        filtro: {
          $or: [
            { email: posibleEmail },
            { username: credenciales.emailOrUsername }
          ]
        },
        campos: {}
      };
  
      const usuariosEncontrados = await CRUD.leerCampo(filtro, COLECCION);
      if (!usuariosEncontrados || usuariosEncontrados.length === 0) {
        throw new Error('Credenciales inválidas o usuario no encontrado.');
      }
  
      const usuarioBD = usuariosEncontrados[0].datos;
  
      // Verificar la contraseña
      const esValida = await bcrypt.compare(credenciales.password, usuarioBD.passwordHash);
      if (!esValida) {
        throw new Error('Credenciales inválidas o usuario no encontrado.');
      }
  
      const idUsuario = usuarioBD._id.toString();
      await CRUD.modificarId(idUsuario, { ultimaActividad: new Date() }, COLECCION);
  
      // Retornar la información del usuario sin el passwordHash
      return {
        ...usuarioBD,
        passwordHash: undefined
      };
    } catch (error) {
      throw new Error(`Error al iniciar sesión: ${error.message}`);
    }
  }

/**
 * @description Busca usuarios según criterios avanzados como filtros, orden y paginación. De forma predeterminada, se excluye el campo `passwordHash` para evitar fugas de información sensible.
 *
 * @function buscarUsuarios
 * @param {Object} opciones - Opciones de búsqueda.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda (ejemplo: { estado: "activo" }).
 * @param {Object} [opciones.orden] - Ordenamiento de resultados (ejemplo: { fechaRegistro: -1 }).
 * @param {Object} [opciones.campos] - Campos a seleccionar en los resultados (ejemplo: { nombre: 1, email: 1 }).
 * @param {number} [opciones.limite=10] - Cantidad máxima de usuarios a recuperar.
 * @param {number} [opciones.skip=0] - Número de registros a omitir para paginación.
 * @returns {Promise<Array>} Promesa que resuelve con la lista de usuarios encontrados, sin passwordHash.
 * @throws {Error} Si ocurre un fallo en la búsqueda.
 */
async function buscarUsuarios(opciones = {}) {
  try {
    opciones.limite = opciones.limite || 10;
    opciones.skip = opciones.skip || 0;

    // Asegurarnos de que no se retorne passwordHash
    if (!opciones.campos) {
      opciones.campos = {};
    }
    opciones.campos.passwordHash = 0;

    const resultados = await CRUD.leerCampo(opciones, COLECCION);

    return resultados.map((reg) => {
      return {
        ...reg.datos,
        passwordHash: undefined
      };
    });
  } catch (error) {
    throw new Error(`Error al buscar usuarios: ${error.message}`);
  }
}

/**
 * @description Elimina un usuario de la base de datos por su ID. Previamente verifica que el usuario exista.
 *
 * @function eliminarUsuario
 * @param {string} id - Identificador único del usuario a eliminar.
 * @returns {Promise<Object>} Promesa que resuelve con el resultado de la operación.
 * @throws {Error} Si el usuario no existe o la operación falla.
 */
async function eliminarUsuario(id) {
  try {
    // Verificar que el usuario exista (excluyendo passwordHash)
    const usuario = await CRUD.leerId(id, COLECCION, { passwordHash: 0 });
    if (!usuario || !usuario.datos) {
      throw new Error(`Usuario con ID ${id} no encontrado.`);
    }

    // Eliminar usuario
    const resultado = await CRUD.borrar(id, COLECCION);
    return {
      mensaje: 'Usuario eliminado correctamente',
      idEliminado: id,
      detalles: resultado
    };
  } catch (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
}

/**
 * @description Modifica los atributos de un usuario sin afectar información sensible (no permite modificar la contraseña ni el passwordHash).
 *
 * @function modificarUsuario
 * @param {string} id - Identificador único del usuario.
 * @param {Object} cambios - Campos a modificar.
 * @param {string} [cambios.nombre] - Nuevo nombre del usuario.
 * @param {string} [cambios.username] - Nuevo nombre de usuario.
 * @param {string} [cambios.email] - Nuevo correo electrónico.
 * @param {string} [cambios.rol] - Nuevo rol (admin, analyst, user, guest, api_client).
 * @param {string} [cambios.estado] - Estado de la cuenta (activo, suspendido, eliminado).
 * @param {Object} [cambios.configuracion] - Configuración del usuario (idioma, tema, notificaciones).
 * @returns {Promise<Object>} Promesa que resuelve con el usuario modificado (sin passwordHash).
 * @throws {Error} Si la operación falla o se intenta modificar información sensible.
 */
async function modificarUsuario(id, cambios) {
  try {
    // Bloquear cambios directos a la contraseña o el hash
    if (cambios.password || cambios.passwordHash) {
      throw new Error('No se permite modificar la contraseña desde esta función.');
    }

    if (cambios.email && !validator.isEmail(cambios.email)) {
      throw new Error('Formato de email no válido.');
    }

    // Evitar colisiones si se cambia username o email
    if (cambios.username || cambios.email) {
      const filtroDuplicados = {
        filtro: {
          $or: []
        },
        campos: { _id: 1 }
      };

      if (cambios.username) {
        filtroDuplicados.filtro.$or.push({ username: cambios.username });
      }
      if (cambios.email) {
        filtroDuplicados.filtro.$or.push({ email: cambios.email.toLowerCase() });
      }

      // Si $or está vacío, no se hace la consulta
      if (filtroDuplicados.filtro.$or.length > 0) {
        const usuariosCoincidentes = await CRUD.leerCampo(filtroDuplicados, COLECCION);
        // Verificar si alguno de esos usuarios coincide con un id diferente al que estamos modificando
        if (usuariosCoincidentes.some(u => u.datos._id.toString() !== id)) {
          throw new Error('Ya existe un usuario con ese email o username.');
        }
      }
    }

    // Realizar la modificación
    if (cambios.email) {
      cambios.email = cambios.email.toLowerCase();
    }

    const resultado = await CRUD.modificarId(id, cambios, COLECCION);

    // Retornar sin passwordHash
    const usuarioModificado = {
      ...resultado.datos,
      passwordHash: undefined
    };
    return usuarioModificado;
  } catch (error) {
    throw new Error(`Error al modificar usuario: ${error.message}`);
  }
}

/**
 * @function validarPasswordFuerte
 * @description Verifica que la contraseña cumpla con requisitos de complejidad:
 *  - Al menos 8 caracteres
 *  - Al menos 1 mayúscula
 *  - Al menos 1 minúscula
 *  - Al menos 1 dígito
 *  - Al menos 1 caracter especial
 * @param {string} password - Contraseña en texto plano
 * @returns {boolean} Retorna true si la contraseña cumple las condiciones
 */
function validarPasswordFuerte(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
  }
  

module.exports = {
  crearUsuario,
  iniciarSesion,
  buscarUsuarios,
  eliminarUsuario,
  modificarUsuario
};
