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

/**
 * @namespace db
 * @property {module:db} db
 */

'use strict';

const Promise = require('bluebird');
const monitor = require('pg-monitor');
const pgpLib = require('pg-promise');
const repos = require('./repos');

const inTest = process.env.NODE_ENV === 'test';

Promise.config({
	longStackTraces: inTest, // Enable Long Stack Traces
});

// TODO: Had to change below from 'const' to 'let' because of the nasty 'rewire' hacks inside DBSandbox.js.
// eslint-disable-next-line prefer-const
let initOptions = {
	capSQL: true,
	promiseLib: Promise,

	// Extending the database protocol with our custom repositories;
	// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
	extend: object => {
		Object.keys(repos).forEach(repoName => {
			object[repoName] = new repos[repoName](object, pgp);
		});
	},
	receive: (/* data, result, e */) => {
		// Can log result.duration when available and/or necessary,
		// to analyze performance of individual queries;
		// API: http://vitaly-t.github.io/pg-promise/global.html#event:receive
	},
	// Prevent protocol locking, so we can redefine database properties in test environment
	noLocking: inTest,
};

const pgp = pgpLib(initOptions);

/**
 * @module db
 * @requires bluebird
 * @requires pg-monitor
 * @requires pg-promise
 * @requires db/repos/*
 * @see Parent: {@link db}
 */

/**
 * Initialized root of pg-promise library, to give access to its complete API.
 *
 * @property {Object} pgp
 */
module.exports.pgp = pgp;

/**
 * Connects to the database.
 *
 * @function connect
 * @param {Object} config
 * @param {Object} logger - logger for database log file
 * @returns {Promise}
 * @todo Add description for the params and the return value
 */
module.exports.connect = (config, logger) => {
	if (monitor.isAttached()) {
		monitor.detach();
	}

	const options = {
		error: (error, e) => {
			logger.error(error);

			// e.cn corresponds to an object, which exists only when there is a connection related error.
			// https://vitaly-t.github.io/pg-promise/global.html#event:error
			if (e.cn) {
				process.emit('cleanup', new Error('DB Connection Error'));
			}
		},
		log: (msg, info) => {
			logger.log(info.event, info.text);
			info.display = false;
		},
	};

	monitor.attach(Object.assign(initOptions, options), config.logEvents);
	monitor.setTheme('matrix');

	config.user = config.user || process.env.USER;

	pgp.end();

	const db = pgp(config);

	return db.migrations.applyAll().then(() => db);
};

/**
 * Detaches pg-monitor. Should be invoked after connect.
 *
 * @function disconnect
 * @param {Object} logger
 * @todo Add description for the params
 */
module.exports.disconnect = (/* logger */) => {
	if (monitor.isAttached()) {
		monitor.detach();
	}
};
