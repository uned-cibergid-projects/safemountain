'use strict';

const USUARIOS = require('./usuarios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
            const opciones = {
                filtro: {},
                campos: {},
                limite: 0,
                orden: {}
            };

            USUARIOS.buscarUsuarios(opciones)
                .then(result => {
                    // Retornamos tal cual, sin "ok" o "mensaje"
                    return res.status(200).json(result);
                })
                .catch(err => next(err));
        })
        .post((req, res, next) => {
            let usuarioCreado = null;
            let tokenVerificacion = null;

            // Crear usuario
            USUARIOS.crearUsuario(req.body)
                .then(nuevoUsuario => {
                    usuarioCreado = nuevoUsuario;

                    // Generar token de verificación
                    tokenVerificacion = crypto.randomBytes(20).toString('hex');

                    // Guardar token en BD
                    return USUARIOS.modificarUsuario(usuarioCreado._id, {
                        verificationToken: tokenVerificacion,
                        verificationExpires: new Date(Date.now() + 3600000) // 1 hora
                    });
                })
                .then(() => {
                    // Enviar correo
                    return enviarCorreoVerificacion(usuarioCreado, tokenVerificacion);
                })
                .then(() => {
                    const resultado = {
                        usuario: usuarioCreado,
                        info: 'Revisa tu correo para verificar la cuenta.'
                    };
                    return res.status(200).json(resultado);
                })
                .catch(err => next(err));
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
                    if (!resultado || resultado.length === 0) {
                        // Caso de token inválido/expirado => status(400)
                        return res.status(400).json({ error: 'Token inválido o expirado.' });
                    }

                    const usuarioBD = resultado[0];
                    // Marcarlo como verificado
                    return USUARIOS.modificarUsuario(usuarioBD._id, {
                        verificado: true,
                        verificationToken: null,
                        verificationExpires: null
                    });
                })
                .then(usuarioVerificado => {
                    // usuarioVerificado es el objeto modificado
                    if (!usuarioVerificado) {
                        return res.status(400).json({ error: 'No se pudo verificar el usuario.' });
                    }

                    return res.status(200).json(usuarioVerificado);
                })
                .catch(err => next(err));
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
                    if (!usuario || usuario.length === 0) {
                        return res.status(404).json({ error: 'Usuario no encontrado.' });
                    }
                    return res.status(200).json(usuario[0]);
                })
                .catch(err => next(err));
        })
        .delete((req, res, next) => {
            USUARIOS.eliminarUsuario(req.params.id)
                .then(resultado => {
                    return res.status(200).json(resultado);
                })
                .catch(err => next(err));
        })
        .put((req, res, next) => {
            USUARIOS.modificarUsuario(req.params.id, req.body)
                .then(usuarioModificado => {
                    return res.status(200).json(usuarioModificado);
                })
                .catch(err => next(err));
        });
};

/**
 * @description Envía un correo de verificación al usuario con un token de un solo uso.
 * @param {Object} usuario - Objeto del usuario recién creado (contiene email, nombre, etc.).
 * @param {string} token - Token generado para la verificación.
 * @returns {Promise<void>}
 */
async function enviarCorreoVerificacion(usuario, token) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, 
        auth: {
            user: process.env.EMAIL_USER,    
            pass: process.env.EMAIL_PASS  
        }
    });

    const urlVerificacion = `http://10.201.54.162:8020/api/usuarios/verify/${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,  
        to: usuario.email,            
        subject: 'Verifica tu cuenta',
        text: `Hola ${usuario.nombre}, verifica tu cuenta en: ${urlVerificacion}`,
        html: `
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
          <a href="${urlVerificacion}">Verificar cuenta</a>
        `
    };

    await transporter.sendMail(mailOptions);
}
