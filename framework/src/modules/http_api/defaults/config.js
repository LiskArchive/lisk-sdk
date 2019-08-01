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
		httpPort: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			env: 'LISK_HTTP_PORT',
			arg: '--http-port,-h',
		},
		address: {
			type: 'string',
			format: 'ip',
			env: 'LISK_ADDRESS',
			arg: '--address,-a',
		},
		trustProxy: {
			type: 'boolean',
		},
		enabled: {
			type: 'boolean',
		},
		access: {
			type: 'object',
			properties: {
				public: {
					type: 'boolean',
					env: 'LISK_API_PUBLIC',
				},
				whiteList: {
					type: 'array',
					env: {
						variable: 'LISK_API_WHITELIST',
						formatter: 'stringToIpPortSet',
					},
				},
			},
			required: ['public', 'whiteList'],
		},
		ssl: {
			type: 'object',
			properties: {
				enabled: {
					type: 'boolean',
				},
				options: {
					type: 'object',
					properties: {
						port: {
							type: 'integer',
						},
						address: {
							type: 'string',
							format: 'ip',
						},
						key: {
							type: 'string',
						},
						cert: {
							type: 'string',
						},
					},
					required: ['port', 'address', 'key', 'cert'],
				},
			},
			required: ['enabled', 'options'],
		},
		options: {
			type: 'object',
			properties: {
				limits: {
					type: 'object',
					properties: {
						max: {
							type: 'integer',
						},
						delayMs: {
							type: 'integer',
						},
						delayAfter: {
							type: 'integer',
						},
						windowMs: {
							type: 'integer',
						},
						headersTimeout: {
							type: 'integer',
							minimum: 1,
							maximum: 40000,
						},
						serverSetTimeout: {
							type: 'integer',
							minimum: 1,
							maximum: 120000,
						},
					},
					required: [
						'max',
						'delayMs',
						'delayAfter',
						'windowMs',
						'headersTimeout',
						'serverSetTimeout',
					],
				},
				cors: {
					type: 'object',
					properties: {
						origin: {
							anyOf: [{ type: 'string' }, { type: 'boolean' }],
						},
						methods: {
							type: 'array',
						},
					},
					required: ['origin'],
				},
			},
			required: ['limits', 'cors'],
		},
		forging: {
			type: 'object',
			properties: {
				access: {
					type: 'object',
					properties: {
						whiteList: {
							type: 'array',
							env: {
								variable: 'LISK_FORGING_WHITELIST',
								formatter: 'stringToIpPortSet',
							},
						},
					},
					required: ['whiteList'],
				},
			},
			required: ['access'],
		},
	},
	required: [
		'httpPort',
		'address',
		'trustProxy',
		'enabled',
		'access',
		'ssl',
		'options',
		'forging',
	],
	default: {
		enabled: true,
		httpPort: 4000,
		address: '0.0.0.0',
		trustProxy: false,
		access: {
			public: false,
			whiteList: ['127.0.0.1'],
		},
		ssl: {
			enabled: false,
			options: {
				port: 443,
				address: '0.0.0.0',
				key: './ssl/lisk.key',
				cert: './ssl/lisk.crt',
			},
		},
		options: {
			limits: {
				max: 0,
				delayMs: 0,
				delayAfter: 0,
				windowMs: 60000,
				headersTimeout: 5000,
				serverSetTimeout: 20000,
			},
			cors: {
				origin: '*',
				methods: ['GET', 'POST', 'PUT'],
			},
		},
		forging: {
			access: {
				whiteList: ['127.0.0.1'],
			},
		},
	},
};

module.exports = defaultConfig;
