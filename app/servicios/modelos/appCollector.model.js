/**
 * @interface modcrud/prueba_model
 * @description
 * descripcion*
*/

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const apkSchema  = new Schema(
	{
		package: String,
	  }, { collection: 'apks' }
);

const tplSchema  = new Schema(
	{
		package: String,
	  }, { collection: 'tpls' }
);


const versionSchema  = new Schema(
	{
		package: String,
	  }, { collection: 'versions' }
);

  

// pruebaSchema.index({codigo: 1}, {unique: true});

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