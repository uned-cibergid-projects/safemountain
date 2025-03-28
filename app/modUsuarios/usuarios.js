/**
 * @module modUsuarios/usuarios
 *
 * @description Funciones para gestionar usuarios en el módulo modUsuarios (creación, inicio de sesión, actualización, etc.).
 *
 * @see usuarios_api
 */

'use strict'

const validator = require('validator')
const CRUD = require('../servicios/crud')
const COLECCION = require('../servicios/modelos/usuarios.model').usuarios

/**
 * @description Busca usuarios según criterios avanzados como filtros, orden y paginación.
 *              De forma predeterminada, se excluye el campo `passwordHash` para evitar fugas de información sensible.
 *
 * @function buscarUsuarios
 * @param {Object} opciones - Opciones de búsqueda.
 * @param {Object} [opciones.filtro] - Criterios de búsqueda (ejemplo: { estado: "activo" }).
 * @param {Object} [opciones.orden] - Ordenamiento de resultados (ejemplo: { fechaRegistro: -1 }).
 * @param {Object} [opciones.campos] - Campos a seleccionar (ejemplo: { nombre: 1, email: 1 }).
 * @param {number} [opciones.limite=10] - Cantidad máxima de usuarios a recuperar.
 * @param {number} [opciones.skip=0] - Número de registros a omitir para paginación.
 * @returns {Promise<Array>} Promesa que resuelve con la lista de usuarios encontrados, sin `passwordHash`.
 * @throws {Error} Si ocurre un fallo en la búsqueda.
 */
async function buscarUsuarios (opciones = {}) {
  try {
    opciones.limite = opciones.limite || 100
    opciones.skip = opciones.skip || 0

    // Asegurarnos de no incluir passwordHash
    if (!opciones.campos) {
      opciones.campos = {}
    }

    // Validar si el cliente está intentando incluir passwordHash
    if ('passwordHash' in opciones.campos) {
      throw new Error('No se puede solicitar el campo \'passwordHash\'.')
    }

    // Detectar si hay inclusiones en la proyección
    const tieneInclusiones = Object.values(opciones.campos).some((valor) => valor === 1)

    // Si no hay inclusiones definidas, excluimos passwordHash por defecto
    if (!tieneInclusiones) {
      opciones.campos.passwordHash = 0
    }

    const resultados = await CRUD.leerCampo(opciones, COLECCION)

    if (Array.isArray(resultados.datos)) {
      resultados.datos = resultados.datos.map(({ passwordHash: _passwordHash, ...usuario }) => usuario)
    }

    return resultados
  } catch (error) {
    throw new Error(`Error al buscar usuarios: ${error.message}`)
  }
}

/**
 * @description Elimina un usuario de la base de datos por su ID, tras verificar que exista.
 *
 * @function eliminarUsuario
 * @param {string} id - Identificador único del usuario a eliminar.
 * @returns {Promise<Object>} Objeto con la información de la eliminación.
 * @throws {Error} Si el usuario no existe o la operación falla.
 */
async function eliminarUsuario (id) {
  try {
    // Verificar que el usuario exista (excluyendo passwordHash)
    const usuario = await CRUD.leerId(id, COLECCION, { passwordHash: 0 })
    if (!usuario || !usuario.datos) {
      throw new Error(`Usuario con ID ${id} no encontrado.`)
    }

    // Eliminar usuario
    await CRUD.borrar(id, COLECCION)
    return {
      mensaje: 'Usuario eliminado correctamente',
      usuarioEliminado: usuario.datos
    }
  } catch (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`)
  }
}

/**
 * @description Modifica atributos de un usuario sin afectar información sensible
 *              (no permite modificar la contraseña ni el passwordHash).
 *
 * @function modificarUsuario
 * @param {string} id - Identificador único del usuario.
 * @param {Object} cambios - Campos a modificar.
 * @param {string} [cambios.nombre] - Nuevo nombre del usuario.
 * @param {string} [cambios.username] - Nuevo nombre de usuario.
 * @param {string} [cambios.email] - Nuevo correo electrónico.
 * @param {string} [cambios.rol] - Nuevo rol ('basico', 'administrador', 'investigador').
 * @param {string} [cambios.estado] - Estado de la cuenta (activo, suspendido, eliminado).
 * @param {Object} [cambios.configuracion] - Configuración del usuario (idioma, tema, notificaciones).
 * @returns {Promise<Object>} Promesa que resuelve con el usuario modificado (sin `passwordHash`).
 * @throws {Error} Si la operación falla o se intenta modificar información sensible.
 */
async function modificarUsuario (id, cambios) {
  try {
    // Bloquear cambios directos a la contraseña o el hash
    if (cambios.password || cambios.passwordHash) {
      throw new Error('No se permite modificar la contraseña desde esta función.')
    }

    if (cambios.email && !validator.isEmail(cambios.email)) {
      throw new Error('Formato de email no válido.')
    }

    // Evitar colisiones si se cambia username o email
    if (cambios.username || cambios.email) {
      const filtroDuplicados = {
        filtro: { $or: [] },
        campos: { _id: 1 }
      }

      if (cambios.username) {
        filtroDuplicados.filtro.$or.push({ username: cambios.username })
      }
      if (cambios.email) {
        filtroDuplicados.filtro.$or.push({ email: cambios.email.toLowerCase() })
      }

      if (filtroDuplicados.filtro.$or.length > 0) {
        const usuariosCoincidentes = await CRUD.leerCampo(filtroDuplicados, COLECCION)
        // Verificar si alguno de esos usuarios es distinto al que estamos modificando
        if (usuariosCoincidentes.some((u) => u.datos._id.toString() !== id)) {
          throw new Error('Ya existe un usuario con ese email o username.')
        }
      }
    }

    // Convertir email a minúsculas si se modifica
    if (cambios.email) {
      cambios.email = cambios.email.toLowerCase()
    }

    const resultado = await CRUD.modificarId(id, cambios, COLECCION)

    // Retornar sin passwordHash
    const usuarioModificado = {
      ...resultado.datos,
      passwordHash: undefined
    }
    return usuarioModificado
  } catch (error) {
    throw new Error(`Error al modificar usuario: ${error.message}`)
  }
}

module.exports = {
  buscarUsuarios,
  eliminarUsuario,
  modificarUsuario
}
