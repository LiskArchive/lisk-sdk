module.exports = {
	$id: '#genesisBlock',
	type: 'object',
	required: [
		'version',
		'totalAmount',
		'totalFee',
		'reward',
		'payloadHash',
		'timestamp',
		'numberOfTransactions',
		'payloadLength',
		'generatorPublicKey',
		'transactions',
		'blockSignature',
	],
	properties: {
		version: {
			type: 'integer',
			minimum: 0,
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
		payloadHash: {
			type: 'string',
			format: 'hex',
		},
		timestamp: {
			type: 'integer',
			min: 0,
		},
		numberOfTransactions: {
			type: 'integer',
			min: 0,
		},
		payloadLength: {
			type: 'integer',
			min: 0,
		},
		previousBlock: {
			type: ['null', 'string'],
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		generatorPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		transactions: {
			type: 'array',
			items: {
				type: 'object',
				required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
				properties: {
					type: {
						type: 'integer',
						enum: [0, 2, 3],
					},
					amount: {
						type: 'string',
						format: 'amount',
					},
					fee: {
						type: 'string',
						format: 'amount',
					},
					timestamp: {
						type: 'integer',
						min: 0,
					},
					recipientId: {
						type: ['string', 'null'],
						format: 'address',
						minLength: 1,
						maxLength: 22,
					},
					senderId: {
						type: 'string',
						format: 'address',
						minLength: 1,
						maxLength: 22,
					},
					senderPublicKey: {
						type: 'string',
						format: 'publicKey',
					},
					asset: {
						type: 'object',
						description:
							'Send relevant data with transaction like delegate, vote, signature, ...',
					},
					signature: {
						type: 'string',
						format: 'signature',
					},
					id: {
						type: 'string',
						format: 'id',
						minLength: 1,
						maxLength: 20,
					},
				},
				additionalProperties: false,
			},
			uniqueItems: true,
		},
		height: {
			type: 'integer',
			min: 1,
		},
		blockSignature: {
			type: 'string',
			format: 'signature',
		},
		id: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
	},
	additionalProperties: false,
};
