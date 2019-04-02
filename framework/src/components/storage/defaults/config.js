const defaultConfig = {
	type: 'object',
	properties: {
		host: {
			type: 'string',
			default: 'localhost',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 5432,
		},
		database: {
			type: 'string',
			default: '',
		},
		user: {
			type: 'string',
			default: 'lisk',
		},
		password: {
			type: 'string',
			default: 'password',
		},
		min: {
			type: 'integer',
			default: 10,
		},
		max: {
			type: 'integer',
			default: 95,
		},
		poolIdleTimeout: {
			type: 'integer',
			default: 30000,
		},
		reapIntervalMillis: {
			type: 'integer',
			default: 1000,
		},
		logEvents: {
			type: 'array',
			items: {
				type: 'string',
			},
			default: ['error'],
		},
		logFileName: {
			type: 'string',
			default: 'logs/lisk_db.log',
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
};

module.exports = defaultConfig;
