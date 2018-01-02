'use strict';

var repl = require('repl');
var fs = require('fs');
var path = require('path');

// Created this before in global scope as its dependency of test/node.js
if(typeof before !== 'function') {
	global.before = function before (description, cb) {
		cb = typeof description === 'function' ? description : cb;
		cb();
	};
}

var application = require('../test/common/application.js');

application.init({}, function (err, scope) {

	var replServer = repl.start({
		prompt: 'lisk-core [' + scope.config.db.database + '] > ',
	});

	replServer.context.config = scope.config;
	replServer.context.modules = scope.modules;
	replServer.context.logic = scope.logic;
	replServer.context.db = scope.db;

	var helpers = {};

	var helpersFolder = './helpers/';
	fs.readdirSync(helpersFolder).forEach(function (file) {
		var filePath = path.resolve(helpersFolder, file);
		var fileName = path.basename(filePath, '.js');
		helpers[fileName] = require(filePath);
	});

	replServer.context.helpers = helpers;

	// A dummy callback method to be utilized in repl
	// e.g. modules.accounts.shared.getAccount({body: {}}, cb)
	replServer.context.cb = function (err, data) {
		// Make sure cab response showed in terminal
		console.log(data);
	};

	replServer.on('exit', function () {
		console.log('Goodbye! See you later.');
		process.exit();
	});

}, {});


/**
 * Event reporting an uncaughtException.
 * @event uncaughtException
 */
/**
 * Receives a 'uncaughtException' signal and emits a cleanup.
 * @listens uncaughtException
 */
process.on('uncaughtException', function (err) {
	// Handle error safely
	console.log('System error', { message: err.message, stack: err.stack });
	/**
	 * emits cleanup once 'uncaughtException'.
	 * @emits cleanup
	 */
	process.emit('cleanup');
});

/**
* Event reporting an unhandledRejection.
* @event unhandledRejection
*/
/**
 * Receives a 'unhandledRejection' signal and emits a cleanup.
 * @listens unhandledRejection
 */
process.on('unhandledRejection', function (reason, p) {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
