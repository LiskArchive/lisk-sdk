const DefaultConfig = {
	type: 'object',
	properties: {
		version: {
			type: 'string',
			format: 'version',
		},
		minVersion: {
			type: 'string',
			format: 'version',
		},
		protocolVersion: {
			type: 'string',
			format: 'protocolVersion',
		},
		blackListedPeers: {
			type: 'array',
			items: {
				type: 'string',
				format: 'ipOrFQDN',
			},
		},
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
		nethash: {
			type: 'string',
			format: 'hex',
		},
		nonce: {
			type: 'string',
		},
	},
	required: ['version', 'minVersion', 'protocolVersion'],
};

module.exports = DefaultConfig;
