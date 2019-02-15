module.exports = {
	appLabel: {
		id: '#appLabel',
		type: 'string',
		pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$',
	},

	genesisBlock: {
		id: '#genesisBlock',
		type: 'object',
	},

	constants: {
		id: '#/app/constants',
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
				type: 'integer',
				min: 0,
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
			},
			ADDITIONAL_DATA: {
				type: 'object',
				required: ['MIN_LENGTH', 'MAX_LENGTH'],
				properties: {
					MIN_LENGTH: {
						type: 'integer',
					},
					MAX_LENGTH: {
						type: 'integer',
					},
				},
			},
			BLOCK_RECEIPT_TIMEOUT: {
				type: 'integer',
			},
			EPOCH_TIME: {
				type: 'object',
			},
			FEES: {
				type: 'object',
				$ref: '#/fees',
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
			},
			MAX_PEERS: {
				type: 'integer',
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
			},
			MAX_VOTES_PER_TRANSACTION: {
				type: 'integer',
			},
			MAX_VOTES_PER_ACCOUNT: {
				type: 'integer',
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
			},
			MULTISIG_CONSTRAINTS: {
				type: 'object',
				required: ['MIN', 'LIFETIME', 'KEYSGROUP'],
				properties: {
					MIN: {
						type: 'object',
						required: ['MINIMUM', 'MAXIMUM'],
						properties: {
							MINIMUM: {
								type: 'integer',
							},
							MAXIMUM: {
								type: 'integer',
							},
						},
					},
					LIFETIME: {
						type: 'object',
						required: ['MINIMUM', 'MAXIMUM'],
						properties: {
							MINIMUM: {
								type: 'integer',
							},
							MAXIMUM: {
								type: 'integer',
							},
						},
					},
					KEYSGROUP: {
						type: 'object',
						required: ['MIN_ITEMS', 'MAX_ITEMS'],
						properties: {
							MIN_ITEMS: {
								type: 'integer',
							},
							MAX_ITEMS: {
								type: 'integer',
							},
						},
					},
				},
			},
			NETHASHES: {
				type: 'array',
				items: {
					type: 'string',
					pattern: '^[a-fA-F0-9]{64}$',
				},
			},
			NORMALIZER: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			REWARDS: {
				type: 'object',
				required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
				properties: {
					MILESTONES: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^[0-9]+$',
						},
					},
					OFFSET: {
						type: 'integer',
					},
					DISTANCE: {
						type: 'integer',
					},
				},
			},
			TOTAL_AMOUNT: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: {
				type: 'integer',
			},
			EXPIRY_INTERVAL: {
				type: 'integer',
			},
		},
	},

	fees: {
		$id: '#/fees',
		type: 'object',
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
				pattern: '^[0-9]+$',
			},
			VOTE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			SECOND_SIGNATURE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DELEGATE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			MULTISIGNATURE: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_REGISTRATION: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_WITHDRAWAL: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
			DAPP_DEPOSIT: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
		},
	},

	logger: {
		$id: '#/app/logger',
		type: 'object',
		required: ['filename'],
		properties: {
			filename: {
				type: 'string',
			},
			fileLogLevel: {
				type: 'string',
				enum: ['info', 'debug', 'trace'],
			},
			consoleLogLevel: {
				type: 'string',
				enum: ['info', 'debug', 'trace'],
			},
			echo: {
				type: 'string',
			},
		},
	},

	config: {
		id: '#/app/config',
		type: 'object',
		properties: {
			components: {
				type: 'object',
				properties: {
					logger: {
						$ref: '#/app/logger',
					},
				},
			},
		},
		additionalProperties: false,
	},
};
