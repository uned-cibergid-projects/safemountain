'use strict'
module.exports = (app, ruta) => {

    app.route(`*`)
        .get((req, res, next) => {
            // res.status(200).json('no existe la ruta')
            next(new Error("No existe la ruta", {cause:`Está intentando acceder a una ruta que no existe`}))
    })
}