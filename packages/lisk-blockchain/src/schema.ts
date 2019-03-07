export const blockSchema = {
	type: 'object',
	required: [
		'blockSignature',
		'generatorPublicKey',
		'numberOfTransactions',
		'payloadHash',
		'payloadLength',
		'timestamp',
		'totalAmount',
		'totalFee',
		'reward',
		'transactions',
		'version',
	],
	properties: {
		id: {
			type: 'string',
			minLength: 1,
			maxLength: 20,
		},
		height: {
			type: 'integer',
		},
		blockSignature: {
			type: 'string',
		},
		generatorPublicKey: {
			type: 'string',
		},
		numberOfTransactions: {
			type: 'integer',
		},
		payloadHash: {
			type: 'string',
		},
		payloadLength: {
			type: 'integer',
		},
		previousBlock: {
			type: 'string',
			minLength: 1,
			maxLength: 20,
		},
		timestamp: {
			type: 'integer',
		},
		totalAmount: {
			type: 'string',
		},
		totalFee: {
			type: 'string',
		},
		reward: {
			type: 'string',
		},
		transactions: {
			type: 'array',
			uniqueItems: true,
		},
		version: {
			type: 'integer',
			minimum: 0,
		},
	},
};
