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
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		height: {
			type: 'integer',
		},
		blockSignature: {
			type: 'string',
			format: 'signature',
		},
		generatorPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		numberOfTransactions: {
			type: 'integer',
		},
		payloadHash: {
			type: 'string',
			format: 'hex',
		},
		payloadLength: {
			type: 'integer',
		},
		previousBlock: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		timestamp: {
			type: 'integer',
		},
		totalAmount: {
			type: 'string',
			format: 'amount',
		},
		totalFee: {
			type: 'string',
			format: 'amount',
		},
		reward: {
			type: 'string',
			format: 'amount',
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
