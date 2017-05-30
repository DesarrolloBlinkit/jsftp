/**
 * http://usejsdoc.org/
 */
const Router = require('electron-router');
var JSFtp = require("jsftp");
var log = require('electron-log');
const fs = require('fs');
var Ftp;
var router = Router('MAIN');
function conexionFTP(){
}
/**Funcion conecta -> conecta al FTP con el usuario y pass recogidos
 * Devuelve un callback con true si todo ha ido bien o false si ha habido error*/
conexionFTP.prototype.conecta = function(usuario, password, callback){
	var host = require("./datosServer.json")["host"];
	Ftp = new JSFtp({
		  host: host,
		  port: 21, // defaults to 21 
		});
	Ftp.auth(usuario, password, function(err, res) {
		if(err){
			callback( false );
		}
		else{
			callback( true );			
		}
	});
	
	Ftp.on('error', function (exc) {		
		if(!exc.toString().includes("ECONNRESET")){
			log.error("ERROR en FTP ", exc);				
			router.send("cerrarFTP", "errorGrave");
			router.clean();
		}
		
	});
	
	Ftp.on('timeout', function () {
		log.error("TIMEOUT en FTP ");
		router.send("errorIntentarOtraVez");
	});
};
/**Recoge la lista de ficheros de la carpeta FTP y lo envia todo en un callback*/
conexionFTP.prototype.listaFicheros = function(ruta, callback){
	Ftp.ls(ruta, function(err, res) {
		callback(res);		
	});
	
};
/**Sube un fichero en la ruta seleccionada*/
conexionFTP.prototype.subeFicheroSoloRuta = function(rutaDestino, callback){
	Ftp.put(new Buffer(10), rutaDestino, function(hadError) {
		if (!hadError){
			callback(false);
		}
			
		else{
			callback(true);
		}
			
	});
};
/**Sube un fichero en la ruta seleccionada desde la ruta elegida*/
conexionFTP.prototype.subeFichero = function(rutaOrigen, rutaDestino, callback){
	Ftp.put(rutaOrigen, rutaDestino, function(hadError) {
		if (!hadError){
			callback(false);
		}			
		else{
			log.error("subeFichero" ,hadError.toString());
			/*ECONNREFUSED es un error que deja el programa bloqueado por culpa del FTP
			 * y no hay mas, asi que mostramos una pantalla de bloqueo y le decimos que se esta 
			 * cerrando el programa*/
			router.send("cerrarFTP", "errorGrave");
			router.clean();
			Ftp.raw("abort")
		}
	});
};
/**Comprueba si existe el fichero seleccionado*/ 
conexionFTP.prototype.existeFichero = function(ruta, callback){
	Ftp.get(ruta, function(err, socket){
		if (err){
			callback(false);
		} 
		else{
			socket.resume();
			callback(true);
		}
	});
};
/**Descarga el fichero seleccionado*/
conexionFTP.prototype.descargaFichero = function(rutaOrigen, rutaDestino, callback){
	Ftp.get(rutaOrigen, function(err, socket) {
		if (err){
			log.error("Descargando fichero",rutaOrigen, err)
			callback(false);
			return;
		}
		var data=new Buffer('');
		socket.on("data", function(d) {
			if (data===undefined){ 
				data = d;
			}
			else{
				data = Buffer.concat([data, d ]);
			}

		});
		socket.on("close", function(hadErr) {
			if (hadErr){
				callback(false);
				log.error('There was an error retrieving the file.', rutaOrigen);
			}
			else{
				fs.writeFile(rutaDestino,data, function(err) {
					if(err) {
						callback(err);
					}
					else{
						callback("OK");
					}		    	    
				}); 
			}
		});
		socket.resume();
	});
};
/**Elimina fichero*/ 
conexionFTP.prototype.eliminaFichero = function(ruta, callback){
	Ftp.raw("dele",ruta, function(err, data) {
		if (err)
			callback(false);
		else
			callback(true);
	});
};
/**Nueva carpeta en la ruta indicada*/
conexionFTP.prototype.nuevaCarpeta = function(ruta, callback){
	Ftp.raw("mkd", ruta, function(err, data) {
		if (err)
			callback(false);
		else
			callback(true);
	});
};
/**Desconecta*/
conexionFTP.prototype.desconecta = function(callback){
	Ftp.raw("quit", function(err, data) {
	    if (err)
	    	log.error(err);
	    else
	    	callback(true);
	});
}
module.exports = conexionFTP;
