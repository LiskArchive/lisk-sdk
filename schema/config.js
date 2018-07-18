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

module.exports = {
	config: {
		id: 'appCon',
		type: 'object',
		properties: {
			wsPort: {
				type: 'integer',
				minimum: 1,
				maximum: 65535,
			},
			httpPort: {
				type: 'integer',
				minimum: 1,
				maximum: 65535,
			},
			address: {
				type: 'string',
				format: 'ip',
			},
			fileLogLevel: {
				type: 'string',
			},
			logFileName: {
				type: 'string',
			},
			consoleLogLevel: {
				type: 'string',
			},
			trustProxy: {
				type: 'boolean',
			},
			topAccounts: {
				type: 'boolean',
			},
			cacheEnabled: {
				type: 'boolean',
			},
			db: {
				type: 'object',
				properties: {
					host: {
						type: 'string',
					},
					port: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
					database: {
						type: 'string',
					},
					user: {
						type: 'string',
					},
					password: {
						type: 'string',
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
			},
			redis: {
				type: 'object',
				properties: {
					host: {
						type: 'string',
						format: 'ipOrFQDN',
					},
					port: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
					db: {
						type: 'integer',
						minimum: 0,
						maximum: 15,
					},
					password: {
						type: ['string', 'null'],
					},
				},
				required: ['host', 'port', 'db', 'password'],
			},
			api: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean',
					},
					access: {
						type: 'object',
						properties: {
							public: {
								type: 'boolean',
							},
							whiteList: {
								type: 'array',
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
								},
								required: ['max', 'delayMs', 'delayAfter', 'windowMs'],
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
				},
				required: ['enabled', 'access', 'ssl', 'options'],
			},
			peers: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean',
					},
					list: {
						type: 'array',
					},
					access: {
						type: 'object',
						properties: {
							blackList: {
								type: 'array',
							},
						},
						required: ['blackList'],
					},
					options: {
						properties: {
							timeout: {
								type: 'integer',
							},
							broadhashConsensusCalculationInterval: {
								type: 'integer',
							},
							wsEngine: {
								type: 'string',
							},
						},
						required: ['timeout'],
					},
				},
				required: ['enabled', 'list', 'access', 'options'],
			},
			broadcasts: {
				type: 'object',
				properties: {
					active: {
						type: 'boolean',
					},
					broadcastInterval: {
						type: 'integer',
						minimum: 1000,
						maximum: 60000,
					},
					broadcastLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100,
					},
					parallelLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100,
					},
					releaseLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 25,
					},
					relayLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100,
					},
				},
				required: [
					'broadcastInterval',
					'broadcastLimit',
					'parallelLimit',
					'releaseLimit',
					'relayLimit',
				],
			},
			transactions: {
				type: 'object',
				maxTransactionsPerQueue: {
					type: 'integer',
					minimum: 100,
					maximum: 5000,
				},
				required: ['maxTransactionsPerQueue'],
			},
			forging: {
				type: 'object',
				properties: {
					force: {
						type: 'boolean',
					},
					defaultPassword: {
						type: 'string',
					},
					delegates: {
						type: 'array',
						items: {
							properties: {
								encryptedPassphrase: {
									type: 'string',
									format: 'encryptedPassphrase',
								},
								publicKey: {
									type: 'string',
									format: 'publicKey',
								},
							},
						},
					},
					access: {
						type: 'object',
						properties: {
							whiteList: {
								type: 'array',
							},
						},
						required: ['whiteList'],
					},
				},
				required: ['force', 'delegates', 'access'],
			},
			loading: {
				type: 'object',
				properties: {
					loadPerIteration: {
						type: 'integer',
						minimum: 1,
						maximum: 5000,
					},
				},
				required: ['loadPerIteration'],
			},
		},
		required: [
			'wsPort',
			'httpPort',
			'address',
			'fileLogLevel',
			'logFileName',
			'consoleLogLevel',
			'trustProxy',
			'topAccounts',
			'db',
			'api',
			'peers',
			'broadcasts',
			'transactions',
			'forging',
			'loading',
			'cacheEnabled',
			'redis',
		],
	},
};
