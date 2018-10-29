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
const Promise = require('bluebird');
const monitor = require('pg-monitor');
const pgpLib = require('pg-promise');
const QueryFile = require('pg-promise').QueryFile;
const BaseAdapter = require('./base_adapter');

const initOptions = {
	capSQL: true,
	promiseLib: Promise,

	// Extending the database protocol with our custom repositories;
	// API: http://vitaly-t.github.io/pg-promise/global.html#event:extend
	extend: (/* object */) => {
		// Object.keys(repos).forEach(repoName => {
		// 	object[repoName] = new repos[repoName](object, pgp);
		// });
	},
	receive: (/* data, result, e */) => {
		// Can log result.duration when available and/or necessary,
		// to analyze performance of individual queries;
		// API: http://vitaly-t.github.io/pg-promise/global.html#event:receive
	},
};

const resultCountToMethodMap = {
	0: 'none',
	1: 'one',
	3: 'any',
	[undefined]: 'any',
};

class PgpAdapter extends BaseAdapter {
	/**
	 *
	 * @param {Object} options
	 * @param {Boolean} options.inTest
	 * @param {String} options.logger
	 * @param {String} options.sqlDirectory
	 */
	constructor(options) {
		super({
			engineName: 'pgp',
			inTest: options.inTest,
		});

		this.options = options;
		this.logger = options.logger;

		this.sqlDirectory = options.sqlDirectory;

		const pgpOptions = Object.assign({}, initOptions, {
			// Prevent protocol locking, so we can redefine database properties in test environment
			noLocking: options.inTest,
		});

		this.pgp = pgpLib(pgpOptions);
		this.db = null;
	}

	/**
	 * @return {Promise}
	 */
	connect() {
		const self = this;

		if (monitor.isAttached()) {
			monitor.detach();
		}

		const options = {
			error: (error, e) => {
				console.error(error);
				self.logger.error(error);

				// e.cn corresponds to an object, which exists only when there is a connection related error.
				// https://vitaly-t.github.io/pg-promise/global.html#event:error
				if (e.cn) {
					process.emit('cleanup', new Error('DB Connection Error'));
				}
			},
			log: (msg, info) => {
				self.logger.log(info.event, info.text);
				console.info(info.event, info.text);
				info.display = false;
			},
		};

		monitor.attach(Object.assign(initOptions, options), self.options.logEvents);
		monitor.setTheme('matrix');

		self.options.user = self.options.user || process.env.USER;

		// Hack for now to mimic the connect event
		self.db = self.pgp(self.options);
		return Promise.delay(3000, true);
	}

	disconnect() {
		this.logger.info('Disconnecting');
		if (monitor.isAttached()) {
			monitor.detach();
		}
	}

	/**
	 * Execute an SQL file
	 *
	 * @param {String} file
	 * @param {Object} params
	 * @param {Object} options
	 * @param {Number} options.expectedResult
	 * @return {*}
	 */
	executeFile(file, params = {}, options = {}) {
		return this.db[resultCountToMethodMap[options.expectedResult]](
			file,
			params
		);
	}

	/**
	 * Execute an SQL file
	 *
	 * @param {String} file
	 * @param {Object} params
	 * @param {Object} options
	 * @param {Number} options.expectedResult
	 * @return {*}
	 */
	execute(sql, params = {}, options = {}) {
		return this.db[resultCountToMethodMap[options.expectedResult]](sql, params);
	}

	loadSQLFile(filePath) {
		const fullPath = path.join(this.sqlDirectory, filePath); // Generating full path;

		const options = {
			minify: true, // Minifies the SQL
		};

		const qf = new QueryFile(fullPath, options);

		if (qf.error) {
			console.error(qf.error); // Something is wrong with our query file
			process.exit(1); // Exit the process with fatal error
		}

		return qf;
	}

	parseQueryComponent(query, params) {
		return this.pgp.as.format(query, params);
	}
}

module.exports = PgpAdapter;
