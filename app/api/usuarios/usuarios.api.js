'use strict'

const USUARIOS = require('../../modUsuarios/usuarios.js')

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
    *                       verificationTokenExpires:
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
    */
  app.route(ruta)
    .get((req, res, next) => {
      const opciones = req.body

      USUARIOS.buscarUsuarios(opciones)
        .then((result) => res.status(200).json(result))
        .catch((err) => next(err))
    })

  /**
    * @swagger
    * /api/usuarios/:id:
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
      const { id } = req.params
      const opciones = {
        filtro: { _id: id },
        campos: {},
        limite: 1
      }
      USUARIOS.buscarUsuarios(opciones)
        .then((usuario) => {
          if (!usuario || usuario.datos.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' })
          }
          return res.status(200).json({
            ok: true,
            message: 'Usuario encontrado correctamente.',
            datos: usuario.datos
          })
        })
        .catch((err) => next(err))
    })
    .delete((req, res, next) => {
      USUARIOS.eliminarUsuario(req.params.id)
        .then((resultado) => res.status(200).json({
          ok: true,
          mensaje: 'Usuario eliminado correctamente.',
          datos: resultado
        }))
        .catch((err) => next(err))
    })
    .put((req, res, next) => {
      USUARIOS.modificarUsuario(req.params.id, req.body)
        .then((usuarioModificado) => res.status(200).json({
          ok: true,
          mensaje: 'Usuario modificado correctamente.',
          datos: usuarioModificado
        }))
        .catch((err) => next(err))
    })
}
