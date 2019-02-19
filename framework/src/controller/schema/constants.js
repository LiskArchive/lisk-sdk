module.exports = {
	constants: {
		$id: '#constants',
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
				min: 51,
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
				min: 5,
			},
			ADDITIONAL_DATA: {
				type: 'object',
				required: ['MIN_LENGTH', 'MAX_LENGTH'],
				properties: {
					MIN_LENGTH: {
						type: 'integer',
						min: 1,
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
				type: 'string',
				format: 'date-time',
			},
			FEES: {
				type: 'object',
				schema: {
					$ref: '#/constants/fees',
				},
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
				min: 1, // @todo Calculate this property later on.
			},
			MAX_PEERS: {
				type: 'integer',
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
			},
			MAX_TRANSACTIONS_PER_BLOCK: {
				type: 'integer',
				min: 1,
			},
			MAX_VOTES_PER_TRANSACTION: {
				type: 'integer',
				min: 1,
			},
			MAX_VOTES_PER_ACCOUNT: {
				type: 'integer',
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
			},
			MULTISIG_CONSTRAINTS: {
				type: 'object',
				schema: {
					$ref: '#/constants/multisig',
				},
			},
			NETHASHES: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
			},
			NORMALIZER: {
				type: 'string',
				format: 'amount',
			},
			REWARDS: {
				type: 'object',
				schema: {
					$ref: '#/constants/rewards',
				},
			},
			TOTAL_AMOUNT: {
				type: 'string',
				format: 'amount',
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: {
				type: 'integer',
				min: 1,
			},
			EXPIRY_INTERVAL: {
				type: 'integer',
				min: 1,
			},
		},
	},

	fees: {
		$id: '#/constants/fees',
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
				format: 'amount',
			},
			VOTE: {
				type: 'string',
				format: 'amount',
			},
			SECOND_SIGNATURE: {
				type: 'string',
				format: 'amount',
			},
			DELEGATE: {
				type: 'string',
				format: 'amount',
			},
			MULTISIGNATURE: {
				type: 'string',
				format: 'amount',
			},
			DAPP_REGISTRATION: {
				type: 'string',
				format: 'amount',
			},
			DAPP_WITHDRAWAL: {
				type: 'string',
				format: 'amount',
			},
			DAPP_DEPOSIT: {
				type: 'string',
				format: 'amount',
			},
		},
	},

	multisig: {
		$id: '#/constants/multisig',
		type: 'object',
		required: ['MIN', 'LIFETIME', 'KEYSGROUP'],
		properties: {
			MIN: {
				type: 'object',
				schema: {
					$ref: '#/constants/multisig/min',
				},
			},
			LIFETIME: {
				type: 'object',
				schema: {
					$ref: '#/constants/multisig/lifetime',
				},
			},
			KEYSGROUP: {
				type: 'object',
				schema: {
					$ref: '#/constants/multisig/keysgroup',
				},
			},
		},
	},

	minConstraints: {
		$id: '#/constants/multisig/min',
		type: 'object',
		required: ['MINIMUM', 'MAXIMUM'],
		properties: {
			MINIMUM: {
				type: 'integer',
				min: 1,
				// Max value is lower than or equal to MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS
				// Problem: Cannot reference value outside of this object
				// e.g. max: `{ $data: '1/path-to-MAX_ITEMS'}`
			},
			MAXIMUM: {
				type: 'integer',
			},
		},
	},

	lifetimeConstraints: {
		$id: '#/constants/multisig/lifetime',
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

	keysgroupConstraints: {
		$id: '#/constants/multisig/keysgroup',
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

	rewards: {
		$id: '#/constants/rewards',
		type: 'object',
		required: ['MILESTONES', 'OFFSET', 'DISTANCE'],
		properties: {
			MILESTONES: {
				type: 'array',
				items: {
					type: 'string',
					format: 'amount',
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
};
