/*
 * Copyright © 2019 Lisk Foundation
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
const { QueryFile } = require('pg-promise');
const BaseAdapter = require('./base_adapter');

const pgpOptions = {
	capSQL: true,
	promiseLib: Promise,
	noLocking: false,
};

const pgp = pgpLib(pgpOptions);

const _private = {
	queryFiles: {},
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

		this.pgp = pgp;
		this.db = undefined;
		this.SQLs = {};
	}

	/**
	 * @return {Promise}
	 */
	connect() {
		if (monitor.isAttached()) {
			monitor.detach();
		}

		pgpOptions.noLocking = this.inTest;
		const monitorOptions = {
			error: (error, e) => {
				this.emit(this.EVENT_ERROR);
				this.logger.error(error);

				// e.cn corresponds to an object, which exists only when there is a connection related error.
				// https://vitaly-t.github.io/pg-promise/global.html#event:error
				if (e.cn) {
					process.emit('cleanup', new Error('DB Connection Error'));
				}
			},
			connect: () => {
				this.emit(this.EVENT_CONNECT);
			},
			disconnect: () => {
				this.emit(this.EVENT_DISCONNECT);
			},
		};

		// Have to keep the same options object to make sure monitor works for the connection
		Object.assign(pgpOptions, monitorOptions);
		monitor.attach(pgpOptions, this.options.logEvents);
		monitor.setLog((msg, info) => {
			this.logger.debug(info.event, info.text);
			info.display = false;
		});
		monitor.setTheme('matrix');

		this.options.user = this.options.user || process.env.USER;

		this.db = pgp(this.options);

		// As of the nature of pg-promise the connection is acquired either a query is started to execute.
		// So to actually verify the connection works fine
		// based on the provided options, we need to test it by acquiring
		// the connection a manually

		let connectionObject = null;

		return this.db
			.connect()
			.then(co => {
				connectionObject = co;
				return true;
			})
			.finally(() => {
				if (connectionObject) {
					connectionObject.done();
				}
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
	 * @param {Number} [options.expectedResultCount]
	 * @param {Object} tx
	 * @return {*}
	 */
	executeFile(file, params = {}, options = {}, tx) {
		return this._getExecutionContext(tx, options.expectedResultCount)(
			file,
			params,
		);
	}

	/**
	 * Execute an SQL file
	 *
	 * @param {string} sql
	 * @param {Object} [params]
	 * @param {Object} [options]
	 * @param {Number} [options.expectedResultCount]
	 * @param {Object} [tx]
	 * @return {*}
	 */
	execute(sql, params = {}, options = {}, tx) {
		return this._getExecutionContext(tx, options.expectedResultCount)(
			sql,
			params,
		);
	}

	transaction(name, cb, tx) {
		return (tx || this.db).tx(name, cb);
	}

	task(name, cb, tx) {
		return (tx || this.db).task(name, cb);
	}

	loadSQLFile(filePath, sqlDirectory = this.sqlDirectory) {
		const fullPath = path.join(sqlDirectory, filePath); // Generating full path;

		if (_private.queryFiles[fullPath]) {
			return _private.queryFiles[fullPath];
		}

		const options = {
			minify: true, // Minifies the SQL
		};

		const qf = new QueryFile(fullPath, options);

		if (qf.error) {
			this.logger.error(qf.error); // Something is wrong with our query file
			throw qf.error; // throw pg-promisse QueryFileError error
		}

		_private.queryFiles[fullPath] = qf;

		return qf;
	}

	loadSQLFiles(entityLabel, sqlFiles, sqlDirectory) {
		this.SQLs[entityLabel] = this.SQLs[entityLabel] || {};
		Object.keys(sqlFiles).forEach(fileKey => {
			if (!this.SQLs[entityLabel][fileKey]) {
				this.SQLs[entityLabel][fileKey] = this.loadSQLFile(
					sqlFiles[fileKey],
					sqlDirectory,
				);
			}
		});
		return this.SQLs[entityLabel];
	}

	// eslint-disable-next-line class-methods-use-this
	parseQueryComponent(query, params) {
		return pgp.as.format(query, params);
	}

	_getExecutionContext(tx, expectedResultCount) {
		const count = Number(expectedResultCount);
		const context = tx || this.db;

		if (!Number.isInteger(count)) {
			return context.query;
		}

		switch (count) {
			case 0:
				return context.none;
			case 1:
				return context.one;
			default:
				return context.any;
		}
	}
}

module.exports = PgpAdapter;
