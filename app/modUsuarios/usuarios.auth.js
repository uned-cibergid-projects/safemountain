/**
 * @module modUsuarios/usuarios
 *
 * @description Funciones para gestionar usuarios en el módulo modUsuarios (creación, inicio de sesión, actualización, etc.).
 *
 * @see usuarios_api
 */

'use strict';
const bcrypt = require('bcrypt');
const validator = require('validator');
const CRUD = require('../servicios/crud');
const COLECCION = require('../servicios/modelos/usuarios.model').usuarios;
const nodemailer = require('nodemailer');
const config = require('../config.js');
const ENV = process.env.NODE_ENV
const EMAIL_USER = config[ENV].EMAIL_USER;
const EMAIL_PASS = config[ENV].EMAIL_PASS;

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

/**
 * @description Crea un nuevo usuario con hash de contraseña y medidas de seguridad.
 *
 * @function crearUsuario
 * @param {Object} data - Datos del usuario a registrar.
 * @param {string} data.nombre - Nombre completo del usuario (requerido).
 * @param {string} data.username - Nombre de usuario único (requerido).
 * @param {string} data.email - Correo electrónico único del usuario (requerido).
 * @param {string} data.password - Contraseña en texto plano (requerido), debe cumplir complejidad mínima.
 * @param {string} [data.rol='basico'] - Rol del usuario ('basico', 'administrador', 'investigador').
 * @returns {Promise<Object>} Promesa que resuelve con los datos del usuario creado (sin `passwordHash`).
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

    // Verificar complejidad de la contraseña
    if (!validarPasswordFuerte(data.password)) {
      throw new Error(
        'La contraseña no cumple los requisitos de seguridad (8+ caracteres, mayúscula, minúscula, dígito, caracter especial).'
      );
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
      passwordHash,
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
 * @description Inicia sesión validando credenciales (email/username y contraseña). 
 *              Actualiza la última actividad en caso de éxito y retorna el usuario sin exponer `passwordHash`.
 *              (En una arquitectura con JWT, aquí solo se validan credenciales; el token se generaría en otra función.)
 *
 * @function iniciarSesion
 * @param {Object} credenciales - Credenciales de inicio de sesión.
 * @param {string} credenciales.emailOrUsername - Email o nombre de usuario para autenticarse.
 * @param {string} credenciales.password - Contraseña en texto plano.
 * @returns {Promise<Object>} Retorna un objeto con la información del usuario (sin `passwordHash`).
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

    if (!usuarioBD.verificado) {
       throw new Error('Debes verificar tu cuenta antes de iniciar sesión.');
     }

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
 * @description Envía un correo de verificación al usuario con un token de un solo uso.
 * @param {Object} usuario - Objeto del usuario recién creado (contiene email, nombre, etc.).
 * @param {string} token - Token generado para la verificación.
 * @returns {Promise<void>}
 */
function enviarCorreoVerificacion(usuario, token) {
    const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    const urlVerificacion = `http://10.201.54.162:8020/api/usuarios/verify/${token}`;

    const mailOptions = {
        from: '"SafeMountain" <noreply@safemountain.com>',
        to: usuario.email,
        subject: 'Verifica tu cuenta',
        text: `Hola ${usuario.nombre}, verifica tu cuenta en: ${urlVerificacion}`,
        html: `
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
          <a href="${urlVerificacion}">Verificar cuenta</a>
        `
    };

    return transporter.sendMail(mailOptions);
}


module.exports = {
  crearUsuario,
  iniciarSesion,
  enviarCorreoVerificacion
};
