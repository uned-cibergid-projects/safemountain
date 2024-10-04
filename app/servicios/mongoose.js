'use strict'
const debug = require('debug')('ciber:cargarBD');
const mongoose = require('mongoose');

const config = require('../config')[process.env.NODE_ENV ||'desarrollo']

if (!config.MONGO.user && !config.MONGO.pass) {
	var db_addr = 'mongodb://' + config.MONGO.host + ':'+config.MONGO.port+'/' + config.MONGO.db
	debug('db_addr= ', db_addr)
} else {
	var db_addr = 'mongodb://' + config.MONGO.user + ':' + config.MONGO.pass + '@' + config.MONGO.host + ':'+config.MONGO.port+ '/' + config.MONGO.db
}
let cargarBd = function() {
	// mongoose 4.13
	// Promesas nativas ES6
	mongoose.Promise = global.Promise;	
	// { useMongoClient: true }
	// .connect() crea un grupo de conexiones que se mantienen abiertas (poolSize por defecto 5)
	// cambios versión 5.22
	// useCreateIndex, userNewUrlParser, useFindAndModify
	// const db = mongoose.connect(db_addr,{useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true, useFindAndModify: false}, function (err) {

	// Fin cambio mongoose 4.13
	// cambio 6.0.0
	// mongoose.set('strictQuery', true);
	// const db = mongoose.connect(db_addr,{useNewUrlParser: true, useUnifiedTopology: true, authSource: "admin"}, function (err) {
	// 	if (err) {
	// 		console.trace('Mongoose connection')
	// 		console.error(err.stack)
	// 		process.exit(1)
	// 	}
	// })
	// require('./modelos');	
	// return db

	// versión 7
	// mongoose.connect("mongodb+srv://:@cluster0.igegl4n.mongodb.net/?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true } )
	mongoose.set('strictQuery', false);
	mongoose.connect(db_addr,{authSource: "admin"})
		.then((res) => {
			console.log('Connected Successfully')
			require('./modelos');	
			return res
		
		})
	
		.catch((err) => { console.error(err); });

}
module.exports = {
	cargarBd: cargarBd
}