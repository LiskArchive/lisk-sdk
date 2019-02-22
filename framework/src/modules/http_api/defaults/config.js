const DefaultConfig = {
	type: 'object',
	properties: {
		httpPort: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 4000,
		},
		address: {
			type: 'string',
			format: 'ip',
			default: '0.0.0.0',
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
				},
				whiteList: {
					type: 'array',
					default: ['127.0.0.1'],
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
				},
			},
			required: ['limits', 'cors'],
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
	],
};

module.exports = DefaultConfig;
