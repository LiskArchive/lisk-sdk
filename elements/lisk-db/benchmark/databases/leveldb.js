/*
 * Copyright © 2020 Lisk Foundation
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

const path = require('path');
const fs = require('fs');
const levelup = require('levelup');
const leveldown = require('leveldown');

const createDb = (name, location = (process.env.DB_PATH = '/tmp')) => {
	const filePath = `${location}/leveldb/${name}`;
	fs.mkdirSync(filePath, { recursive: true });
	const parentDir = path.resolve(path.join(filePath, '../'));
	if (!fs.existsSync(parentDir)) {
		throw new Error(`${parentDir} does not exist`);
	}
	const db = levelup(leveldown(location));
	return db;
};

const closeDb = (db, name, location = (process.env.DB_PATH = '/tmp')) => {
	const filePath = `${location}/leveldb/${name}`;
	db.close();
	fs.rmdirSync(filePath, { recursive: true });
};

module.exports = {
	createDb: createDb,
	closeDb: closeDb,
};
