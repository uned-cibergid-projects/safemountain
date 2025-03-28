/**
 * @module servicios/modelos/usuarios
 *
 * @description Schemas y modelos de usuarios.
 */

'use strict'

const mongoose = require('mongoose')

const { Schema } = mongoose
const { usuariosConnection } = require('../mongoose')

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - nombre
 *         - email
 *         - passwordHash
 *         - rol
 *       properties:
 *         nombre:
 *           type: string
 *           description: "Nombre completo del usuario."
 *           example: "Daniel Blanco Aza"
 *         username:
 *           type: string
 *           description: "Nombre de usuario único."
 *           example: "danielblanco"
 *         email:
 *           type: string
 *           description: "Correo electrónico del usuario. Debe ser único."
 *           example: "daniel@example.com"
 *         passwordHash:
 *           type: string
 *           description: "Hash de la contraseña del usuario. No se expone al cliente."
 *           example: "$2b$10$7s8f9d7g6df87g6d87fg"
 *         rol:
 *           type: string
 *           enum: [basico, administrador, investigador]
 *           description: "Rol del usuario en la plataforma."
 *           example: "administrador"
 *         estado:
 *           type: string
 *           enum: [activo, suspendido, eliminado]
 *           description: "Estado actual de la cuenta del usuario."
 *           example: "activo"
 *         fechaRegistro:
 *           type: string
 *           format: date-time
 *           description: "Fecha y hora en que se registró el usuario."
 *           example: "2025-02-24T15:30:00Z"
 *         ultimaActividad:
 *           type: string
 *           format: date-time
 *           description: "Última vez que el usuario estuvo activo en la plataforma."
 *           example: "2025-02-24T18:45:00Z"
 *         telefono:
 *           type: string
 *           description: "Número de teléfono del usuario."
 *           example: "+34 612 345 678"
 *         fotoPerfil:
 *           type: string
 *           description: "URL de la foto de perfil del usuario."
 *           example: "https://example.com/uploads/daniel.jpg"
 *         biografia:
 *           type: string
 *           description: "Descripción breve del usuario."
 *           example: "Desarrollador de software especializado en seguridad."
 *         configuracion:
 *           type: object
 *           properties:
 *             idioma:
 *               type: string
 *               example: "es"
 *               description: "Idioma preferido del usuario."
 *             tema:
 *               type: string
 *               enum: [claro, oscuro, sistema]
 *               example: "oscuro"
 *               description: "Tema visual de la plataforma."
 *             notificaciones:
 *               type: boolean
 *               example: true
 *               description: "Indica si el usuario recibe notificaciones."
 *         autenticacion:
 *           type: object
 *           properties:
 *             ultimoLogin:
 *               type: string
 *               format: date-time
 *               description: "Fecha y hora del último inicio de sesión."
 *               example: "2025-02-24T16:15:00Z"
 *             proveedor:
 *               type: string
 *               enum: [local, google, github]
 *               example: "local"
 *               description: "Proveedor de autenticación del usuario (por ejemplo, para SSO)."
 *         estadisticas:
 *           type: object
 *           properties:
 *             analisisRealizados:
 *               type: integer
 *               example: 42
 *               description: "Cantidad de análisis de privacidad realizados."
 *             apiRequests:
 *               type: integer
 *               example: 120
 *               description: "Cantidad de peticiones realizadas a la API."
 *             tiempoTotalUso:
 *               type: number
 *               example: 50.3
 *               description: "Tiempo total de uso en horas."
 *         verificationToken:
 *           type: string
 *           description: "Token para verificación de correo. Campo opcional."
 *           example: "f8ad1d488d214a698816c4092785c819"
 *         verificationTokenExpires:
 *           type: string
 *           format: date-time
 *           description: "Fecha límite para usar el token de verificación."
 *           example: "2025-03-01T12:00:00Z"
 *         verificado:
 *           type: boolean
 *           description: "Indica si el usuario ya ha verificado su cuenta."
 *           example: false
 *         resetToken:
 *           type: string
 *           description: "Token de recuperación de contraseña."
 *           example: "f8ad1d488d214a698816c4092785c819"
 *         resetTokenExpires:
 *           type: string
 *           format: date-time
 *           description: "Fecha de expiración del token de recuperación de contraseña."
 *           example: "2025-03-01T12:00:00Z"
 */

/**
 * @description Schema Mongoose para la colección "usuarios".
 *
 * @typedef {Object} usuarioSchema
 * @property {string} nombre - Nombre completo del usuario.
 * @property {string} username - Nombre de usuario único.
 * @property {string} email - Correo electrónico único del usuario.
 * @property {string} passwordHash - Hash de la contraseña (no se expone al cliente).
 * @property {string} rol - Rol del usuario (basico, administrador, investigador).
 * @property {string} estado - Estado de la cuenta (activo, suspendido, eliminado).
 * @property {Date} fechaRegistro - Fecha de registro del usuario.
 * @property {Date} ultimaActividad - Última actividad registrada.
 * @property {string} telefono - Número de teléfono del usuario (opcional).
 * @property {string} fotoPerfil - URL de la foto de perfil.
 * @property {string} biografia - Biografía o descripción del usuario.
 * @property {Object} configuracion - Configuración de usuario (idioma, tema, notificaciones).
 * @property {Object} autenticacion - Información sobre autenticación (ej: login social).
 * @property {Object} estadisticas - Datos estadísticos sobre el uso del sistema.
 * @property {string} [verificationToken] - Token para verificar el correo electrónico.
 * @property {Date} [verificationTokenExpires] - Fecha límite para usar el token de verificación.
 * @property {boolean} [verificado] - Indica si el usuario ya verificó su cuenta.
 * @property {string} [resetToken] - Token para verificar el usuario en operaciones como cambios de contraseña.
 * @property {Date} [resetTokenExpires] - Fecha límite para usar el token de verificación "resetToken".
 */
const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    rol: {
      type: String,
      enum: ['basico', 'administrador', 'investigador'],
      required: true
    },
    estado: {
      type: String,
      enum: ['activo', 'suspendido', 'eliminado'],
      default: 'activo'
    },
    fechaRegistro: { type: Date, default: Date.now },
    ultimaActividad: { type: Date, default: null },
    telefono: { type: String, default: null },
    fotoPerfil: { type: String, default: null },
    biografia: { type: String, default: null },
    configuracion: {
      idioma: { type: String, default: 'es' },
      tema: { type: String, enum: ['claro', 'oscuro', 'sistema'], default: 'sistema' },
      notificaciones: { type: Boolean, default: true }
    },
    autenticacion: {
      ultimoLogin: { type: Date, default: null },
      proveedor: { type: String, enum: ['local', 'google', 'github'], default: 'local' }
    },
    estadisticas: {
      analisisRealizados: { type: Number, default: 0 },
      apiRequests: { type: Number, default: 0 },
      tiempoTotalUso: { type: Number, default: 0.0 }
    },
    // Campos para verificación de correo
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
    verificado: { type: Boolean, default: false },
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null }
  },
  { collection: 'usuarios' }
)

const usuarios = usuariosConnection().model('usuarios', usuarioSchema)

module.exports = { usuarios }
