/**
 * @interface modcrud/prueba_model
 * @description
 * descripcion*
*/

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const apkSchema  = new Schema(
	{
		name: String,
	  }, { collection: 'apks' }
);


const versionSchema  = new Schema(
	{
		name: String,
	  }, { collection: 'versions' }
);

  

// pruebaSchema.index({codigo: 1}, {unique: true});

const apks = mongoose.model('apks', apkSchema )
const versions = mongoose.model('versions', versionSchema); 


const tablas = {
	apks: {
		modelo: apks
	},
	versions: {
	  	modelo: versions
	}
};

module.exports = { tablas };