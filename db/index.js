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

const monitor = require('pg-monitor');
const repos = require('require-all')(`${__dirname}/repos`);
const Promise = require('bluebird');

// TODO: Had to change it from 'const' into 'let' because of the nasty 'rewire' hacks inside DBSandbox.js.
// eslint-disable-next-line prefer-const
let initOptions = {
	pgNative: true,
	capSQL: true,
	promiseLib: Promise,

	// Extending the database protocol with our custom repositories;
	// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
	extend: object => {
		Object.keys(repos).forEach(repoName => {
			object[repoName] = new repos[repoName](object, pgp);
		});
	},
};

const pgp = require('pg-promise')(initOptions);

/**
 * Connects to the database
 * @requires pg-promise
 * @requires pg-monitor
 * @function connect
 * @param {Object} config
 * @param {function} logger
 * @return {Promise<pg-promise.Database>}
 */
module.exports.connect = (config, logger) => {
	try {
		monitor.detach();
	} catch (ex) {
		logger.log('database connect exception - ', ex);
	}

	monitor.attach(initOptions, config.logEvents);
	monitor.setTheme('matrix');

	monitor.log = (msg, info) => {
		logger.log(info.event, info.text);
		info.display = false;
	};

	config.user = config.user || process.env.USER;

	pgp.end();

	const db = pgp(config);

	return db.migrations.applyAll().then(() => db);
};

/**
 * Detaches pg-monitor. Should be invoked after connect.
 * @param {Object} logger
 */
module.exports.disconnect = logger => {
	logger = logger || console;
	try {
		monitor.detach();
	} catch (ex) {
		logger.log('database disconnect exception - ', ex);
	}
};
