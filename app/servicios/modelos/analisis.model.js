/**
 * @module servicios/modelos/analisis
 *
 * @description Schema y modelo para almacenar el resultado del análisis de una APK o TPL,
 *              incluyendo certificados, permisos, análisis de malware, binario, manifest, etc.
 */

const mongoose = require('mongoose')

const { Schema } = mongoose
const { analisisConnection } = require('../mongoose')

/**
 * @swagger
 * components:
 *   schemas:
 *     Estatico:
 *       type: object
 *       required:
 *         - file_name
 *         - app_name
 *         - app_type
 *         - size
 *         - md5
 *         - sha1
 *         - sha256
 *         - package_name
 *       properties:
 *         file_name:
 *           type: string
 *           description: "Nombre del archivo APK o TPL."
 *           example: "instagram-lite.apk"
 *         app_name:
 *           type: string
 *           description: "Nombre de la aplicación."
 *           example: "Instagram Lite"
 *         app_type:
 *           type: string
 *           description: "Tipo de la aplicación: apk o tpl."
 *           example: "apk"
 *         size:
 *           type: string
 *           description: "Tamaño aproximado del archivo."
 *           example: "2.8MB"
 *         md5:
 *           type: string
 *           description: "Hash MD5 del archivo."
 *           example: "6b143cd6ead16d6a22f46c9a90c2ddb4"
 *         sha1:
 *           type: string
 *           description: "Hash SHA1 del archivo."
 *           example: "1c2245e0c9b55f9706d2b3c936083d07"
 *         sha256:
 *           type: string
 *           description: "Hash SHA256 del archivo."
 *           example: "6b143cd6ead16d6a22f46c9a90c2ddb4945744eed641fda9eca82a97cccaa8a9"
 *         package_name:
 *           type: string
 *           description: "Package name principal de la aplicación."
 *           example: "com.instagram.lite"
 *         main_activity:
 *           type: string
 *           description: "Actividad principal registrada en el AndroidManifest."
 *           example: "com.facebook.lite.MainActivity"
 *         exported_activities:
 *           type: array
 *           description: "Listado de las Activities exportadas (android:exported=true)."
 *           items:
 *             type: string
 *           example:
 *             - "com.facebook.lite.loginWithFacebook.wrapper.CustomTabActivity"
 *         browsable_activities:
 *           type: object
 *           description: "Detalle de Activities con intent-filters browsable (puerto, esquemas, paths, etc.)."
 *           additionalProperties: true
 *           example:
 *             com.facebook.lite.MainActivity:
 *               schemes:
 *                 - "http://"
 *                 - "https://"
 *               hosts:
 *                 - "instagram.com"
 *         activities:
 *           type: array
 *           description: "Listado total de activities definidas en la aplicación."
 *           items:
 *             type: string
 *           example:
 *             - "com.facebook.lite.MainActivity"
 *             - "com.facebook.lite.media.AlbumGalleryActivity"
 *         receivers:
 *           type: array
 *           description: "Listado de broadcast receivers."
 *           items:
 *             type: string
 *           example:
 *             - "com.facebook.lite.pretos.LiteAppComponentReceiver"
 *             - "com.facebook.lite.rtc.IncomingCallReceiver"
 *         providers:
 *           type: array
 *           description: "Listado de content providers."
 *           items:
 *             type: string
 *           example:
 *             - "com.facebook.lite.deviceid.FbLitePhoneIdProvider"
 *             - "com.facebook.secure.fileprovider.SecureFileProvider"
 *         services:
 *           type: array
 *           description: "Listado de servicios registrados."
 *           items:
 *             type: string
 *           example:
 *             - "com.facebook.lite.webviewrtc.RTCService"
 *             - "com.google.firebase.messaging.FirebaseMessagingService"
 *         libraries:
 *           type: array
 *           description: "Bibliotecas (native libs) declaradas o incluidas."
 *           items:
 *             type: string
 *           example:
 *             - "org.apache.http.legacy"
 *         target_sdk:
 *           type: string
 *           description: "SDK de destino."
 *           example: "34"
 *         max_sdk:
 *           type: string
 *           description: "SDK máxima soportada."
 *           example: ""
 *         min_sdk:
 *           type: string
 *           description: "SDK mínima requerida."
 *           example: "26"
 *         version_name:
 *           type: string
 *           description: "Versión textual declarada en el AndroidManifest."
 *           example: "429.0.0.15.106"
 *         version_code:
 *           type: string
 *           description: "Version code interno de la aplicación."
 *           example: "652459122"
 *         icon_path:
 *           type: string
 *           description: "Ruta o URL del ícono encontrado."
 *           example: "res/mipmap-xxxhdpi-v4/ic_launcher.png"
 *         certificate_analysis:
 *           type: object
 *           description: "Resultado del análisis de certificados (firma) de la aplicación."
 *           additionalProperties: true
 *         permissions:
 *           type: object
 *           description: "Listado de permisos y su nivel de peligrosidad (dangerous, normal, signature, etc.)."
 *           additionalProperties: true
 *         malware_permissions:
 *           type: object
 *           description: "Permisos maliciosos o abusados, clasificación de permisos."
 *           additionalProperties: true
 *         manifest_analysis:
 *           type: array
 *           description: "Listado de hallazgos relacionados al AndroidManifest (componentes exportados, etc.)."
 *           items:
 *             type: object
 *           example: []
 *         binary_analysis:
 *           type: array
 *           description: "Listado de hallazgos sobre las librerías nativas (NX, PIE, Canary, etc.)."
 *           items:
 *             type: object
 *           example: []
 *         file_analysis:
 *           type: array
 *           description: "Listado de hallazgos sobre archivos internos, layout, strings, etc."
 *           items:
 *             type: object
 *           example: []
 *         android_api:
 *           type: object
 *           description: "Clasificación de uso de APIs de Android en la app (Local File I/O, Reflection, etc.)."
 *           additionalProperties: true
 *         code_analysis:
 *           type: object
 *           description: "Hallazgos de análisis estático de código (logcat, MD5, SSL pinning, etc.)."
 *           additionalProperties: true
 *         niap_analysis:
 *           type: object
 *           description: "Evaluación de requisitos NIAP (National Information Assurance Partnership)."
 *           additionalProperties: true
 *         permission_mapping:
 *           type: object
 *           description: "Relación de permisos con el código (donde se usan)."
 *           additionalProperties: true
 *         urls:
 *           type: array
 *           description: "Listado de URLs detectadas dentro de la app."
 *           items:
 *             type: object
 *           example:
 *             - urls: ["http://www.android.com/"]
 *               path: "X/C07A.java"
 *         domains:
 *           type: object
 *           description: "Listado de dominios detectados dentro de la app."
 *           additionalProperties: true
 *         emails:
 *           type: array
 *           description: "Listado de emails encontrados dentro de la app."
 *           items:
 *             type: string
 *           example: []
 *         strings:
 *           type: object
 *           description: "Listado general de strings extraídos de la app, clasificados o no."
 *           additionalProperties: true
 *         firebase_urls:
 *           type: array
 *           description: "Detalles sobre el uso de Firebase (Remote Config, etc.)."
 *           items:
 *             type: object
 *           example: []
 *         playstore_details:
 *           type: object
 *           description: "Información recopilada vía Play Store (nombre, descripción, puntuación, etc.)."
 *           additionalProperties: true
 *         network_security:
 *           type: object
 *           description: "Hallazgos sobre la Network Security Configuration."
 *           additionalProperties: true
 *         secrets:
 *           type: array
 *           description: "Listados de posibles llaves, tokens o cadenas sensibles halladas."
 *           items:
 *             type: string
 *           example:
 *             - "AIzaSyD-123EjemPlo"
 *         sbom:
 *           type: object
 *           description: "Software Bill of Materials (listado de dependencias y sus versiones)."
 *           additionalProperties: true
 */

/**
 * @description Modelo Mongoose para los análisis estático (Estatico).
 * @typedef {Object} estaticoSchema
 * @property {string} file_name - Nombre del archivo APK o TPL.
 * @property {string} app_name - Nombre de la aplicación.
 * @property {string} app_type - Tipo de la aplicación (apk o tpl).
 * @property {string} size - Tamaño aproximado del archivo.
 * @property {string} md5 - Hash MD5 del archivo.
 * @property {string} sha1 - Hash SHA1 del archivo.
 * @property {string} sha256 - Hash SHA256 del archivo.
 * @property {string} package_name - Package name principal de la aplicación.
 * @property {string} [main_activity] - Actividad principal declarada.
 * @property {string[]} [exported_activities] - Lista de Activities exportadas.
 * @property {Mixed} [browsable_activities] - Información detallada de activities con browsable.
 * @property {string[]} [activities] - Lista total de Activities.
 * @property {string[]} [receivers] - Lista de Broadcast Receivers.
 * @property {string[]} [providers] - Lista de Content Providers.
 * @property {string[]} [services] - Lista de Servicios declarados.
 * @property {string[]} [libraries] - Lista de librerías nativas.
 * @property {string} [target_sdk] - SDK de destino.
 * @property {string} [max_sdk] - SDK máxima soportada.
 * @property {string} [min_sdk] - SDK mínima requerida.
 * @property {string} [version_name] - Versión textual del APK.
 * @property {string} [version_code] - Código interno de versión del APK.
 * @property {string} [icon_path] - Ruta o URL del ícono.
 * @property {Mixed} [certificate_analysis] - Resultado del análisis de certificados.
 * @property {Mixed} [permissions] - Permisos y nivel de peligrosidad.
 * @property {Mixed} [malware_permissions] - Información de permisos maliciosos/abusados.
 * @property {Mixed[]} [manifest_analysis] - Hallazgos del AndroidManifest.
 * @property {Mixed[]} [binary_analysis] - Hallazgos de librerías nativas.
 * @property {Mixed[]} [file_analysis] - Hallazgos sobre archivos internos.
 * @property {Mixed} [android_api] - Clasificación del uso de APIs de Android.
 * @property {Mixed} [code_analysis] - Hallazgos de análisis estático de código.
 * @property {Mixed} [niap_analysis] - Requisitos NIAP.
 * @property {Mixed} [permission_mapping] - Mapeo de permisos con el código.
 * @property {Mixed[]} [urls] - Listado de URLs detectadas.
 * @property {Mixed} [domains] - Listado de dominios.
 * @property {Mixed[]} [emails] - Listado de correos encontrados.
 * @property {Mixed} [strings] - Strings extraídos de la app.
 * @property {Mixed[]} [firebase_urls] - Detalles de Firebase.
 * @property {Mixed} [playstore_details] - Info de Play Store.
 * @property {Mixed} [network_security] - Hallazgos de network security config.
 * @property {string[]} [secrets] - Llaves/tokens hallados.
 * @property {Mixed} [sbom] - Software Bill of Materials.
 */
const estaticoSchema = new Schema(
  {
    file_name: { type: String, required: true },
    app_name: { type: String, required: true },
    app_type: { type: String, required: true },
    size: { type: String, required: true },
    md5: { type: String, required: true },
    sha1: { type: String, required: true },
    sha256: { type: String, required: true },
    package_name: { type: String, required: true },
    main_activity: String,
    exported_activities: [String],
    browsable_activities: { type: Schema.Types.Mixed },
    activities: [String],
    receivers: [String],
    providers: [String],
    services: [String],
    libraries: [String],
    target_sdk: String,
    max_sdk: String,
    min_sdk: String,
    version_name: String,
    version_code: String,
    icon_path: String,
    certificate_analysis: { type: Schema.Types.Mixed },
    permissions: { type: Schema.Types.Mixed },
    malware_permissions: { type: Schema.Types.Mixed },
    manifest_analysis: [Schema.Types.Mixed],
    binary_analysis: [Schema.Types.Mixed],
    file_analysis: [Schema.Types.Mixed],
    android_api: { type: Schema.Types.Mixed },
    code_analysis: { type: Schema.Types.Mixed },
    niap_analysis: { type: Schema.Types.Mixed },
    permission_mapping: { type: Schema.Types.Mixed },
    urls: [Schema.Types.Mixed],
    domains: { type: Schema.Types.Mixed },
    emails: [Schema.Types.Mixed],
    strings: { type: Schema.Types.Mixed },
    firebase_urls: [Schema.Types.Mixed],
    playstore_details: { type: Schema.Types.Mixed },
    network_security: { type: Schema.Types.Mixed },
    secrets: [String],
    sbom: { type: Schema.Types.Mixed }
  },
  {
    collection: 'estatico'
  }
)

const estatico = analisisConnection().model('estatico', estaticoSchema)

module.exports = {
  estatico
}
