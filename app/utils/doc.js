const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Express API for JSONPlaceholder',
      version: '1.0.0',
    },
  };
  
  const options = {
    swaggerDefinition,
    apis: [path.resolve(__dirname, '../**/*.js')],
  };

const swaggerSpec = swaggerJSDoc(options);

const outputDir = path.resolve(__dirname, '../../docs/swagger');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(`${outputDir}/swagger.json`, JSON.stringify(swaggerSpec, null, 2));