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
			default: {
				active: true,
				broadcastInterval: 5000,
				broadcastLimit: 25,
				parallelLimit: 20,
				releaseLimit: 25,
				relayLimit: 3,
			},
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
			default: {
				maxTransactionsPerQueue: 1000,
			},
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
			},
			required: ['force', 'delegates'],
			default: {
				force: false,
				delegates: [],
			},
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
			default: {
				active: true,
			},
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
				snapshotRound: {
					type: 'integer',
					default: 0,
				},
			},
			required: ['loadPerIteration'],
			default: {
				loadPerIteration: 5000,
				snapshotRound: 0,
			},
		},
		exceptions: {
			type: 'object',
			properties: {
				blockRewards: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				senderPublicKey: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				signatures: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				multisignatures: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				votes: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				inertTransactions: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
				rounds: {
					type: 'object',
					description:
						'In the format: 27040: { rewards_factor: 2, fees_factor: 2, fees_bonus: 10000000 }',
					default: {},
				},
				precedent: {
					type: 'object',
					description:
						'A rule/authoritative checkpoint in place to follow in future',
					properties: {
						disableDappTransfer: {
							type: 'integer',
							default: 0,
						},
					},
					required: ['disableDappTransfer'],
					default: {
						disableDappTransfer: 0,
					},
				},
				ignoreDelegateListCacheForRounds: {
					type: 'array',
					items: {
						type: 'integer',
					},
					default: [],
				},
				blockVersions: {
					type: 'object',
					description:
						'In format: { version: { start: start_height, end: end_height }}',
					default: {},
				},
				recipientLeadingZero: {
					type: 'object',
					description: 'In format: { transaction_id: "account_address"} ',
					default: {},
				},
				recipientExceedingUint64: {
					type: 'object',
					description: 'In format: { transaction_id: "account_address"} ',
					default: {},
				},
				duplicatedSignatures: {
					type: 'object',
					description:
						'In format: { transaction_id: [signature1, signature2] } ',
					default: {},
				},
				transactionWithNullByte: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
					default: [],
				},
			},
			required: [
				'blockRewards',
				'senderPublicKey',
				'signatures',
				'multisignatures',
				'votes',
				'inertTransactions',
				'rounds',
				'precedent',
				'ignoreDelegateListCacheForRounds',
				'blockVersions',
				'recipientLeadingZero',
				'recipientExceedingUint64',
				'duplicatedSignatures',
				'transactionWithNullByte',
			],
			default: {
				blockRewards: [],
				senderPublicKey: [],
				signatures: [],
				multisignatures: [],
				votes: [],
				inertTransactions: [],
				rounds: {},
				precedent: { disableDappTransfer: 0 },
				ignoreDelegateListCacheForRounds: [],
				blockVersions: {},
				recipientLeadingZero: {},
				recipientExceedingUint64: {},
				duplicatedSignatures: {},
				transactionWithNullByte: [],
			},
		},
		network: {
			type: 'object',
			properties: {
				wsPort: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
					default: 5000,
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
					default: {
						blackList: [],
					},
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
						httpHeadersTimeout: {
							type: 'integer',
							default: 5000,
						},
						httpServerSetTimeout: {
							type: 'integer',
							default: 20000,
						},
					},
					required: ['timeout'],
					default: {
						timeout: 5000,
						broadhashConsensusCalculationInterval: 5000,
						wsEngine: 'ws',
						httpHeadersTimeout: 5000,
						httpServerSetTimeout: 20000,
					},
				},
			},
			required: ['enabled', 'list', 'access', 'options', 'wsPort', 'address'],
			default: {
				enabled: true,
				list: [
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
				access: {
					blackList: [],
				},
				options: {
					timeout: 5000,
					broadhashConsensusCalculationInterval: 5000,
					wsEngine: 'ws',
				},
				wsPort: 5000,
				address: '0.0.0.0',
			},
		},
	},
	required: [
		'broadcasts',
		'transactions',
		'forging',
		'syncing',
		'loading',
		'exceptions',
		'network',
	],
};

module.exports = DefaultConfig;
