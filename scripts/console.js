/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var path = require('path');
var repl = require('repl');
var fs = require('fs');
require('../test/setup');
var application = require('../test/common/application.js');

// Created this before in global scope as its dependency of test/node.js
if (typeof before !== 'function') {
	global.before = function before(description, cb) {
		cb = typeof description === 'function' ? description : cb;
		cb();
	};
}

application.init(
	{},
	(err, scope) => {
		var replServer = repl.start({
			prompt: `lisk-core [${scope.config.db.database}] > `,
		});

		replServer.context.config = scope.config;
		replServer.context.modules = scope.modules;
		replServer.context.logic = scope.logic;
		replServer.context.db = scope.db;

		var helpers = {};

		var helpersFolder = './helpers/';
		fs.readdirSync(helpersFolder).forEach(file => {
			var filePath = path.resolve(helpersFolder, file);
			var fileName = path.basename(filePath, '.js');
			// eslint-disable-next-line import/no-dynamic-require
			helpers[fileName] = require(filePath);
		});

		replServer.context.helpers = helpers;

		// A dummy callback method to be utilized in repl
		// e.g. modules.accounts.shared.getAccount({body: {}}, cb)
		replServer.context.cb = function(err, data) {
			// Make sure cab response showed in terminal
			console.info(data);
		};

		replServer.on('exit', () => {
			console.info('Goodbye! See you later.');
			process.exit();
		});
	},
	{}
);

process.on('uncaughtException', err => {
	// Handle error safely
	console.error('System error', { message: err.message, stack: err.stack });
	process.emit('cleanup', err);
});

process.on('unhandledRejection', (reason, p) => {
	console.warn('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
