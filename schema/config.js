'use strict';

module.exports = {
	config: {
		id: 'appCon',
		type: 'object',
		properties: {
			port: {
				type: 'integer',
				minimum: 1,
				maximum: 65535
			},
			address: {
				type: 'string',
				format: 'ip'
			},
			version: {
				type: 'string',
				format: 'version',
				minLength: 5,
				maxLength: 12
			},
			minVersion: {
				type: 'string'
			},
			fileLogLevel: {
				type: 'string'
			},
			logFileName: {
				type: 'string'
			},
			consoleLogLevel: {
				type: 'string'
			},
			trustProxy: {
				type: 'boolean'
			},
			topAccounts: {
				type: 'boolean'
			},
			cacheEnabled: {
				type: 'boolean'
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
						maximum: 65535
					},
					database: {
						type: 'string'
					},
					user: {
						type: 'string'
					},
					password: {
						type: 'string'
					},
					poolSize: {
						type: 'integer'
					},
					poolIdleTimeout: {
						type: 'integer'
					},
					reapIntervalMillis: {
						type: 'integer'
					},
					logEvents: {
						type: 'array'
					}
				},
				required: ['host', 'port', 'database', 'user', 'password', 'poolSize', 'poolIdleTimeout', 'reapIntervalMillis', 'logEvents']
			},
			redis: {
				type: 'object',
				properties: {
					host: {
						type: 'string',
						format: 'ip',
					},
					port: {
						type: 'integer',
						minimum: 1,
						maximum: 65535
					},
					db: {
						type: 'integer',
						minimum: 0,
						maximum: 15
					},
					password: {
						type: ['string', 'null']
					}
				},
				required: ['host', 'port', 'db', 'password']
			},
			api: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean'
					},
					access: {
						type: 'object',
						properties: {
							public: {
								type: 'boolean'
							},
							whiteList: {
								type: 'array'
							}
						},
						required: ['public', 'whiteList']
					},
					options: {
						type: 'object',
						properties: {
							limits: {
								type: 'object',
								properties: {
									max: {
										type: 'integer'
									},
									delayMs: {
										type: 'integer'
									},
									delayAfter: {
										type: 'integer'
									},
									windowMs: {
										type: 'integer'
									}
								},
								required: ['max', 'delayMs', 'delayAfter', 'windowMs']
							}
						},
						required: ['limits']
					}
				},
				required: ['enabled', 'access', 'options']
			},
			peers: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean'
					},
					list: {
						type: 'array'
					},
					access: {
						type: 'object',
						properties: {
							blackList: {
								type: 'array'
							}
						},
						required: ['blackList']
					},
					options: {
						properties: {
							limits: {
								type: 'object',
								properties: {
									max: {
										type: 'integer'
									},
									delayMs: {
										type: 'integer'
									},
									delayAfter: {
										type: 'integer'
									},
									windowMs: {
										type: 'integer'
									}
								},
								required: ['max', 'delayMs', 'delayAfter', 'windowMs']
							},
							timeout: {
								type: 'integer'
							}
						},
						required: ['limits', 'timeout']
					}
				},
				required: ['enabled', 'list', 'access', 'options']
			},
			broadcasts: {
				type: 'object',
				properties: {
					broadcastInterval: {
						type: 'integer',
						minimum: 1000,
						maximum: 60000
					},
					broadcastLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100
					},
					parallelLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100
					},
					releaseLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 25
					},
					relayLimit: {
						type: 'integer',
						minimum: 1,
						maximum: 100
					}
				},
				required: ['broadcastInterval', 'broadcastLimit', 'parallelLimit', 'releaseLimit', 'relayLimit']
			},
			transactions: {
				type: 'object',
				maxTxsPerQueue: {
					type: 'integer',
					minimum: 100,
					maximum: 5000
				},
				required: ['maxTxsPerQueue']
			},
			forging: {
				type: 'object',
				properties: {
					force: {
						type: 'boolean'
					},
					secret: {
						type: 'array'
					},
					access: {
						type: 'object',
						properties: {
							whiteList: {
								type: 'array'
							}
						},
						required: ['whiteList']
					}
				},
				required: ['force', 'secret', 'access']
			},
			loading: {
				type: 'object',
				properties: {
					verifyOnLoading: {
						type: 'boolean'
					},
					loadPerIteration: {
						type: 'integer',
						minimum: 1,
						maximum: 5000
					}
				},
				required: ['verifyOnLoading', 'loadPerIteration']
			},
			ssl: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean'
					},
					options: {
						type: 'object',
						properties: {
							port: {
								type: 'integer'
							},
							address: {
								type: 'string',
								format: 'ip',
							},
							key: {
								type: 'string'
							},
							cert: {
								type: 'string'
							}
						},
						required: ['port', 'address', 'key', 'cert']
					}
				},
				required: ['enabled', 'options']
			},
			dapp: {
				type: 'object',
				properties: {
					masterrequired: {
						type: 'boolean'
					},
					masterpassword: {
						type: 'string'
					},
					autoexec: {
						type: 'array'
					}
				},
				required: ['masterrequired', 'masterpassword', 'autoexec']
			},
			nethash: {
				type: 'string',
				format: 'hex'
			}
		},
		required: ['port', 'address', 'version', 'minVersion', 'fileLogLevel', 'logFileName', 'consoleLogLevel', 'trustProxy', 'topAccounts', 'db', 'api', 'peers', 'broadcasts', 'transactions', 'forging', 'loading', 'ssl', 'dapp', 'nethash', 'cacheEnabled', 'redis']
	}
};
