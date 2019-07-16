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
 *
 */

'use strict';

const {
	adapters: { PgpAdapter },
} = require('../../../../src/components/storage');

const startDatabase = async (database, host, port, user, password) => {
	const db = new PgpAdapter({
		inTest: true,
		host: host || 'localhost',
		port: port || 5432,
		user: user || 'lisk',
		password: password || 'password',
		logger: {
			debug: jest.fn(),
		},
	});
	await db.connect();
	await db.execute(`DROP DATABASE ${database}`);
	await db.execute(`CREATE DATABASE ${database}`);
	return db;
};

const closeDatabase = async (db, database) => {
	await db.execute(`DROP DATABASE ${database}`);
	await db.disconnect();
};

const resetTable = async (db, tableName) => {
	await db.execute(`DELETE FROM ${tableName}`);
};

const resetTables = async (db, tableNames) => {
	await Promise.all(
		tableNames.map(tableName => db.execute(`DELETE FROM ${tableName}`))
	);
};

module.exports = {
	startDatabase,
	closeDatabase,
	resetTable,
	resetTables,
};
