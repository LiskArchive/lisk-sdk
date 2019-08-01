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
		enabled: {
			type: 'boolean',
			env: 'LISK_CACHE_ENABLED',
		},
		host: {
			type: 'string',
			format: 'ipOrFQDN',
			env: 'LISK_REDIS_HOST',
			arg: '--redis,-r',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			env: 'LISK_REDIS_PORT',
		},
		db: {
			type: 'integer',
			minimum: 0,
			maximum: 15,
			env: 'LISK_REDIS_DB_NAME',
		},
		password: {
			type: ['string', 'null'],
			env: 'LISK_REDIS_DB_PASSWORD',
		},
	},
	required: ['enabled', 'host', 'port', 'db', 'password'],
	default: {
		enabled: false,
		host: '127.0.0.1',
		port: 6380,
		db: 0,
		password: null,
	},
};

module.exports = defaultConfig;
