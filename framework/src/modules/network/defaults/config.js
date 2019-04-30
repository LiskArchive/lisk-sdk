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
		enabled: {
			type: 'boolean',
		},
		list: {
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
		access: {
			type: 'object',
			properties: {
				blackList: {
					type: 'array',
					items: {
						type: 'string',
						format: 'ip',
					},
				},
			},
			required: ['blackList'],
		},
		options: {
			properties: {
				timeout: {
					type: 'integer',
				},
				broadhashConsensusCalculationInterval: {
					type: 'integer',
				},
				wsEngine: {
					type: 'string',
				},
				httpHeadersTimeout: {
					type: 'integer',
				},
				httpServerSetTimeout: {
					type: 'integer',
				},
			},
			required: ['timeout'],
		},
	},
	required: ['enabled', 'list', 'access', 'options', 'wsPort', 'address'],
	default: {
		enabled: true,
		wsPort: 5000,
		address: '0.0.0.0',
		list: [],
		access: {
			blackList: [],
		},
		options: {
			timeout: 5000,
			broadhashConsensusCalculationInterval: 5000,
			wsEngine: 'ws',
			httpHeadersTimeout: 5000,
			httpServerSetTimeout: 20000,
		},
	},
};

module.exports = defaultConfig;
