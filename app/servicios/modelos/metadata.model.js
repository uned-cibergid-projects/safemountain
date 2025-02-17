/** 
 * @module servicios/modelos/metadata
 * 
 * @description Schemas y modelos de APKs, TPLs y versions.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { metadataConnection } = require('../mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Apk:
 *       type: object
 *       required:
 *         - name
 *         - package
 *         - googlePlayUrl
 *       properties:
 *         name:
 *           type: string
 *           description: "Nombre de la APK. Debe ser único."
 *           example: "facebook"
 *         package:
 *           type: string
 *           description: "Nombre del package de la APK. Debe ser único."
 *           example: "com.facebook.katana"
 *         category:
 *           type: string
 *           description: "Categoría de la APK."
 *           example: "social"
 *         adSupported:
 *           type: boolean
 *           description: "¿La APK tiene soporte para anuncios?"
 *           example: true
 *         containsAds:
 *           type: boolean
 *           description: "¿La APK contiene anuncios?"
 *           example: true
 *         contentRating:
 *           type: string
 *           description: "Clasificación por edades de la APK."
 *           example: "Teen"
 *         contentRatingDescription:
 *           type: string
 *           description: "Descriptores de contenido que justifican la clasificación por edades."
 *           example: "Sexual Themes, Use of Alcohol and Tobacco, Crude Humor"
 *         currency:
 *           type: string
 *           description: "Moneda en la que se mide el precio."
 *           example: "USD"
 *         description:
 *           type: string
 *           description: "Descripción de la APK que proporciona el desarrollador."
 *           example: "SOON A SPECIAL PACKAGE with dogs & cats of pure breed 🐕..."
 *         developer:
 *           type: string
 *           description: "Nombre del desarrollador."
 *           example: "SiA - Smileys, Stickers, animated GIF & Emoji apps"
 *         developerEmail:
 *           type: string
 *           description: "Correo electrónico del desarrollador."
 *           example: "contact@shareitagain.co"
 *         developerWebsiteUrl:
 *           type: string
 *           description: "URL de la website del desarrollador."
 *           example: "http://www.shareitagain.co"
 *         free:
 *           type: boolean
 *           description: "¿Es la aplicación gratuita?"
 *           example: true
 *         genre:
 *           type: string
 *           description: "Representación textual del género de la APK."
 *           example: "Social"
 *         genreId:
 *           type: string
 *           description: "Identificador técnico del género de la APK."
 *           example: "SOCIAL"
 *         googlePlayUrl:
 *           type: string
 *           description: "URL de la APK en Google Play Store. Debe ser único."
 *           example: "https://play.google.com/store/apps/details?id=com.shareitagain.whatslov.app"
 *         headerImageUrl:
 *           type: string
 *           description: "URL de la imagen de encabezado de la APK en Google Play Store."
 *           example: "https://play-lh.googleusercontent.com/AGg78f1klDEreGDeNe3DP8E.jpg"
 *         histogram:
 *           type: array
 *           items:
 *             type: number
 *           description: "Array con las valoraciones de la APK realizadas por los usuarios."
 *           example: [6031, 2295, 8326, 23236, 173204]
 *         iconUrl:
 *           type: string
 *           description: "URL del icono de la APK."
 *           example: "https://play-lh.googleusercontent.com/4Yztq1UUIj.jpg"
 *         installs:
 *           type: string
 *           description: "Cantidad aproximada de instalaciones de la aplicación."
 *           example: "10,000,000+"
 *         price:
 *           type: number
 *           description: "Precio de la aplicación en la moneda descrita por el campo 'currency'."
 *           example: 0
 *         privacyPolicyUrl:
 *           type: string
 *           description: "URL de las políticas de privacidad de la APK."
 *           example: "http://shareitagain.co/privacy_policy_whatslov.html"
 *         ratings:
 *           type: number
 *           description: "Cantidad de valoraciones de la APK realizadas por los usuarios."
 *           example: 213147
 *         realInstalls:
 *           type: number
 *           description: "Cantidad total de instalaciones de la aplicación."
 *           example: 30461386
 *         released:
 *           type: string
 *           description: "Fecha en la que se publicó originalmente la APK en la Google Play Store."
 *           example: "Feb 1, 2015"
 *         reviews:
 *           type: number
 *           description: "Cantidad de reseñas realizadas por los usuarios de la APK en la Google Play Store."
 *           example: 2814
 *         score:
 *           type: number
 *           description: "Valoración media de la APK."
 *           example: 4.666944
 *         screenshotsUrls:
 *           type: array
 *           items:
 *             type: string
 *           description: "Array con las URLs de las capturas de pantalla de la APK."
 *           example:
 *             - "https://play-lh.googleusercontent.com/tuf8ngR5jd.jpg"
 *             - "https://play-lh.googleusercontent.com/lLz1-9Bf9CH.jpg"
 *         title:
 *           type: string
 *           description: "Título de la APK en Google Play Store."
 *           example: "WhatsLov Stickers (WASticker)"
 *         videoImageUrl:
 *           type: string
 *           description: "URL de la foto miniatura del video trailer de la APK en la Google Play Store."
 *           example: "https://play-lh.googleusercontent.com/CgUPurtUp8.jpg"
 *         videoUrl:
 *           type: string
 *           description: "URL del vídeo trailer de la APK en la Google Play Store."
 *           example: "https://www.youtube.com/embed/7wbnqYRz6jE"
 */
/**
 * @description Schema Mongoose para las APKs.
 * 
 * @typedef {Object} apkSchema
 * @property {string} name - Nombre de la APK. Debe ser único.
 * @property {string} package - Nombre del package de la APK. Debe ser único.
 * @property {string} [category] - Categoría de la APK.
 * @property {boolean} [adSupported] - ¿La APK tiene soporte para anuncios?
 * @property {boolean} [containsAds] - ¿La APK tiene contiene anuncios?
 * @property {string} [contentRating] - Clasificación por edades de la APK.
 * @property {string} [contentRatingDescription] - Descriptores de contenido que justifican la clasificación por edades.
 * @property {string} [currency] - Moneda en la que se mide el precio.
 * @property {string} [description] - Descripción de la APK que proporciona el desarrollador.
 * @property {string} [developer] - Nombre del desarrollador.
 * @property {string} [developerEmail] - Correo electrónico del desarrollador.
 * @property {string} [developerWebsiteUrl] - URL de la website del desarrollador.
 * @property {boolean} [free] - ¿Es la aplicación gratuita?
 * @property {string} [genre] - Representación textual del género de la APK.
 * @property {string} [genreId] - Identificador técnico del género de la APK.
 * @property {string} googlePlayUrl - URL de la APK en Google Play Store. Debe ser único.
 * @property {string} [headerImageUrl] - URL de la imagen de encabezado de la APK en Google Play Store.
 * @property {number[]} [histogram] - Array con las valoraciones de la APK realizadas por los usuarios. 
 * @property {string} [iconUrl] - URL del icon de la APK.
 * @property {string} [installs] - Cantidad aproximada de instalaciones de la aplicación.
 * @property {number} [price] - Precio de la aplicación en la moneda descrita por el campo "currency".
 * @property {string} [privacyPolicyUrl] - URL de las políticas de privacidad de la APK.
 * @property {number} [ratings] - Cantidad de valoraciones de la APK realizadas por los usuarios.
 * @property {number} [realInstalls] - Cantidad total de instalaciones de la aplicación.
 * @property {string} [released] - Fecha en la que se publicó originalmente la APK en la Google Play Store.
 * @property {number} [reviews] - Cantidad de reseñas realizadas por los usuarios de la APK en la Google Play Store. 
 * @property {number} [score] - Valoración media de la APK.
 * @property {string[]} [screenshotsUrls] - Array con las URLs de las capturas de pantalla de la APK.
 * @property {string} [title] - Título de la APK en Google Play Store.
 * @property {string} [videoImageUrl] - URL de la foto miniatura del video trailer de la APK en la Google Play Store.
 * @property {string} [videoUrl] - URL del vídeo trailer de la APK en la Google Play Store.
 */
const apkSchema  = new Schema(
	{
		name: { type: String, required: true, unique: true },
		package: { type: String, required: true, unique: true },
		category: String,
		adSupported: Boolean,
		containsAds: Boolean,
		contentRating: String,
		contentRatingDescription: String,
		currency: String,
		description: String,
		developer: String,
		developerEmail: String,
		developerWebsiteUrl: String,
		free: Boolean,
		genre: String,
		genreId: String,
		googlePlayUrl: { type: String, unique: true },
		headerImageUrl: String,
		histogram: [Number],
		iconUrl: String,
		installs: String,
		price: Number,
		privacyPolicyUrl: String,
		ratings: Number,
		realInstalls: Number,
		released: String,
		reviews: Number,
		score: Number,
		screenshotsUrls: [String],
		title: String,
		videoImageUrl: String,
		videoUrl: String,
	}, { collection: 'apks' }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Tpl:
 *       type: object
 *       required:
 *         - name
 *         - package
 *       properties:
 *         name:
 *           type: string
 *           description: "Nombre de la TPL."
 *           example: "costello"
 *         package:
 *           type: string
 *           description: "Nombre del package de la TPL. Debe ser único."
 *           example: "abbot"
 *         continuousIntegrationUrl:
 *           type: string
 *           description: "URL al panel de flujos de trabajo del repositorio."
 *           example: "https://github.com/Salmon-Brain/dead-salmon-brain/actions/workflows/publish.yml"
 *         description:
 *           type: string
 *           description: "Descripción de la TPL que proporciona el desarrollador."
 *           example: "Apache Spark based framework for analysis A/B experiments"
 *         issueTrackerUrl:
 *           type: string
 *           description: "URL al sistema de seguimiento de problemas del repositorio."
 *           example: "https://github.com/Salmon-Brain/dead-salmon-brain/issues"
 *         lastTimeChecked:
 *           type: string
 *           description: "Fecha de la última comprobación de la TPL en formato 'YYYYMMDD'."
 *           example: "20241108"
 *         licenses:
 *           type: array
 *           items:
 *             type: string
 *           description: "Array con las licencias bajo las que se publicó la TPL."
 *           example: ["Apache License 2.0"]
 *         ossindexVulnerabilities:
 *           type: string
 *           description: "Identificación de vulnerabilidades a través de OSS Index."
 *           example: "No vulnerabilities"
 *         pomFile:
 *           type: string
 *           description: "Archivo pom.xml de la TPL."
 *           example: "<project><modelVersion>4.0.0</modelVersion>...<artifactId>acegi-security-resin-lib</artifactId><version>0.6.1</version></project>"
 *         projectUrl:
 *           type: string
 *           description: "URL a la página web del proyecto."
 *           example: "http://abbot.sf.net/"
 *         published:
 *           type: string
 *           description: "Fecha en la que se publicó originalmente la TPL."
 *           example: "9 years ago"
 *         size:
 *           type: string
 *           description: "Peso de la TPL."
 *           example: "12.3 kB"
 *         sourceControlUrl:
 *           type: string
 *           description: "URL al repositorio con el código fuente de la TPL."
 *           example: "http://sourceforge.net/p/abbot/svn/HEAD/tree/abbot/trunk/"
 */
/**
 * @description Schema Mongoose para las TPLs.
 * 
 * @typedef {Object} tplSchema
 * @property {string} name - Nombre de la TPL. 
 * @property {string} package - Nombre del package de la TPL. Debe ser único.
 * @property {string} [continuousIntegrationUrl] - URL al panel de flujos de trabajo del repositorio.
 * @property {string} [description] - Descripción de la TPL que proporciona el desarrollador.
 * @property {string} [issueTrackerUrl] - URL al sistema de seguimiento de problemas del repositorio.
 * @property {string} [lastTimeChecked] - Fecha de la última comprobación de la TPL en formato "%Y%m%d".
 * @property {string[]} [licenses] - Array con las licencias bajo las que se publicó la TPL.
 * @property {string} [ossindexVulnerabilities] - Identificación de vulnerabilidades a través de OSS Index.
 * @property {string} [pomFile] - Archivo pom.xml de la TPL.
 * @property {string} [projectUrl] - URL a la página web del proyecto.
 * @property {string} [published] - Fecha en la que se publicó originalmente la TPL.
 * @property {string} [size] - Peso de la TPL.
 * @property {string} [sourceControlUrl] - URL al repositorio con el código fuente de la TPL.
 */
const tplSchema  = new Schema(
	{
		name: { type: String, required: true},
		package: { type: String, required: true, unique: true },
		continuousIntegrationUrl: String,
		descripcion: String,
		issueTrackerUrl: String,
		lastTimeChecked: String,
		licenses: [String],
		ossindexVulnerabilities: String,
		pomFile: String,
		projectUrl: String,
		published: String,
		size: String,
		sourceControlUrl: String,
	}, { collection: 'tpls' }
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Version:
 *       type: object
 *       required:
 *         - parentId
 *         - type
 *         - versionCode
 *       properties:
 *         parentId:
 *           type: string
 *           description: "Identificador único del padre de la versión."
 *           example: "65f7c4a0e1a4c72d28f2c6a5"
 *         type:
 *           type: string
 *           enum: [apk, tpl]
 *           description: "Tipo del padre: apk | tpl."
 *           example: "apk"
 *         versionCode:
 *           type: string
 *           description: "Código de la versión de la release."
 *           example: "1.0.3"
 *         downloadUrl:
 *           type: string
 *           description: "Dirección de descarga de la versión. Exclusivo de versiones de TPLs."
 *           example: "https://repo.maven.apache.org/maven2/HTTPClient/HTTPClient/0.3-3/HTTPClient-0.3-3.jar"
 *         releaseDate:
 *           type: string
 *           description: "Fecha de lanzamiento de la versión en formato 'MMM DD, YYYY'. Exclusivo de versiones de APKs."
 *           example: "Sep 15, 2024"
 */
/**
 * @description Schema Mongoose para las versions.
 * 
 * @typedef {Object} versionSchema
 * @property {string} parentId - Identificador único del padre de la version.
 * @property {string} type - Tipo del padre: apk | tpl.
 * @property {string} versionCode - Código de la version de la release.
 * @property {string} [downloadUrl] - Dirección de descarga de la version. Exclusivo de versions de TPLs.
 * @property {string} [releaseDate] - Fecha de lanzamiento de la version en formato "MMM DD, YYYY". Exclusivo de versions de APKs.
 */
const versionSchema  = new Schema(
	{
		parentId: { type: String, required: true },
		type: { type: String, required: true },
		versionCode: { type: String, required: true },
		downloadUrl: String,
		releaseDate: String
	}, { collection: 'versions' }
);

const apks = metadataConnection().model('apks', apkSchema)
const tpls = metadataConnection().model('tpls', tplSchema)
const versions = metadataConnection().model('versions', versionSchema); 

module.exports = { apks, tpls, versions };