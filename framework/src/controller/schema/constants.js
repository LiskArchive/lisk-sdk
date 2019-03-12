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
			'TRANSACTION_TYPES',
			'UNCONFIRMED_TRANSACTION_TIMEOUT',
			'EXPIRY_INTERVAL',
		],
		properties: {
			ACTIVE_DELEGATES: {
				type: 'number',
				format: 'oddInteger',
				min: 1,
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
				min: 1,
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
						min: 1,
					},
				},
			},
			BLOCK_RECEIPT_TIMEOUT: {
				type: 'integer',
				min: 1,
			},
			EPOCH_TIME: {
				type: 'string',
				format: 'date-time',
			},
			FEES: {
				$ref: 'fees',
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
				min: 1,
			},
			MAX_PEERS: {
				type: 'integer',
				min: 1,
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
				min: 1,
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
				type: 'number',
				format: 'maxVotesAccount',
				min: 1,
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
				min: 1,
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
			},
			NORMALIZER: {
				type: 'string',
				format: 'amount',
			},
			REWARDS: {
				$ref: 'rewards',
			},
			TOTAL_AMOUNT: {
				type: 'string',
				format: 'amount',
			},
			TRANSACTION_TYPES: {
				$ref: 'transactionTypes',
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
		additionalProperties: false,
	},

	fees: {
		id: 'fees',
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
			},
			MAXIMUM: {
				type: 'number',
				format: 'keysgroupLimit',
				min: 1,
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
			},
			MAXIMUM: {
				type: 'integer',
				min: 1,
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
			},
			MAX_ITEMS: {
				type: 'integer',
				min: 1,
			},
		},
		additionalProperties: false,
	},

	rewards: {
		id: 'rewards',
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
				min: 1,
			},
			DISTANCE: {
				type: 'integer',
				min: 1,
			},
		},
		additionalProperties: false,
	},

	transactionTypes: {
		id: 'transactionTypes',
		type: 'object',
		required: [
			'SEND',
			'SIGNATURE',
			'DELEGATE',
			'VOTE',
			'MULTI',
			'DAPP',
			'IN_TRANSFER',
			'OUT_TRANSFER',
		],
		properties: {
			SEND: {
				type: 'integer',
				enum: [0],
			},
			SIGNATURE: {
				type: 'integer',
				enum: [1],
			},
			DELEGATE: {
				type: 'integer',
				enum: [2],
			},
			VOTE: {
				type: 'integer',
				enum: [3],
			},
			MULTI: {
				type: 'integer',
				enum: [4],
			},
			DAPP: {
				type: 'integer',
				enum: [5],
			},
			IN_TRANSFER: {
				type: 'integer',
				menum: [6],
			},
			OUT_TRANSFER: {
				type: 'integer',
				enum: [7],
			},
		},
		additionalProperties: false,
	},
};
