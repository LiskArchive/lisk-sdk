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

const path = require('path');
const repl = require('repl');
const fs = require('fs');
const Promise = require('bluebird');
require('../../../../test/mocha/setup');
const application = require('../../../../test/mocha/common/application');

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
		let originalEval;
		let replServer;

		function replEvalPromise(cmd, ctx, filename, cb) {
			originalEval.call(
				replServer,
				cmd,
				ctx,
				filename,
				(replEvalPromiseErr, res) => {
					Promise.resolve(res).then(response => cb(null, response));
				}
			);
		}

		replServer = repl.start({
			prompt: `lisk-core [${scope.config.db.database}] > `,
		});
		originalEval = replServer.eval;
		replServer.eval = replEvalPromise;
		replServer.context.config = scope.config;
		replServer.context.modules = scope.modules;
		replServer.context.logic = scope.logic;
		replServer.context.storage = scope.storage;
		const helpers = {};

		const helpersFolder = './helpers/';
		fs.readdirSync(helpersFolder).forEach(file => {
			const filePath = path.resolve(helpersFolder, file);
			const fileName = path.basename(filePath, '.js');
			// eslint-disable-next-line import/no-dynamic-require
			helpers[fileName] = require(filePath);
		});

		replServer.context.helpers = helpers;

		// A dummy callback method to be utilized in repl
		replServer.context.cb = function(replServerErr, data) {
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
