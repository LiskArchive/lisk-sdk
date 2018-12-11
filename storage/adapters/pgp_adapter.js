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
	 * @param {string} options.logger
	 * @param {string} options.sqlDirectory
	 */
	constructor(options) {
		super({
			engineName: 'pgp',
			inTest: options.inTest,
		});

		this.options = options;
		this.logger = options.logger;
		this.sqlDirectory = options.sqlDirectory;

		this.pgpOptions = {
			capSQL: true,
			promiseLib: Promise,
			noLocking: options.inTest,
			connect: () => {
				this.emit(this.EVENT_CONNECT);
			},
			error: () => {
				this.emit(this.EVENT_ERROR);
			},
			disconnect: () => {
				this.emit(this.EVENT_DISCONNECT);
			},
		};

		this.pgp = pgpLib(this.pgpOptions);
		this.db = undefined;
	}

	/**
	 * @return {Promise}
	 */
	connect() {
		if (monitor.isAttached()) {
			monitor.detach();
		}

		const monitorOptions = {
			error: (error, e) => {
				this.logger.error(error);

				// e.cn corresponds to an object, which exists only when there is a connection related error.
				// https://vitaly-t.github.io/pg-promise/global.html#event:error
				if (e.cn) {
					process.emit('cleanup', new Error('DB Connection Error'));
				}
			},
		};
		monitor.attach(
			{ ...this.pgpOptions, ...monitorOptions },
			this.options.logEvents
		);
		monitor.setLog((msg, info) => {
			this.logger.log(info.event, info.text);
			info.display = false;
		});
		monitor.setTheme('matrix');

		this.options.user = this.options.user || process.env.USER;

		this.pgp.end();
		this.db = this.pgp(this.options);

		// As of the nature of pg-promise the connection is acquired either a query is started to execute.
		// So to actually verify the connection works fine
		// based on the provided options, we need to test it by acquiring
		// the connection a manually

		let connectionObject = null;

		return this.db
			.connect()
			.then(co => {
				connectionObject = co;
				return Promise.resolve(true);
			})
			.finally(() => {
				if (connectionObject) {
					connectionObject.done();
				}
				return Promise.resolve(true);
			});
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
	 * @param {string} file
	 * @param {Object} params
	 * @param {Object} options
	 * @param {Number} [options.expectedResult]
	 * @param {Object} tx
	 * @return {*}
	 */
	executeFile(file, params = {}, options = {}, tx) {
		return (tx || this.db)[resultCountToMethodMap[options.expectedResult]](
			file,
			params
		);
	}

	/**
	 * Execute an SQL file
	 *
	 * @param {string} sql
	 * @param {Object} params
	 * @param {Object} options
	 * @param {Number} [options.expectedResult]
	 * @param {Object} tx
	 * @return {*}
	 */
	execute(sql, params = {}, options = {}, tx) {
		return (tx || this.db)[resultCountToMethodMap[options.expectedResult]](
			sql,
			params
		);
	}

	transaction(name, cb, tx) {
		return (tx || this.db).tx(name, cb);
	}

	task(name, cb, tx) {
		return (tx || this.db).task(name, cb);
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
