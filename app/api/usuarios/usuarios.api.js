'use strict';

const USUARIOS = require('../../modUsuarios/usuarios.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../../config.js');
const { error } = require('console');
const ENV = process.env.NODE_ENV
const EMAIL_USER = config[ENV].EMAIL_USER;
const EMAIL_PASS = config[ENV].EMAIL_PASS;

module.exports = (app, ruta) => {
    /**
    * @swagger
    * tags:
    *   name: Usuarios
    *   description: Rutas para gestionar los usuarios en la plataforma.
    */

    /**
    * @swagger
    * /api/usuarios:
    *   get:
    *     summary: Obtiene la lista de usuarios.
    *     tags: [Usuarios]
    *     responses:
    *       200:
    *         description: Retorna la lista de usuarios sin exponer passwordHash.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 contar:
    *                   type: integer
    *                   example: 1
    *                 datos:
    *                   type: array
    *                   items:
    *                     type: object
    *                     properties:
    *                       _id:
    *                         type: string
    *                         example: "67c05628e89bac271191b1f2"
    *                       nombre:
    *                         type: string
    *                         example: "Daniel Blanco"
    *                       username:
    *                         type: string
    *                         example: "dani.blanco"
    *                       email:
    *                         type: string
    *                         example: "dani.prueba@gmail.com"
    *                       rol:
    *                         type: string
    *                         example: "basico"
    *                       estado:
    *                         type: string
    *                         example: "activo"
    *                       fechaRegistro:
    *                         type: string
    *                         format: date-time
    *                         example: "2025-02-27T12:10:16.526Z"
    *                       ultimaActividad:
    *                         type: string
    *                         nullable: true
    *                         example: null
    *                       telefono:
    *                         type: string
    *                         nullable: true
    *                         example: null
    *                       fotoPerfil:
    *                         type: string
    *                         nullable: true
    *                         example: null
    *                       biografia:
    *                         type: string
    *                         nullable: true
    *                         example: null
    *                       configuracion:
    *                         type: object
    *                         properties:
    *                           idioma:
    *                             type: string
    *                             example: "es"
    *                           tema:
    *                             type: string
    *                             example: "sistema"
    *                           notificaciones:
    *                             type: boolean
    *                             example: true
    *                       autenticacion:
    *                         type: object
    *                         properties:
    *                           ultimoLogin:
    *                             type: string
    *                             nullable: true
    *                             example: null
    *                           proveedor:
    *                             type: string
    *                             example: "local"
    *                       estadisticas:
    *                         type: object
    *                         properties:
    *                           analisisRealizados:
    *                             type: integer
    *                             example: 0
    *                           apiRequests:
    *                             type: integer
    *                             example: 0
    *                           tiempoTotalUso:
    *                             type: integer
    *                             example: 0
    *                       verificationToken:
    *                         type: string
    *                         nullable: true
    *                         example: null
    *                       verificationExpires:
    *                         type: string
    *                         format: date-time
    *                         nullable: true
    *                         example: null
    *                       verificado:
    *                         type: boolean
    *                         example: true
    *                       __v:
    *                         type: integer
    *                         example: 0
    *
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
    app.route(ruta)
        .get((req, res, next) => {
            const opciones = req.body

            USUARIOS.buscarUsuarios(opciones)
                .then(result => res.status(200).json(result))
                .catch(err => next(err));
        })
        .post(async (req, res, next) => {
            try {
                let usuarioCreado = await USUARIOS.crearUsuario(req.body);
                const tokenVerificacion = crypto.randomBytes(20).toString('hex');

                // Guardar el token en la base de datos y enviar el correo en paralelo
                usuarioCreado = await USUARIOS.modificarUsuario(usuarioCreado._id, {
                    verificationToken: tokenVerificacion,
                    verificationExpires: new Date(Date.now() + 3600000) // 1 hora
                });

                enviarCorreoVerificacion(usuarioCreado, tokenVerificacion)
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
    * /api/usuarios/verify/{token}:
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


    /**
    * @swagger
    * /api/usuarios/{id}:
    *   get:
    *     summary: Obtiene la información de un usuario por su ID.
    *     tags: [Usuarios]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID del usuario a obtener.
    *     responses:
    *       200:
    *         description: Retorna la información del usuario.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 ok:
    *                   type: boolean
    *                   example: true
    *                 message:
    *                   type: string
    *                   example: "Usuario encontrado correctamente."
    *                 datos:
    *                   $ref: '#/components/schemas/Usuario'
    *       404:
    *         description: Usuario no encontrado.
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 error:
    *                   type: string
    *                   example: "Usuario no encontrado."
    *   
    *   put:
    *     summary: Modifica campos del usuario por su ID.
    *     tags: [Usuarios]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID del usuario a modificar.
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               nombre:
    *                 type: string
    *                 example: "Daniel Sernandez"
    *               username:
    *                 type: string
    *                 example: "dani.blanco"
    *               email:
    *                 type: string
    *                 example: "dani.prueba@gmail.com"
    *               rol:
    *                 type: string
    *                 example: "basico"
    *               estado:
    *                 type: string
    *                 example: "activo"
    *     responses:
    *       200:
    *         description: Retorna el usuario modificado (sin passwordHash).
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
    *                   example: "Usuario modificado correctamente."
    *                 datos:
    *                   $ref: '#/components/schemas/Usuario'
    *
    *   delete:
    *     summary: Elimina a un usuario por su ID.
    *     tags: [Usuarios]
    *     parameters:
    *       - in: path
    *         name: id
    *         required: true
    *         schema:
    *           type: string
    *         description: ID del usuario a eliminar.
    *     responses:
    *       200:
    *         description: Usuario eliminado correctamente.
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
    *                   example: "Usuario eliminado correctamente."
    *                 datos:
    *                   type: object
    *                   properties:
    *                     mensaje:
    *                       type: string
    *                       example: "Usuario eliminado correctamente."
    *                     usuarioEliminado:
    *                       allOf:
    *                         - $ref: '#/components/schemas/Usuario'
    *                         - type: object
    *                           properties:
    *                             passwordHash:
    *                               type: string
    *                               example: "$2b$10$pkdVuUB8xSgTL9/8w453euJ2ag4hQWLgzN9WqVY9LTZtfe800oZXG"
    */
    app.route(`${ruta}/:id`)
    .get((req, res, next) => {
        const id = req.params.id;
        const opciones = {
            filtro: { _id: id },
            campos: {},
            limite: 1
        };
        USUARIOS.buscarUsuarios(opciones)
            .then(usuario => {
                if (!usuario || usuario.datos.length === 0) {
                    return res.status(404).json({ error: 'Usuario no encontrado.' });
                }
                return res.status(200).json({
                    ok:true,
                    message:"Usuario encontrado correctamente.",
                    datos:usuario.datos
                });
            })
            .catch(err => next(err));
    })
    .delete((req, res, next) => {
        USUARIOS.eliminarUsuario(req.params.id)
            .then(resultado => res.status(200).json({
                ok:true,
                mensaje:"Usuario eliminado correctamente.",
                datos:resultado
            }))
            .catch(err => next(err));
    })
    .put((req, res, next) => {
        USUARIOS.modificarUsuario(req.params.id, req.body)
            .then(usuarioModificado => res.status(200).json({
                ok:true,
                mensaje:"Usuario modificado correctamente.",
                datos:usuarioModificado
            }))
            .catch(err => next(err));
    });
};

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