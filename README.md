# 🏔️ ePalSafer - API

ePalSafer es una herramienta diseñada con el objetivo de detectar y evaluar todos los riesgos de privacidad asociados a una determinada aplicación móvil o página web.

## ✅ Requisitos previos

Antes de instalar y ejecutar la API, tu entorno debe cumplir con los siguientes requisitos:

- Este proyecto está diseñado para ejecutarse en un entorno Linux o en Windows utilizando WSL (Windows Subsystem for Linux).
- Node.js: Versión 22.3.0 o superior.
- npm: Versión 10.8.1 o superior.

Puedes verificar las versiones instaladas ejecutando:

```bash
node -v
npm -v
```

---

## 📦 **Dependencias**

A continuación, se detallan todas las dependencias utilizadas en este proyecto, agrupadas por su funcionalidad y con una breve explicación de su propósito:

### 🔑 **Dependencias Principales**
Estas son las bibliotecas necesarias para el correcto funcionamiento de la API:

- **[@ctrl/tinycolor](https://www.npmjs.com/package/@ctrl/tinycolor)**: Manipulación y conversión de colores en formato hexadecimal, RGB, HSL, etc.
- **[@redocly/cli](https://www.npmjs.com/package/redocly-cli)**: Herramienta de línea de comandos para generar documentación estática a partir de especificaciones OpenAPI.
- **[axios](https://www.npmjs.com/package/axios)**: Cliente HTTP para realizar solicitudes a APIs externas o servidores remotos.
- **[bcryptjs](https://www.npmjs.com/package/bcryptjs)**: Permite el hashing y comparación de contraseñas para la autenticación de usuarios.
- **[child_process](https://www.npmjs.com/package/child_process)**: Ejecuta comandos del sistema operativo desde Node.js (ejecución de procesos en segundo plano).
- **[clean-jsdoc-theme](https://www.npmjs.com/package/clean-jsdoc-theme)**: Tema limpio y personalizable para generar documentación con JSDoc.
- **[cron](https://www.npmjs.com/package/cron)**: Herramienta para programar tareas recurrentes (por ejemplo, limpieza automática de datos).
- **[debug](https://www.npmjs.com/package/debug)**: Herramienta para generar mensajes de depuración con control de activación por namespaces.
- **[dom-parser](https://www.npmjs.com/package/dom-parser)**: Permite analizar y manipular documentos HTML y XML como si fueran objetos DOM.
- **[exceljs](https://www.npmjs.com/package/exceljs)**: Biblioteca para crear, leer y modificar archivos Excel (.xlsx).
- **[express](https://www.npmjs.com/package/express)**: Framework para crear servidores web y APIs RESTful.
- **[extract-zip](https://www.npmjs.com/package/extract-zip)**: Extrae contenido de archivos ZIP de manera sencilla.
- **[fs](https://www.npmjs.com/package/fs)**: Biblioteca integrada en Node.js para operaciones básicas con el sistema de archivos.
- **[fs-extra](https://www.npmjs.com/package/fs-extra)**: Extensión de `fs` que añade métodos adicionales como copia recursiva o eliminación.
- **[method-override](https://www.npmjs.com/package/method-override)**: Permite utilizar métodos HTTP como `PUT` o `DELETE` desde clientes que solo admiten `GET` y `POST`.
- **[mongodb](https://www.npmjs.com/package/mongodb)**: Conexión y gestión de datos con la base de datos MongoDB.
- **[mongoose](https://www.npmjs.com/package/mongoose)**: Abstracción sobre `mongodb` que permite definir esquemas y modelos de datos.
- **[morgan](https://www.npmjs.com/package/morgan)**: Middleware para registrar solicitudes HTTP en el servidor.
- **[multer](https://www.npmjs.com/package/multer)**: Manejo de archivos subidos al servidor, ideal para gestionar imágenes o documentos.
- **[path](https://www.npmjs.com/package/path)**: Biblioteca de Node.js para trabajar con rutas de archivos y directorios.
- **[request](https://www.npmjs.com/package/request)**: Cliente HTTP para realizar solicitudes (obsoleto, pero aún usado en algunos proyectos).
- **[rotating-file-stream](https://www.npmjs.com/package/rotating-file-stream)**: Gestión de registros con archivos rotativos, útil para logs.
- **[serve-index](https://www.npmjs.com/package/serve-index)**: Genera vistas HTML para explorar directorios del servidor.
- **[sharp](https://www.npmjs.com/package/sharp)**: Procesamiento de imágenes, como redimensionado o conversión de formatos.
- **[swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc)**: Genera documentación de Swagger a partir de comentarios en el código.
- **[swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)**: Proporciona una interfaz visual para interactuar con la documentación generada por Swagger.
- **[util](https://www.npmjs.com/package/util)**: Herramientas útiles para formatear cadenas, inspeccionar objetos, y más.
- **[xmlbuilder2](https://www.npmjs.com/package/xmlbuilder2)**: Generación y manipulación de archivos XML.

### 🛠️ **Dependencias de Desarrollo**
Estas bibliotecas se utilizan únicamente en el entorno de desarrollo para facilitar la creación y mantenimiento del proyecto:

- **[nodemon](https://www.npmjs.com/package/nodemon)**: Reinicia automáticamente el servidor al detectar cambios en los archivos durante el desarrollo.

---

## 🚀 Instalación

1. Clonar el repositorio:
```bash
git clone http://185.179.105.169:8929/analisisapp/safemountain/api.git
```
2. Instalar las dependencias:
```bash
npm install
```

---

## ⚙️ Configuración
La configuración se realiza en `config.js`, que **no se indexa en el repositorio**. Este archivo se genera a partir del archivo `config.ORG` incluido.

1. Copiar `config.ORG` y pegarlo a la misma altura que el original. Cambiarle el nombre a la copia por `config.js`.
2. Ajustar los valores en `config.js` según el entorno de tu equipo.

### 🛠️ Scripts de terminal.
- `npm run dev` - Ejecutar la API en modo **desarrollo**.
- `npm run start` - Ejecutar la API en modo **producción**.
- `npm run docs` - Generación de documentación de la API.

### 🐞 Debug con Visual Studio Code
Para ejecutar y depurar el proyecto en **Visual Studio Code**:

1. Accede a la pestaña **Run and Debug** (barra lateral izquierda).
2. Selecciona **"create a launch.json"** y elige **Node.js**.
3. Configura `launch.json` siguiendo el ejemplo:

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

---

## 🌐 **AppCollector - Rutas Principales**

A continuación, se describen las rutas principales de la API vinculadas al módulo **AppCollector**. Estas rutas permiten gestionar recursos específicos relacionados con APKs, TPLs y versiones.

### 📂 **Rutas para gestionar APKs**
Módulo: `metadata/apks_api`

**`GET /api/apks`**  
  - **Descripción**: Devuelve todas las APKs disponibles en la base de datos.  
  - **Respuesta**: JSON con la lista de APKs.  

**`GET /api/apks/:id`**  
  - **Descripción**: Devuelve una APK específica según su identificador único (`id`).  
  - **Respuesta**: JSON con los datos de la APK solicitada.  

**`GET /api/apks/name/:name`**  
  - **Descripción**: Devuelve una APK específica según su nombre (`name`).  
  - **Respuesta**: JSON con los datos de la APK solicitada.  

**`GET /api/apks/package/:package`**  
  - **Descripción**: Devuelve una APK específica según su package (`package`).  
  - **Respuesta**: JSON con los datos de la APK solicitada.  

**`POST /api/apks/search`**  
  - **Descripción**: Permite realizar consultas personalizadas sobre las APKs mediante un objeto de opciones.  
  - **Body**: JSON con las opciones de consulta (`filtro`, `orden`, `campos`, `limite`, `skip`).  
  - **Respuesta**: JSON con los datos de las APKs que cumplen con los criterios de búsqueda.  

### 📂 **Rutas para gestionar TPLs**
Módulo: `metadata/tpls_api`

**`GET /api/tpls/:id`**  
  - **Descripción**: Devuelve una TPL específica según su identificador único (`id`).  
  - **Respuesta**: JSON con los datos de la TPL solicitada.  

**`GET /api/tpls/package/:package`**  
  - **Descripción**: Devuelve una TPL específica según el nombre de su paquete (`package`).  
  - **Respuesta**: JSON con los datos de la TPL solicitada.  

### 📂 **Rutas para gestionar versions**
Módulo: `metadata/versions_api`

**`GET /api/versions/:id`**  
  - **Descripción**: Devuelve una versión específica según su identificador único (`id`).  
  - **Respuesta**: JSON con los datos de la versión solicitada.  

**`POST /api/versions/search`**  
  - **Descripción**: Permite realizar consultas personalizadas sobre las versiones mediante un objeto de opciones.  
  - **Body**: JSON con las opciones de consulta (`filtro`, `orden`, `campos`, `limite`, `skip`).  
  - **Respuesta**: JSON con los datos de las versiones que cumplen con los criterios de búsqueda.  
 
---

## 📄 Documentación de la API.
La documentación generada automáticamente se encuentra en la carpeta `docs`. La documentación de las rutas se encuentra en `docs/swagger` y la de los módulos de lógica de negocio se encuentran en `docs/jsdoc`.

Para poder acceder a ellas, se debe abrir cualquiera de sus archivos `.html` en un navegador. 

Una versión estéticamente más atractiva de la documentación Swagger-JSDoc de las rutas se encuentra en `/api-docs/`.