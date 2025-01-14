/** 
 * @module servicios/modelos/appCollector
 * 
 * @description Schemas y modelos de APKs, TPLs y versions.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

const apks = mongoose.model('apks', apkSchema)
const tpls = mongoose.model('tpls', tplSchema)
const versions = mongoose.model('versions', versionSchema); 

const colecciones = {
	apks: {
		modelo: apks
	},
	tpls: {
		modelo: tpls
	},
	versions: {
	  	modelo: versions
	}
};

module.exports = { colecciones };