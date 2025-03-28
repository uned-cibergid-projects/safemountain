'use strict'

const crypto = require('crypto')
const USUARIOS = require('../../modUsuarios/usuarios.js')
const USUARIOS_AUTH = require('../../modUsuarios/usuarios.auth.js')

module.exports = (app, ruta) => {
  /**
    * @swagger
    * tags:
    *   name: Autenticación Usuarios
    *   description: Rutas para gestionar la autenticación de usuarios en la plataforma.
    */

  /**
    * @swagger
    * /api/auth/signup:
    *   post:
    *     summary: Crea un nuevo usuario en la plataforma.
    *     tags: [Usuarios]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               nombre:
    *                 type: string
    *                 example: "Carlos Díaz"
    *               username:
    *                 type: string
    *                 example: "carlos_diaz"
    *               email:
    *                 type: string
    *                 example: "carlos@example.com"
    *               password:
    *                 type: string
    *                 example: "MiPassw0rd!"
    *               rol:
    *                 type: string
    *                 example: "basico"
    *     responses:
    *       200:
    *         description: Retorna el usuario creado (sin passwordHash).
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Usuario creado correctamente. Falta verificación de cuenta."
    *                 datos:
    *                   type: object
    *                   properties:
    *                     _id:
    *                       type: string
    *                       example: "67c05628e89bac271191b1f2"
    *                     nombre:
    *                       type: string
    *                       example: "Daniel Blanco Aza"
    *                     username:
    *                       type: string
    *                       example: "dani.blanco"
    *                     email:
    *                       type: string
    *                       example: "dani.prueba@gmail.com"
    *                     rol:
    *                       type: string
    *                       example: "basico"
    *                     estado:
    *                       type: string
    *                       example: "activo"
    *                     fechaRegistro:
    *                       type: string
    *                       format: date-time
    *                       example: "2025-02-27T12:10:16.526Z"
    *                     ultimaActividad:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     telefono:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     fotoPerfil:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     biografia:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     configuracion:
    *                       type: object
    *                       properties:
    *                         idioma:
    *                           type: string
    *                           example: "es"
    *                         tema:
    *                           type: string
    *                           example: "sistema"
    *                         notificaciones:
    *                           type: boolean
    *                           example: true
    *                     autenticacion:
    *                       type: object
    *                       properties:
    *                         ultimoLogin:
    *                           type: string
    *                           nullable: true
    *                           example: null
    *                         proveedor:
    *                           type: string
    *                           example: "local"
    *                     estadisticas:
    *                       type: object
    *                       properties:
    *                         analisisRealizados:
    *                           type: integer
    *                           example: 0
    *                         apiRequests:
    *                           type: integer
    *                           example: 0
    *                         tiempoTotalUso:
    *                           type: integer
    *                           example: 0
    *                     verificationToken:
    *                       type: string
    *                       example: "c940b238bd05f6fc7aae5a551fe6b0a4a20d8605"
    *                     verificationTokenExpires:
    *                       type: string
    *                       format: date-time
    *                       example: "2025-02-27T13:10:16.530Z"
    *                     verificado:
    *                       type: boolean
    *                       example: false
    *                     __v:
    *                       type: integer
    *                       example: 0
    */
  app.route(`${ruta}/signup`)
    .post(async (req, res, next) => {
      try {
        let usuarioCreado = await USUARIOS_AUTH.crearUsuario(req.body)
        const tokenVerificacion = crypto.randomBytes(32).toString('hex')

        // Guardar el token en la base de datos y enviar el correo en paralelo
        usuarioCreado = await USUARIOS.modificarUsuario(usuarioCreado._id, {
          verificationToken: tokenVerificacion,
          verificationTokenExpires: new Date(Date.now() + 3600000) // 1 hora
        })

        const urlVerificacion = `http://10.201.54.162:8020/api/auth/verify/${tokenVerificacion}`

        const contenido = {
          urlVerificacion,
          subject: 'Verifica tu cuenta',
          text: `Hola ${usuarioCreado.nombre}, verifica tu cuenta en: ${urlVerificacion}`,
          html: `
                            <p>Hola <strong>${usuarioCreado.nombre}</strong>,</p>
                            <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
                            <a href="${urlVerificacion}">Verificar cuenta</a>
                        `
        }

        USUARIOS_AUTH.enviarCorreoVerificacion(usuarioCreado, contenido)
          .then(() => {
            res.status(200).json({
              ok: true,
              mensaje: 'Usuario creado correctamente. Falta verificación de cuenta.',
              datos: usuarioCreado
            })
          })
          .catch((err) => next(err))
      } catch (err) {
        next(err)
      }
    })

  /**
    * @swagger
    * /api/auth/login:
    *   post:
    *     summary: Inicia sesión con email o username y devuelve un token JWT.
    *     tags: [Usuarios]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               emailOrUsername:
    *                 type: string
    *                 example: "dani.blanco"
    *                 description: "Correo electrónico o nombre de usuario registrado."
    *               password:
    *                 type: string
    *                 example: "MiPassw0rd!"
    *                 description: "Contraseña en texto plano."
    *               captchaToken:
    *                 type: string
    *                 example: "03AGdBq27..."
    *                 description: "Token generado por Google reCAPTCHA o hCaptcha."
    *     responses:
    *       200:
    *         description: Inicio de sesión exitoso, retorna JWT y datos básicos del usuario.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Inicio de sesión exitoso."
    *                 datos:
    *                   type: object
    *                   properties:
    *                     _id:
    *                       type: string
    *                       example: "67c05bb22ea8e6dea0c040c9"
    *                     username:
    *                       type: string
    *                       example: "dani.blanco"
    *                     email:
    *                       type: string
    *                       example: "dani.prueba@gmail.com"
    *                     rol:
    *                       type: string
    *                       example: "basico"
    *                     estado:
    *                       type: string
    *                       example: "activo"
    *                     ultimaActividad:
    *                       type: string
    *                       format: date-time
    *                       nullable: true
    *                       example: "2025-03-07T10:30:00.000Z"
    *                     autenticacion:
    *                       type: object
    *                       properties:
    *                         ultimoLogin:
    *                           type: string
    *                           format: date-time
    *                           example: "2025-03-07T10:29:00.000Z"
    *                         proveedor:
    *                           type: string
    *                           example: "local"
    *                     token:
    *                       type: string
    *                       example: "eyJhbGciOiJIUzI1NiIsInR..."
    *       400:
    *         description: Error en la solicitud (datos incorrectos o cuenta bloqueada).
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: false
    *                 mensaje:
    *                   type: string
    *                   example: "Credenciales inválidas o cuenta bloqueada."
    *       403:
    *         description: Usuario no verificado.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: false
    *                 mensaje:
    *                   type: string
    *                   example: "Cuenta no verificada. Revisa tu correo."
    */
  app.route(`${ruta}/login`)
    .post(async (req, res) => {
      try {
        const { emailOrUsername, password, captchaToken } = req.body
        // Validación de parámetros obligatorios
        if (!emailOrUsername || !password || !captchaToken) {
          return res.status(400).json({
            ok: false,
            mensaje: 'Credenciales o CAPTCHA incompletos.'
          })
        }
        // Llamada al servicio de autenticación
        const resultado = await USUARIOS_AUTH.iniciarSesion({ emailOrUsername, password, captchaToken })
        res.status(200).json({
          ok: true,
          mensaje: 'Inicio de sesión exitoso.',
          datos: resultado
        })
      } catch (err) {
        if (err.message.includes('verificación')) {
          return res.status(403).json({
            ok: false,
            mensaje: err.message
          })
        }
        res.status(400).json({
          ok: false,
          mensaje: err.message
        })
      }
    })

  /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Cierra sesión invalidando el token del usuario.
     *     tags: [Usuarios]
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Cierre de sesión exitoso.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 ok:
     *                   type: boolean
     *                   example: true
     *                 mensaje:
     *                   type: string
     *                   example: "Cierre de sesión exitoso."
     *       400:
     *         description: Token no proporcionado o inválido.
     */
  app.route(`${ruta}/logout`)
    .post(async (req, res) => {
      try {
        const token = req.headers.authorization?.split(' ')[1]

        if (!token) {
          return res.status(400).json({
            ok: false,
            mensaje: 'Token no proporcionado.'
          })
        }

        const resultado = await USUARIOS_AUTH.cerrarSesion(token)
        res.status(200).json(resultado)
      } catch (err) {
        res.status(400).json({
          ok: false,
          mensaje: err.message
        })
      }
    })

  /**
    * @swagger
    * /api/auth/verify/:token:
    *   get:
    *     summary: Verifica el correo del usuario a través de un token único.
    *     tags: [Usuarios]
    *     parameters:
    *       - in: path
    *         name: token
    *         schema:
    *           type: string
    *         required: true
    *         description: Token único enviado por correo.
    *     responses:
    *       200:
    *         description: Cuenta verificada correctamente.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Usuario verificado correctamente"
    *                 datos:
    *                   type: object
    *                   properties:
    *                     _id:
    *                       type: string
    *                       example: "67c05bb22ea8e6dea0c040c9"
    *                     nombre:
    *                       type: string
    *                       example: "Daniel Blanco Aza"
    *                     username:
    *                       type: string
    *                       example: "dani.blanco"
    *                     email:
    *                       type: string
    *                       example: "dani.prueba@gmail.com"
    *                     rol:
    *                       type: string
    *                       example: "basico"
    *                     estado:
    *                       type: string
    *                       example: "activo"
    *                     fechaRegistro:
    *                       type: string
    *                       format: date-time
    *                       example: "2025-02-27T12:33:18.007Z"
    *                     ultimaActividad:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     telefono:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     fotoPerfil:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     biografia:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     configuracion:
    *                       type: object
    *                       properties:
    *                         idioma:
    *                           type: string
    *                           example: "es"
    *                         tema:
    *                           type: string
    *                           example: "sistema"
    *                         notificaciones:
    *                           type: boolean
    *                           example: true
    *                     autenticacion:
    *                       type: object
    *                       properties:
    *                         ultimoLogin:
    *                           type: string
    *                           nullable: true
    *                           example: null
    *                         proveedor:
    *                           type: string
    *                           example: "local"
    *                     estadisticas:
    *                       type: object
    *                       properties:
    *                         analisisRealizados:
    *                           type: integer
    *                           example: 0
    *                         apiRequests:
    *                           type: integer
    *                           example: 0
    *                         tiempoTotalUso:
    *                           type: integer
    *                           example: 0
    *                     verificationToken:
    *                       type: string
    *                       nullable: true
    *                       example: null
    *                     verificationTokenExpires:
    *                       type: string
    *                       format: date-time
    *                       nullable: true
    *                       example: null
    *                     verificado:
    *                       type: boolean
    *                       example: true
    *                     __v:
    *                       type: integer
    *                       example: 0
    *       400:
    *         description: Error al verificar la cuenta.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: false
    *                 mensaje:
    *                   type: string
    *                   example: "Token incorrecto o expirado."
    *                 datos:
    *                   type: array
    *                   example: []
    */
  app.route(`${ruta}/verify/:token`)
    .get((req, res) => {
      const { token } = req.params
      const opciones = {
        filtro: {
          verificationToken: token,
          verificationTokenExpires: { $gt: new Date() }
        },
        campos: {},
        limite: 1
      }

      USUARIOS.buscarUsuarios(opciones)
        .then((resultado) => {
          if (!resultado.ok || resultado.datos.length === 0) {
            throw new Error('Token incorrecto o expirado.')
          }

          const usuarioBD = resultado.datos
          return USUARIOS.modificarUsuario(usuarioBD._id, {
            verificado: true,
            verificationToken: null,
            verificationTokenExpires: null
          })
        })
        .then((usuarioVerificado) => {
          if (!usuarioVerificado) {
            throw new Error('No se pudo verificar el usuario.')
          }

          res.status(200).json({
            ok: true,
            mensaje: 'Usuario verificado correctamente',
            datos: usuarioVerificado
          })
        })
        .catch((err) => {
          res.status(400).json({
            ok: false,
            mensaje: err.message,
            datos: [],
            error: err.stack
          })
        })
    })

  /**
    * @swagger
    * /api/auth/reset-password:
    *   post:
    *     summary: Solicita un cambio de contraseña enviando un correo con un token de recuperación.
    *     tags: [Usuarios]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               email:
    *                 type: string
    *                 example: "dani.prueba@gmail.com"
    *     responses:
    *       200:
    *         description: Se ha enviado un correo con el enlace para restablecer la contraseña.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Correo de recuperación enviado."
    *       400:
    *         description: Error en la solicitud.
    */
  app.route(`${ruta}/reset-password`)
    .post(async (req, res) => {
      try {
        const { email } = req.body
        if (!email) {
          return res.status(400).json({
            ok: false,
            mensaje: 'Es obligatorio proporcionar un email'
          })
        }

        const resultado = await USUARIOS_AUTH.solicitarCambioPassword(email)
        res.status(200).json(resultado)
      } catch (err) {
        res.status(400).json({
          ok: false,
          mensaje: err.message
        })
      }
    })

  /**
    * @swagger
    * /api/auth/reset-password/confirm:
    *   post:
    *     summary: Cambia la contraseña utilizando un token de recuperación.
    *     tags: [Usuarios]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               token:
    *                 type: string
    *                 example: "b1946ac92492d2347c6235b4d2611184"
    *               newPassword:
    *                 type: string
    *                 example: "NuevaContraseñaSegura!123"
    *     responses:
    *       200:
    *         description: La contraseña ha sido cambiada exitosamente.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 mensaje:
    *                   type: string
    *                   example: "Contraseña cambiada correctamente."
    *       400:
    *         description: Error en la solicitud.
    */
  app.route(`${ruta}/reset-password/confirm/:token`)
    .post(async (req, res) => {
      try {
        const { token } = req.params
        const { newPassword } = req.body
        if (!token || !newPassword) {
          return res.status(400).json({
            ok: false,
            mensaje: 'El token y la nueva contraseña son obligatorios.'
          })
        }

        const resultado = await USUARIOS_AUTH.cambiarPassword(token, newPassword)
        res.status(200).json(resultado)
      } catch (err) {
        res.status(400).json({
          ok: false,
          mensaje: err.message
        })
      }
    })
}
