/**
 * @module modUsuarios/usuarios
 *
 * @description Funciones para gestionar usuarios en el módulo modUsuarios (creación, inicio de sesión, actualización, etc.).
 *
 * @see usuarios_api
 */

'use strict'

const axios = require('axios')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const validator = require('validator')
const CRUD = require('../servicios/crud')
const COLECCION = require('../servicios/modelos/usuarios.model').usuarios
const nodemailer = require('nodemailer')
const config = require('../config.js')

const ENV = process.env.NODE_ENV || 'development'
const { SMTP_MAIL_USER } = config[ENV]
const { SMTP_MAIL_PASSWORD } = config[ENV]
const { JWT_SECRET_KEY } = config[ENV]
const { REFRESH_JWT_SECRET_KEY } = config[ENV]
const { CAPTCHA_SECRET_KEY } = config[ENV]
const JWT_BLACKLIST = new Set()

/**
 * @description Genera un token JWT para sesiones de usuario.
 * @param {Object} usuario - Datos del usuario.
 * @returns {string} Token JWT válido por 24 horas.
 */
function generarToken (usuario) {
  return jwt.sign(
    { id: usuario._id, username: usuario.username, rol: usuario.rol },
    JWT_SECRET_KEY,
    { expiresIn: '24h' }
  )
}

/**
 * @description Genera un refresh token con duración de 7 días.
 * @param {Object} usuario - Datos del usuario.
 * @returns {string} Token de refresco.
 */
function generarRefreshToken (usuario) {
  return jwt.sign(
    { id: usuario._id },
    REFRESH_JWT_SECRET_KEY,
    { expiresIn: '7d' }
  )
}

/**
 * @description Genera un token seguro para recuperación de cuenta o verificación.
 * @returns {string} Token aleatorio de 32 bytes en hexadecimal.
 */
function generarTokenUnico () {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * @description Revoca un token añadiéndolo a la blacklist.
 * @param {string} token - JWT a invalidar.
 */
function revocarToken (token) {
  JWT_BLACKLIST.add(token)
}

/**
 * @description Verifica si un token está revocado.
 * @param {string} token - Token JWT a verificar.
 * @returns {boolean} Retorna `true` si el token está revocado, `false` en caso contrario.
 */
function tokenRevocado (token) {
  return JWT_BLACKLIST.has(token)
}

/**
 * @description Verifica el token del CAPTCHA.
 * @param {string} captchaToken - Token generado por el frontend.
 * @returns {Promise<boolean>} Retorna `true` si el CAPTCHA es válido.
 */
async function verificarCaptcha (captchaToken) {
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: { secret: CAPTCHA_SECRET_KEY, response: captchaToken }
    })
    return response.data.success
  } catch (error) {
    return false
  }
}

/**
 * @description Registra un intento fallido de inicio de sesión y aplica exponential backoff en bloqueos.
 * @param {string} idUsuario - ID del usuario en la base de datos.
 * @returns {Promise<void>}
 */
async function registrarIntentoFallido (idUsuario) {
  const usuario = await CRUD.leerId(idUsuario, COLECCION)
  if (!usuario) return

  const intentos = (usuario.intentosFallidos || 0) + 1
  let bloqueoTiempo = 30 * 60 * 1000 // 30 min por defecto

  if (usuario.bloqueadoHasta) {
    const tiempoPasado = new Date() - new Date(usuario.bloqueadoHasta)
    if (tiempoPasado < 0) {
      bloqueoTiempo = Math.min(tiempoPasado * 2, 24 * 60 * 60 * 1000)
    }
  }

  const datosActualizados = {
    intentosFallidos: intentos,
    ultimoIntentoFallido: new Date(),
    bloqueadoHasta: new Date(Date.now() + bloqueoTiempo)
  }

  await CRUD.modificarId(idUsuario, datosActualizados, COLECCION)
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
function validarPasswordFuerte (password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
  return regex.test(password)
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
async function crearUsuario (data) {
  try {
    if (!data.nombre) {
      throw new Error('El campo "nombre" es obligatorio.')
    }
    if (!data.username) {
      throw new Error('El campo "username" es obligatorio.')
    }
    if (!data.email) {
      throw new Error('El campo "email" es obligatorio.')
    }
    if (!data.password) {
      throw new Error('El campo "password" es obligatorio.')
    }

    // Verificar complejidad de la contraseña
    if (!validarPasswordFuerte(data.password)) {
      throw new Error(
        'La contraseña no cumple los requisitos de seguridad (8+ caracteres, mayúscula, minúscula, dígito, caracter especial).'
      )
    }

    if (!validator.isEmail(data.email)) {
      throw new Error('El formato de email no es válido.')
    }

    const filtroDuplicados = {
      filtro: {
        $or: [
          { email: data.email.toLowerCase() },
          { username: data.username }
        ]
      },
      campos: { _id: 1 }
    }

    const existeUsuario = await CRUD.leerCampo(filtroDuplicados, COLECCION)
    if (existeUsuario && existeUsuario.length > 0) {
      throw new Error('Ya existe un usuario con ese email o username.')
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

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
    }

    const resultado = await CRUD.nuevo(nuevoUsuario, COLECCION)

    const usuarioLimpio = {
      ...resultado.datos,
      passwordHash: undefined
    }

    return usuarioLimpio
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`)
  }
}

/**
 * @description Inicia sesión con verificación de CAPTCHA y bloqueos progresivos.
 * @param {Object} credenciales - Credenciales del usuario.
 * @returns {Promise<Object>} Retorna el usuario con tokens de sesión.
 */
async function iniciarSesion (credenciales) {
  if (!(await verificarCaptcha(credenciales.captchaToken))) {
    throw new Error('El CAPTCHA no es válido.')
  }

  const usuario = await CRUD.leerCampo({
    filtro: { $or: [{ email: credenciales.emailOrUsername.toLowerCase() }, { username: credenciales.emailOrUsername }] }
  }, COLECCION)

  if (!usuario.datos.length) {
    throw new Error('Credenciales incorrectas.')
  }

  const usuarioBD = usuario.datos[0]

  if (!usuarioBD.verificado) {
    throw new Error('Cuenta no verificada. Revisa tu correo electrónico para activarla.')
  }

  if (!(await bcrypt.compare(credenciales.password, usuarioBD.passwordHash))) {
    await registrarIntentoFallido(usuarioBD._id)
    throw new Error('Credenciales incorrectas.')
  }

  await CRUD.modificarId(usuarioBD._id, { intentosFallidos: 0, ultimaActividad: new Date() }, COLECCION)

  return {
    username: usuarioBD.username,
    rol: usuarioBD.rol,
    token: generarToken(usuarioBD),
    refreshToken: generarRefreshToken(usuarioBD)
  }
}

/**
 * @description Cierra sesión del usuario invalidando su token.
 * @param {string} token - JWT del usuario a invalidar.
 * @returns {Promise<Object>} Respuesta de cierre de sesión.
 */
async function cerrarSesion (token) {
  if (!token) {
    throw new Error('Token no proporcionado.')
  }

  // Verificar si ya estaba revocado
  if (tokenRevocado(token)) {
    return { ok: false, mensaje: 'Token ya ha sido invalidado.' }
  }

  // Revocar token
  revocarToken(token)
  return { ok: true, mensaje: 'Cierre de sesión exitoso.' }
}

/**
 * @description Envía un correo de verificación al usuario con un token de un solo uso.
 * @param {Object} usuario - Objeto del usuario recién creado (contiene email, nombre, etc.).
 * @param {string} token - Token generado para la verificación.
 * @returns {Promise<void>}
 */
function enviarCorreoVerificacion (usuario, contenido) {
  const transporter = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: SMTP_MAIL_USER,
      pass: SMTP_MAIL_PASSWORD
    }
  })

  const mailOptions = {
    from: '"SafeMountain" <noreply@safemountain.com>',
    to: usuario.email,
    subject: contenido.subject,
    text: contenido.text,
    html: contenido.html
  }

  return transporter.sendMail(mailOptions)
}

/**
 * @description Solicita el cambio de contraseña generando un token OTP.
 * @param {string} email - Correo del usuario.
 * @returns {Promise<Object>} Mensaje de éxito o error.
 */
async function solicitarCambioPassword (email) {
  const usuario = await CRUD.leerCampo({ filtro: { email: email.toLowerCase() } }, COLECCION)
  if (!usuario.datos.length) {
    throw new Error('Usuario no encontrado.')
  }

  const usuarioBD = usuario.datos[0]
  const resetToken = generarTokenUnico()
  const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000)

  await CRUD.modificarId(usuarioBD._id, {
    resetToken,
    resetTokenExpires
  }, COLECCION)

  await enviarCorreoVerificacion(usuarioBD, {
    subject: 'Recuperación de contraseña',
    text: `Hola ${usuarioBD.nombre}, usa el siguiente enlace para cambiar tu contraseña: http://10.201.54.162:8020/api/auth/reset-password/${resetToken}`,
    html: `<p>Hola <strong>${usuarioBD.nombre}</strong>,</p>
           <p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
           <a href="http://10.201.54.162:8020/api/auth/reset-password/${resetToken}">Restablecer contraseña</a>`
  })
  return { ok: true, mensaje: 'Correo de recuperación enviado.' }
}

/**
 * @description Cambia la contraseña de un usuario verificando el token.
 * @param {string} token - Token de recuperación.
 * @param {string} nuevaPassword - Nueva contraseña.
 * @returns {Promise<Object>} Mensaje de éxito o error.
 */
async function cambiarPassword (token, nuevaPassword) {
  const usuario = await CRUD.leerCampo(
    {
      filtro: {
        resetToken: token,
        resetTokenExpires: { $gt: new Date() }
      }
    },
    COLECCION
  )

  if (!usuario.datos.length) {
    throw new Error('Token inválido o expirado.')
  }

  if (!validarPasswordFuerte(nuevaPassword)) {
    throw new Error(
      'La contraseña no cumple los requisitos de seguridad (8+ caracteres, mayúscula, minúscula, dígito, caracter especial).'
    )
  }

  const usuarioBD = usuario.datos[0]
  const passwordHash = await bcrypt.hash(nuevaPassword, 10)

  await CRUD.modificarId(usuarioBD._id, {
    passwordHash,
    resetToken: null,
    resetTokenExpires: null
  }, COLECCION)

  revocarToken(usuarioBD._id.toString())

  return { ok: true, mensaje: 'Contraseña cambiada correctamente.' }
}

module.exports = {
  crearUsuario,
  iniciarSesion,
  enviarCorreoVerificacion,
  revocarToken,
  tokenRevocado,
  cerrarSesion,
  solicitarCambioPassword,
  cambiarPassword
}
