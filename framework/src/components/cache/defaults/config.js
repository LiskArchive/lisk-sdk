const defaultConfig = {
	type: 'object',
	properties: {
		enabled: {
			type: 'boolean',
			default: false,
			env: 'LISK_CACHE_ENABLED',
		},
		host: {
			type: 'string',
			format: 'ipOrFQDN',
			default: '127.0.0.1',
			env: 'LISK_REDIS_HOST',
			arg: '-r,--redis',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 6380,
			env: 'LISK_REDIS_PORT',
		},
		db: {
			type: 'integer',
			minimum: 0,
			maximum: 15,
			default: 0,
			env: 'LISK_REDIS_DB_NAME',
		},
		password: {
			type: ['string', 'null'],
			default: null,
			env: 'LISK_REDIS_DB_PASSWORD',
		},
	},
	required: ['enabled', 'host', 'port', 'db', 'password'],
};

module.exports = defaultConfig;
