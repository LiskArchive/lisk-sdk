const defaultConfig = {
	type: 'object',
	properties: {
		enabled: {
			type: 'boolean',
			default: false,
		},
		host: {
			type: 'string',
			format: 'ipOrFQDN',
			default: '127.0.0.1',
		},
		port: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			default: 6380,
		},
		db: {
			type: 'integer',
			minimum: 0,
			maximum: 15,
			default: 0,
		},
		password: {
			type: ['string', 'null'],
			default: null,
		},
	},
	required: ['enabled', 'host', 'port', 'db', 'password'],
};

module.exports = defaultConfig;
