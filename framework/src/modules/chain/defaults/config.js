const defaultConfig = {
	type: 'object',
	properties: {
		broadcasts: {
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
				},
				broadcastInterval: {
					type: 'integer',
					minimum: 1000,
					maximum: 60000,
				},
				broadcastLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
				},
				parallelLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
				},
				releaseLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 25,
				},
				relayLimit: {
					type: 'integer',
					minimum: 1,
					maximum: 100,
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
			properties: {
				maxTransactionsPerQueue: {
					type: 'integer',
					minimum: 100,
					maximum: 5000,
				},
			},
			required: ['maxTransactionsPerQueue'],
		},
		forging: {
			type: 'object',
			properties: {
				force: {
					type: 'boolean',
				},
				defaultPassword: {
					type: 'string',
				},
				delegates: {
					type: 'array',
					env: {
						variable: 'LISK_FORGING_DELEGATES',
						formatter: 'stringToDelegateList',
					},
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
		},
		syncing: {
			type: 'object',
			properties: {
				active: {
					type: 'boolean',
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
				},
				snapshotRound: {
					type: 'integer',
					arg: '--snapshot,-s',
				},
			},
			required: ['loadPerIteration'],
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
				},
				senderPublicKey: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				signatures: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				signSignature: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				multisignatures: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				votes: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				inertTransactions: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				roundVotes: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
				},
				rounds: {
					type: 'object',
					description:
						'In the format: 27040: { rewards_factor: 2, fees_factor: 2, fees_bonus: 10000000 }',
				},
				precedent: {
					type: 'object',
					description:
						'A rule/authoritative checkpoint in place to follow in future',
					properties: {
						disableDappTransfer: {
							type: 'integer',
						},
					},
					required: ['disableDappTransfer'],
				},
				ignoreDelegateListCacheForRounds: {
					type: 'array',
					items: {
						type: 'integer',
					},
				},
				blockVersions: {
					type: 'object',
					description:
						'In format: { version: { start: start_height, end: end_height }}',
				},
				recipientLeadingZero: {
					type: 'object',
					description: 'In format: { transaction_id: "account_address"} ',
				},
				recipientExceedingUint64: {
					type: 'object',
					description: 'In format: { transaction_id: "account_address"} ',
				},
				duplicatedSignatures: {
					type: 'object',
					description:
						'In format: { transaction_id: [signature1, signature2] } ',
				},
				transactionWithNullByte: {
					type: 'array',
					items: {
						type: 'string',
						format: 'id',
					},
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
		},
	},
	required: [
		'broadcasts',
		'transactions',
		'forging',
		'syncing',
		'loading',
		'exceptions',
	],
	default: {
		broadcasts: {
			active: true,
			broadcastInterval: 5000,
			broadcastLimit: 25,
			parallelLimit: 20,
			releaseLimit: 25,
			relayLimit: 3,
		},
		transactions: {
			maxTransactionsPerQueue: 1000,
		},
		forging: {
			force: false,
			delegates: [],
		},
		syncing: {
			active: true,
		},
		loading: {
			loadPerIteration: 5000,
			snapshotRound: 0,
		},
		exceptions: {
			blockRewards: [],
			senderPublicKey: [],
			signatures: [],
			signSignature: [],
			multisignatures: [],
			votes: [],
			inertTransactions: [],
			rounds: {},
			precedent: { disableDappTransfer: 0 },
			ignoreDelegateListCacheForRounds: [],
			blockVersions: {},
			roundVotes: [],
			recipientLeadingZero: {},
			recipientExceedingUint64: {},
			duplicatedSignatures: {},
			transactionWithNullByte: [],
		},
	},
};

module.exports = defaultConfig;
