module.exports = {
	appLabel: {
		id: '#appLabel',
		type: 'string',
		pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$',
	},

	genesisBlock: {
		$id: '#genesisBlock',
		type: 'object',
		required: ['xxx'],
		properties: {
			version: {
				type: 'integer',
			},
			totalAmount: {
				type: 'integer',
			},
			totalFee: {
				type: 'integer',
			},
			reward: {
				type: 'integer',
			},
			payloadHash: {
				type: 'string',
				minLength: 64,
				maxLength: 64,
			},
			timestamp: {
				type: 'integer',
			},
			numberOfTransactions: {
				type: 'integer',
			},
			payloadLength: {
				type: 'integer',
			},
			previousBlock: {
				type: 'null',
			},
			generatorPublicKey: {
				type: 'string',
				pattern: '^[0-9a-z]{64}$',
			},
			transactions: {
				type: 'array',
				items: {
					type: 'object',
					$ref: '#/transactions',
				},
				uniqueItems: true,
			},
			height: {
				type: 'integer',
			},
			blockSignature: {
				type: 'string',
				pattern: '^[0-9a-z]{128}$',
			},
			id: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
		},
		additionalProperties: false,
	},

	transactions: {
		id: '#/transactions',
		type: 'object',
		required: [
			'type',
			'amount',
			'fee',
			'timestamp',
			'recipientId',
			'senderId',
			'senderPublicKey',
			'signature',
			'id',
		],
		properties: {
			type: {
				type: 'integer',
				minimum: 0,
				maximum: 7,
			},
			amount: {
				type: 'integer',
			},
			fee: {
				type: 'integer',
			},
			timestamp: {
				type: 'integer',
			},
			recipientId: {
				type: ['string', 'null'],
				pattern: '^[0-9]+L$',
			},
			senderId: {
				type: 'string',
				pattern: '^[0-9]+L$',
			},
			senderPublicKey: {
				type: 'string',
				pattern: '^[0-9a-z]{64}$',
			},
			asset: {
				type: 'object',
				description:
					'Send relevant data with transaction like delegate, vote, signature, ...',
			},
			signature: {
				type: 'string',
				pattern: '^[0-9a-z]{128}$',
			},
			id: {
				type: 'string',
				pattern: '^[0-9]+$',
			},
		},
		additionalProperties: false,
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
