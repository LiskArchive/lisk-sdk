const defaultConfig = {
	type: 'object',
	properties: {
		wsPort: {
			type: 'integer',
			minimum: 1,
			maximum: 65535,
			env: 'LISK_WS_PORT',
			arg: '--port,-p',
		},
		address: {
			type: 'string',
			format: 'ip',
			env: 'LISK_ADDRESS',
			arg: '--address,-a',
		},
		seedPeers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					ip: {
						type: 'string',
						format: 'ipOrFQDN',
					},
					wsPort: {
						type: 'integer',
						minimum: 1,
						maximum: 65535,
					},
				},
			},
			env: { variable: 'LISK_PEERS', formatter: 'stringToIpPortSet' },
			arg: { name: '--peers,-x', formatter: 'stringToIpPortSet' }, // TODO: Need to confirm parsing logic, old logic was using network WSPort to be default port for peers, we don't have it at the time of compilation
		},
		discoveryInterval: {
			type: 'integer',
		},
		blacklistedPeers: {
			type: 'array',
			items: {
				type: 'string',
				format: 'ip',
			},
		},
		wsEngine: {
			type: 'string',
		},
		connectTimeout: {
			type: 'integer',
		},
		ackTimeout: {
			type: 'integer',
		},
	},
	required: ['wsPort', 'seedPeers'],
	default: {
		wsPort: 5000,
		address: '0.0.0.0',
		discoveryInterval: 30000,
		seedPeers: [],
		blacklistedPeers: [],
		ackTimeout: 20000,
		connectTimeout: 5000,
		wsEngine: 'ws',
	},
};

module.exports = defaultConfig;
