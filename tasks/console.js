'use strict';

var repl = require('repl');
var fs = require('fs');
var path = require('path');
var node = require('../test/node');

node.initApplication(function (err, scope) {
	var logger = scope.logger;

	var replServer = repl.start({
		prompt: 'lisk-core [' + scope.config.db.database + '] > ',
	});

	replServer.context.config = scope.config;
	replServer.context.modules = scope.modules;
	replServer.context.logic = scope.logic;

	var helpers = {};

	var helpersFolder = './helpers/';
	fs.readdirSync(helpersFolder).forEach(function (file) {
		var filePath = path.resolve(helpersFolder, file);
		var fileName = path.basename(filePath, '.js');
		helpers[fileName] = require(filePath);
	});

	replServer.context.helpers = helpers;

	// A dummy callback method to be utilized in repl
	replServer.context.cb = function (err, data) {
		logger.log(data);
	};
}, {});
