module.exports = {
	constants: {
		id: 'constants',
		type: 'object',
		required: [
			'ACTIVE_DELEGATES',
			'BLOCK_SLOT_WINDOW',
			'ADDITIONAL_DATA',
			'BLOCK_RECEIPT_TIMEOUT',
			'EPOCH_TIME',
			'FEES',
			'MAX_PAYLOAD_LENGTH',
			'MAX_PEERS',
			'MAX_SHARED_TRANSACTIONS',
			'MAX_TRANSACTIONS_PER_BLOCK',
			'MAX_VOTES_PER_TRANSACTION',
			'MAX_VOTES_PER_ACCOUNT',
			'MIN_BROADHASH_CONSENSUS',
			'MULTISIG_CONSTRAINTS',
			'NETHASHES',
			'NORMALIZER',
			'REWARDS',
			'TOTAL_AMOUNT',
			'UNCONFIRMED_TRANSACTION_TIMEOUT',
			'EXPIRY_INTERVAL',
		],
		properties: {
			ACTIVE_DELEGATES: {
				type: 'number',
				format: 'oddInteger',
				min: 1,
				default: 101,
				description: 'The default number of delegates allowed to forge a block',
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
				min: 1,
				default: 5,
				description: 'The default number of previous blocks to keep in memory',
			},
			ADDITIONAL_DATA: {
				type: 'object',
				required: ['MIN_LENGTH', 'MAX_LENGTH'],
				properties: {
					MIN_LENGTH: {
						type: 'integer',
						min: 1,
						default: 1,
						description: 'Additional data (Min length)',
					},
					MAX_LENGTH: {
						type: 'integer',
						min: 1,
						default: 64,
						description: 'Additional data (Max length)',
					},
				},
			},
			BLOCK_RECEIPT_TIMEOUT: {
				type: 'integer',
				min: 1,
				default: 20, // 2 blocks
				description: 'Seconds to check if the block is fresh or not',
			},
			EPOCH_TIME: {
				type: 'string',
				format: 'date-time',
				default: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString(),
				description:
					'Timestamp indicating the start of Lisk Core (`Date.toISOString()`)',
			},
			FEES: {
				$ref: 'fees',
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
				min: 1,
				default: 1024 * 1024,
				description:
					'Maximum transaction bytes length for 25 transactions in a single block',
			},
			MAX_PEERS: {
				type: 'integer',
				min: 1,
				default: 100,
				description:
					'Maximum number of peers allowed to connect while broadcasting a block',
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
				min: 1,
				default: 100,
				description:
					'Maximum number of in-memory transactions/signatures shared across peers',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
				min: 1,
				default: 25,
				description: 'Maximum number of transactions allowed per block',
			},
			MAX_VOTES_PER_TRANSACTION: {
				type: 'integer',
				min: 1,
				default: 33,
				description: 'Maximum number of transactions allowed per block',
			},
			MAX_VOTES_PER_ACCOUNT: {
				type: 'number',
				format: 'maxVotesAccount',
				min: 1,
				default: 101,
				description:
					'The maximum number of votes allowed in transaction type(3) votes',
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
				min: 1,
				default: 51,
				description:
					'Minimum broadhash consensus(%) among connected {MAX_PEERS} peers',
			},
			MULTISIG_CONSTRAINTS: {
				$ref: 'multisig',
			},
			NETHASHES: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
				default: [
					// Mainnet
					'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
					// Testnet
					'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
				],
				description: 'For mainnet and testnet',
			},
			NORMALIZER: {
				type: 'string',
				format: 'amount',
				default: '100000000',
				description: 'Use this to convert LISK amount to normal value',
			},
			REWARDS: {
				$ref: 'rewards',
			},
			TOTAL_AMOUNT: {
				type: 'string',
				format: 'amount',
				default: '10000000000000000',
				description:
					'Total amount of LSK available in network before rewards milestone started',
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: {
				type: 'integer',
				min: 1,
				default: 10800,
				description:
					'Expiration time for unconfirmed transaction/signatures in transaction pool',
			},
			EXPIRY_INTERVAL: {
				type: 'integer',
				min: 1,
				default: 30000,
				description: 'Transaction pool expiry timer in milliseconds',
			},
		},
		additionalProperties: false,
	},

	fees: {
		id: 'fees',
		type: 'object',
		description:
			'Object representing amount of fees for different types of transactions',
		required: [
			'SEND',
			'VOTE',
			'SECOND_SIGNATURE',
			'DELEGATE',
			'MULTISIGNATURE',
			'DAPP_REGISTRATION',
			'DAPP_WITHDRAWAL',
			'DAPP_DEPOSIT',
		],
		properties: {
			SEND: {
				type: 'string',
				format: 'amount',
				default: '10000000',
				description: 'Fee for sending a transaction',
			},
			VOTE: {
				type: 'string',
				format: 'amount',
				default: '100000000',
				description: 'Fee for voting a delegate',
			},
			SECOND_SIGNATURE: {
				type: 'string',
				format: 'amount',
				default: '500000000',
				description: 'Fee for creating a second signature',
			},
			DELEGATE: {
				type: 'string',
				format: 'amount',
				default: '2500000000',
				description: 'Fee for registering as a delegate',
			},
			MULTISIGNATURE: {
				type: 'string',
				format: 'amount',
				default: '500000000',
				description: 'Fee for multisignature transaction',
			},
			DAPP_REGISTRATION: {
				type: 'string',
				format: 'amount',
				default: '2500000000',
				description: 'Fee for registering as a dapp',
			},
			DAPP_WITHDRAWAL: {
				type: 'string',
				format: 'amount',
				default: '10000000',
			},
			DAPP_DEPOSIT: {
				type: 'string',
				format: 'amount',
				default: '10000000',
			},
		},
		additionalProperties: false,
	},

	multisig: {
		id: 'multisig',
		type: 'object',
		required: ['MIN', 'LIFETIME', 'KEYSGROUP'],
		properties: {
			MIN: {
				$ref: 'min',
			},
			LIFETIME: {
				$ref: 'lifetime',
			},
			KEYSGROUP: {
				$ref: 'keysgroup',
			},
		},
		additionalProperties: false,
	},

	minConstraints: {
		id: 'min',
		type: 'object',
		required: ['MINIMUM', 'MAXIMUM'],
		properties: {
			MINIMUM: {
				type: 'integer',
				min: 1,
				default: 1,
				description:
					'Minimum allowed number of signatures required to process a multisignature transaction',
			},
			MAXIMUM: {
				type: 'number',
				format: 'keysgroupLimit',
				min: 1,
				default: 15,
				description:
					'Maximum allowed number of signatures required to process a multisignature transaction',
			},
		},
		additionalProperties: false,
	},

	lifetimeConstraints: {
		id: 'lifetime',
		type: 'object',
		required: ['MINIMUM', 'MAXIMUM'],
		properties: {
			MINIMUM: {
				type: 'integer',
				min: 1,
				default: 1,
				description:
					'Minimum timeframe in which a multisignature transaction will exist in memory before the transaction is confirmed',
			},
			MAXIMUM: {
				type: 'integer',
				min: 1,
				default: 72,
				description:
					'Maximum timeframe in which multisignature transaction will exist in memory before the transaction is confirmed',
			},
		},
		additionalProperties: false,
	},

	keysgroupConstraints: {
		id: 'keysgroup',
		type: 'object',
		required: ['MIN_ITEMS', 'MAX_ITEMS'],
		properties: {
			MIN_ITEMS: {
				type: 'integer',
				min: 1,
				default: 1,
				description:
					'Minimum allowed number of keys inside a Multisignature pool',
			},
			MAX_ITEMS: {
				type: 'integer',
				min: 1,
				default: 15,
				description:
					'Maximum allowed number of keys inside a Multisignature pool',
			},
		},
		additionalProperties: false,
	},

	rewards: {
		id: 'rewards',
		type: 'object',
		required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
		description: 'Object representing LSK rewards milestone',
		properties: {
			MILESTONES: {
				type: 'array',
				items: {
					type: 'string',
					format: 'amount',
				},
				default: [
					'500000000', // Initial Reward
					'400000000', // Milestone 1
					'300000000', // Milestone 2
					'200000000', // Milestone 3
					'100000000', // Milestone 4
				],
				description: 'Initial 5, and decreasing until 1',
			},
			OFFSET: {
				type: 'integer',
				min: 1,
				default: 2160, // Start rewards at first block of the second round
				description: 'Start rewards at block (n)',
			},
			DISTANCE: {
				type: 'integer',
				min: 1,
				default: 3000000, // Distance between each milestone
				description: 'Distance between each milestone',
			},
		},
		additionalProperties: false,
	},
};
