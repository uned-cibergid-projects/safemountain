/**
 * @interface modcrud/prueba_model
 * @description
 * descripcion*
*/

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const pruebaSchema = new Schema(
	{ 
		// codEstudios: String,
		// estudios: String,
		// nivelEstudios: String,
		// codigo: String,
		// nombre: String,
		// funciones:[String],
		// docentes:{type:[]},
		// otros:{type:[]},
		// tutores:{type:[]},
		// estado:{
		// 	usuarios: {type:Boolean, default:false},
		// 	fecha: { type: Date, default: Date.now}
		// }
	},
	{
		strict:false,
		versionKey:false,	
		timestamps: {
			createdAt: 'f_creacion',
			updatedAt: 'f_modificacion'
		}
	}
);

  

// pruebaSchema.index({codigo: 1}, {unique: true});

const Prueba = mongoose.model('Prueba', pruebaSchema)

const tablas = {
	Prueba: {
		modelo: Prueba
	}
};

module.exports = { tablas };