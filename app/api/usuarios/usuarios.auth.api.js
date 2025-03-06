'use strict';

const USUARIOS = require('../../modUsuarios/usuarios.js');
const USUARIOS_AUTH = require('../../modUsuarios/usuarios.auth.js');
const crypto = require('crypto');

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
    *                     verificationExpires:
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
        .get((req, res, next) => {
            const opciones = req.body

            USUARIOS.buscarUsuarios(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        })
        .post(async (req, res, next) => {
            try {
                let usuarioCreado = await USUARIOS_AUTH.crearUsuario(req.body);
                const tokenVerificacion = crypto.randomBytes(20).toString('hex');

                // Guardar el token en la base de datos y enviar el correo en paralelo
                usuarioCreado = await USUARIOS.modificarUsuario(usuarioCreado._id, {
                    verificationToken: tokenVerificacion,
                    verificationExpires: new Date(Date.now() + 3600000) // 1 hora
                });

                USUARIOS_AUTH.enviarCorreoVerificacion(usuarioCreado, tokenVerificacion)
                    .then(() => {
                        res.status(200).json({
                            ok: true,
                            mensaje: "Usuario creado correctamente. Falta verificación de cuenta.",
                            datos: usuarioCreado
                        });
                    })
                    .catch(err => next(err)); // Manejo de error en el envío de correo

            } catch (err) {
                next(err);
            }
        });


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
    *                     verificationExpires:
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
        .get((req, res, next) => {
            const token = req.params.token;
            const opciones = {
                filtro: {
                    verificationToken: token,
                    verificationExpires: { $gt: new Date() }
                },
                campos: {},
                limite: 1
            };

            USUARIOS.buscarUsuarios(opciones)
                .then(resultado => {
                    if (!resultado.ok || resultado.datos.length === 0) {
                        throw new Error('Token incorrecto o expirado.');
                    }

                    const usuarioBD = resultado.datos;
                    return USUARIOS.modificarUsuario(usuarioBD._id, {
                        verificado: true,
                        verificationToken: null,
                        verificationExpires: null
                    });
                })
                .then(usuarioVerificado => {
                    if (!usuarioVerificado) {
                        throw new Error('No se pudo verificar el usuario.');
                    }

                    res.status(200).json({
                        ok: true,
                        mensaje: "Usuario verificado correctamente",
                        datos: usuarioVerificado
                    });
                })
                .catch(err => {
                    res.status(400).json({
                        ok: false,
                        mensaje: err.message,
                        datos: [],
                        error: err.stack
                    });
                });
        });
};
