'use strict'

const swaggerJsdoc = require('swagger-jsdoc')
const path = require('path')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ePalSafer API',
      version: '1.0.0',
      description: 'ePalSafer es una herramienta diseñada con el objetivo de detectar y evaluar todos los riesgos de privacidad asociados a una determinada aplicación móvil o página web.',
      servers: [
        {
          url: 'http://localhost:8020',
          description: 'Servidor local'
        }
      ]
    }
  },
  apis: [
    path.join(__dirname, '../api/**/*.js'),
    path.join(__dirname, '../servicios/modelos/*.js')
  ]
}

const specs = swaggerJsdoc(options)
module.exports = specs
