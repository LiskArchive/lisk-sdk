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
			arg: '-r,--redis',
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
