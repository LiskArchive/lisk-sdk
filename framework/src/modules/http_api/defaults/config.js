const defaultConfig = {
	type: 'object',
	properties: {
		httpPort: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 4000,
			env: 'LISK_HTTP_PORT',
			arg: '-h,--http-port',
		},
		address: {
			type: 'string',
			format: 'ip',
			default: '0.0.0.0',
			env: 'LISK_ADDRESS',
			arg: '-a,--address',
		},
		trustProxy: {
			type: 'boolean',
			default: false,
		},
		enabled: {
			type: 'boolean',
			default: true,
		},
		access: {
			type: 'object',
			properties: {
				public: {
					type: 'boolean',
					default: false,
					env: 'LISK_API_PUBLIC',
				},
				whiteList: {
					type: 'array',
					default: ['127.0.0.1'],
					env: ['LISK_API_WHITELIST', 'stringToIpPortSet'],
				},
			},
			required: ['public', 'whiteList'],
		},
		ssl: {
			type: 'object',
			properties: {
				enabled: {
					type: 'boolean',
					default: false,
				},
				options: {
					type: 'object',
					properties: {
						port: {
							type: 'integer',
							default: 443,
						},
						address: {
							type: 'string',
							format: 'ip',
							default: '0.0.0.0',
						},
						key: {
							type: 'string',
							default: './ssl/lisk.key',
						},
						cert: {
							type: 'string',
							default: './ssl/lisk.crt',
						},
					},
					required: ['port', 'address', 'key', 'cert'],
					default: {
						port: 443,
						address: '0.0.0.0',
						key: './ssl/lisk.key',
						cert: './ssl/lisk.crt',
					},
				},
			},
			required: ['enabled', 'options'],
			default: {
				enabled: false,
				options: {
					port: 443,
					address: '0.0.0.0',
					key: './ssl/lisk.key',
					cert: './ssl/lisk.crt',
				},
			},
		},
		options: {
			type: 'object',
			properties: {
				limits: {
					type: 'object',
					properties: {
						max: {
							type: 'integer',
							default: 0,
						},
						delayMs: {
							type: 'integer',
							default: 0,
						},
						delayAfter: {
							type: 'integer',
							default: 0,
						},
						windowMs: {
							type: 'integer',
							default: 60000,
						},
						headersTimeout: {
							type: 'integer',
							minimum: 1,
							maximum: 40000,
							default: 5000,
						},
						serverSetTimeout: {
							type: 'integer',
							minimum: 1,
							maximum: 120000,
							default: 20000,
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
					default: {
						max: 0,
						delayMs: 0,
						delayAfter: 0,
						windowMs: 60000,
						headersTimeout: 5000,
						serverSetTimeout: 20000,
					},
				},
				cors: {
					type: 'object',
					properties: {
						origin: {
							anyOf: [{ type: 'string' }, { type: 'boolean' }],
							default: '*',
						},
						methods: {
							type: 'array',
							default: ['GET', 'POST', 'PUT'],
						},
					},
					required: ['origin'],
					default: {
						origin: '*',
						methods: ['GET', 'POST', 'PUT'],
					},
				},
			},
			required: ['limits', 'cors'],
			default: {
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
		},
		forging: {
			type: 'object',
			properties: {
				access: {
					type: 'object',
					properties: {
						whiteList: {
							type: 'array',
							default: ['127.0.0.1'],
							env: ['LISK_FORGING_WHITELIST', 'stringToIpPortSet'],
						},
					},
					required: ['whiteList'],
					default: {
						whiteList: ['127.0.0.1'],
					},
				},
			},
			required: ['access'],
			default: {
				access: {
					whiteList: ['127.0.0.1'],
				},
			},
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
		httpPort: 4000,
		address: '0.0.0.0',
		trustProxy: false,
		enabled: true,
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
