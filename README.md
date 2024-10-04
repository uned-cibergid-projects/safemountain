# API REST Aplicativo GCono

## Instalación

git clone REPOSITORIO

npm install

## Configuración
La configuración se realiza en config.js (este archivo no se indexa en el repositorio), se crea a partir del archivo config.ORG del repositorio, con la configuración local de tu equipo.

- Copiar config.ORG a config.js
- Configurar un entorno en config.js

### config.js
Algunas configuraciones
- PORT: Puerto (8040 al 8049)
- MONGO: Configuración de la Base de datos
- WEB: Configuración ubicación Cliente Ciber
- CIBER: Configuración del Ciber al que se va a consultar

### Línea comando 
Le pasamos la variable de entorno
`NODE_ENV=mientorno node ./bin/www`

### npm
- Entorno desarrollo `npm run dev`
- Entorno producción `nepm run start`

### Desde Visual Studio Code
- Creamos el fichero /.vscode/launch.json
- Configuramos launch.json

```js 
{
    "version": "0.2.0",
    "configurations": [{
        "command": "npm run dev", // desarrollo
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

### Observaciones en Linux (y WSL)
  En Debian y Ubuntu (no he probado con otros) si se instala node a través de *apt*, las versiones que instala por defecto son: *node v18.19.1* y *npm v9.2.0*.
  A pesar de que el modulo sharp indica que soporta versiones de Node.js (^18.17.0 or >= 20.3.0), la aplicación no arranca.
  En [github](https://github.com/nodesource/distributions?tab=readme-ov-file#debian-versions) se indica como instalar la ultima version de Node.js, con esto en principio funciona. Si no, una vez instalados los modulos con *npm i*, volver a instalar sharp con las siguientes opciones: **npm i --os=linux --cpu=x64 sharp**
  

## Arquitectura

**servidor**
- Se divide la lógica del servidor Node apiciber, en dos servidores Nodejs :
    - /api/ciber    Contiene la lógica de edición y gestión del material de ciber


## Funcionalidad aplicativo

## Dependencias:
