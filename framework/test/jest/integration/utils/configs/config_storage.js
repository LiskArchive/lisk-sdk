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

const storageConfig = (database, user, password) => ({
	host: 'localhost',
	port: 5432,
	database,
	user: user || 'lisk',
	password: password || 'password',
	min: 10,
	max: 95,
	poolIdleTimeout: 30000,
	reapIntervalMillis: 1000,
	logEvents: ['error'],
	logFileName: 'logs/lisk_db.log',
});

module.exports = {
	storageConfig,
};
