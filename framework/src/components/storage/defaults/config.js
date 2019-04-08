const defaultConfig = {
	type: 'object',
	properties: {
		host: {
			type: 'string',
			default: 'localhost',
			env: 'LISK_DB_HOST',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 5432,
			env: 'LISK_DB_PORT',
		},
		database: {
			type: 'string',
			default: '',
			env: 'LISK_DB_NAME',
			arg: '-d,--database',
		},
		user: {
			type: 'string',
			default: 'lisk',
			env: 'LISK_DB_USER',
		},
		password: {
			type: 'string',
			default: 'password',
			env: 'LISK_DB_PASSWORD',
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
