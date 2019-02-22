const DefaultConfig = {
	type: 'object',
	properties: {
		broadcasts: {
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					default: true,
				},
				broadcastInterval: {
					type: 'integer',
					minimum: 1000,
					maximum: 60000,
					default: 5000,
				},
				broadcastLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
					default: 25,
				},
				parallelLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
					default: 20,
				},
				releaseLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 25,
					default: 25,
				},
				relayLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
					default: 3,
				},
			},
			required: [
				'broadcastInterval',
				'broadcastLimit',
				'parallelLimit',
				'releaseLimit',
				'relayLimit',
			],
		},
		transactions: {
			type: 'object',
			maxTransactionsPerQueue: {
				type: 'integer',
				minimum: 100,
				maximum: 5000,
				default: 1000,
			},
			required: ['maxTransactionsPerQueue'],
		},
		forging: {
			type: 'object',
			properties: {
				force: {
					type: 'boolean',
					default: false,
				},
				defaultPassword: {
					type: 'string',
				},
				delegates: {
					type: 'array',
					default: [],
					items: {
						properties: {
							encryptedPassphrase: {
								type: 'string',
								format: 'encryptedPassphrase',
							},
							publicKey: {
								type: 'string',
								format: 'publicKey',
							},
						},
					},
				},
				access: {
					type: 'object',
					properties: {
						whiteList: {
							type: 'array',
							default: ['127.0.0.1'],
						},
					},
					required: ['whiteList'],
				},
			},
			required: ['force', 'delegates', 'access'],
		},
		syncing: {
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
					default: true,
				},
			},
			required: ['active'],
		},
		loading: {
			type: 'object',
			properties: {
				loadPerIteration: {
					type: 'integer',
					minimum: 1,
					maximum: 5000,
					default: 5000,
				},
			},
			required: ['loadPerIteration'],
		},
		network: {
			type: 'object',
			properties: {
				wsPort: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
					default: '5000',
				},
				address: {
					type: 'string',
					format: 'ip',
					default: '0.0.0.0',
				},
				enabled: {
					type: 'boolean',
					default: true,
				},
				list: {
					type: 'array',
					default: [
						{
							ip: 'testnet-seed-01.lisk.io',
							wsPort: 7001,
						},
						{
							ip: 'testnet-seed-02.lisk-nodes.net',
							wsPort: 7001,
						},
						{
							ip: 'testnet-seed-03.lisk.io',
							wsPort: 7001,
						},
						{
							ip: 'testnet-seed-04.lisk-nodes.net',
							wsPort: 7001,
						},
						{
							ip: 'testnet-seed-05.lisk.io',
							wsPort: 7001,
						},
					],
				},
				access: {
					type: 'object',
					properties: {
						blackList: {
							type: 'array',
							default: [],
						},
					},
					required: ['blackList'],
				},
				options: {
					properties: {
						timeout: {
							type: 'integer',
							default: 5000,
						},
						broadhashConsensusCalculationInterval: {
							type: 'integer',
							default: 5000,
						},
						wsEngine: {
							type: 'string',
							default: 'ws',
						},
					},
					required: ['timeout'],
				},
			},
			required: ['enabled', 'list', 'access', 'options', 'wsPort', 'address'],
		},
	},
	required: [
		'broadcasts',
		'transactions',
		'forging',
		'syncing',
		'loading',
		'network',
	],
};

module.exports = DefaultConfig;
