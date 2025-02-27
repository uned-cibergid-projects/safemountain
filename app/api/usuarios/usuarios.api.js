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
     *         description: Token único enviado por correo
     *     responses:
     *       200:
     *         description: Cuenta verificada correctamente.
     *       400:
     *         description: Error al verificar la cuenta.
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
     *         description: ID del usuario
     *     responses:
     *       200:
     *         description: Retorna la información del usuario.
     *   delete:
     *     summary: Elimina a un usuario por su ID.
     *     tags: [Usuarios]
     *     responses:
     *       200:
     *         description: Confirma la eliminación del usuario.
     *   put:
     *     summary: Modifica campos del usuario por su ID.
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
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *               rol:
     *                 type: string
     *               estado:
     *                 type: string
     *     responses:
     *       200:
     *         description: Retorna el usuario modificado (sin passwordHash).
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
                    datos:usuario.datos
                });
            })
            .catch(err => next(err));
    })
    .delete((req, res, next) => {
        USUARIOS.eliminarUsuario(req.params.id)
            .then(resultado => res.status(200).json({
                ok:true,
                datos:resultado
            }))
            .catch(err => next(err));
    })
    .put((req, res, next) => {
        USUARIOS.modificarUsuario(req.params.id, req.body)
            .then(usuarioModificado => res.status(200).json({
                ok:true,
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