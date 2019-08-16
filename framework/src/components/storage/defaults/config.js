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

const defaultConfig = {
	type: 'object',
	properties: {
		host: {
			type: 'string',
			env: 'LISK_DB_HOST',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			env: 'LISK_DB_PORT',
		},
		database: {
			type: 'string',
			env: 'LISK_DB_NAME',
			arg: '--database,-d',
		},
		user: {
			type: 'string',
			env: 'LISK_DB_USER',
		},
		password: {
			type: 'string',
			env: 'LISK_DB_PASSWORD',
		},
		min: {
			type: 'integer',
		},
		max: {
			type: 'integer',
		},
		poolIdleTimeout: {
			type: 'integer',
		},
		reapIntervalMillis: {
			type: 'integer',
		},
		logEvents: {
			type: 'array',
			items: {
				type: 'string',
			},
		},
		logFileName: {
			type: 'string',
		},
	},
	required: [
		'host',
		'port',
		'database',
		'user',
		'password',
		'min',
		'max',
		'poolIdleTimeout',
		'reapIntervalMillis',
		'logEvents',
	],
	default: {
		host: 'localhost',
		port: 5432,
		database: 'lisk_dev',
		user: 'lisk',
		password: 'password',
		min: 10,
		max: 25,
		poolIdleTimeout: 30000,
		reapIntervalMillis: 1000,
		logEvents: ['error'],
		logFileName: 'logs/lisk_db.log',
	},
};

module.exports = defaultConfig;
