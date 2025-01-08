const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const apkSchema  = new Schema(
	{
		_id: { $oid: String, required: true, unique: true },
		name: { type: String, required: true, unique: true },
		package: { type: String, required: true },
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

const tplSchema  = new Schema(
	{
		_id: { $oid: String, required: true, unique: true },
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

const versionSchema  = new Schema(
	{
		_id: { $oid: String, required: true, unique: true },
		parentId: { $oid: String, required: true },
		type: { type: String, required: true },
		versionCode: { type: String, required: true },
		downloadUrl: { type: String, required: true },
	}, { collection: 'versions' }
);

const apks = mongoose.model('apks', apkSchema)
const tpls = mongoose.model('tpls', tplSchema)
const versions = mongoose.model('versions', versionSchema); 

const tablas = {
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

module.exports = { tablas };