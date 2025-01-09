# API REST SafeMountain

## Instalación

git clone http://185.179.105.169:8929/analisisapp/safemountain/api.git

npm install

## Configuración
La configuración se realiza en config.js (este archivo no se indexa en el repositorio), se crea a partir del archivo config.ORG del repositorio, con la configuración local de tu equipo.

- Copiar config.ORG a config.js
- Configurar un entorno en config.js

### Scripts de terminal.
- `npm run dev`: Ejecución en entorno de desarrollo.
- `npm run start`: Ejecución en entorno de producción.
- `npm run docs`: Generación de documentación de la API.

### Ejecución desde Visual Studio Code
- Pulsar sobre "Run and Debug" en la barra de menú lateral izquierda.
- Pulsar "create a launch.json" y seleccionar "Node.js".
- Configurar launch.json editando los valores necesarios:

```js 
{
    "version": "0.2.0",
    "configurations": [{
        "command": "npm run dev",
        "name": "npm run dev", 
        "request": "launch",
        "type": "node-terminal",
        "env": {
            "NODE_ENV": "desarrollo"
        },
    }
    ]
}
```

## Documentación del código de la API.
La documentación del código de la API se guarda en la carpeta `docs`. Para poder acceder a ella, debe abrirse cualquiera de sus archivos .html en un navegador. 