const constants = require('../defaults/constants');

const totalAmountLength = constants.TOTAL_AMOUNT.length;

module.exports = {
	appLabel: {
		id: '#appLabel',
		type: 'string',
		pattern: '^[a-zA-Z][0-9a-zA-Z\\_\\-]*$',
	},

	genesisBlock: {
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
				pattern: '^[0-9]+$',
			},
			totalFee: {
				type: 'integer',
			},
			reward: {
				type: 'integer',
			},
			payloadHash: {
				type: 'string',
				pattern: '^[a-f0-9]{64}$',
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
				type: ['integer', 'null'],
			},
			generatorPublicKey: {
				type: 'string',
				pattern: '^[a-f0-9]{64}$',
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
				pattern: '^[a-f0-9]{128}$',
			},
			id: {
				type: 'string',
				pattern: '^[0-9]+$',
				minLength: 1,
				maxLength: 20,
			},
		},
		additionalProperties: false,
	},

	transactions: {
		id: '#/transactions',
		type: 'object',
		required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
		properties: {
			type: {
				type: 'integer',
				minimum: 0,
				maximum: 7,
			},
			amount: {
				type: 'string',
				pattern: '^[0-9]+$',
				minLength: 1,
				maxLength: totalAmountLength,
				description: 'Value required to be less than TOTAL_AMOUNT constant.',
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
				minLength: 1,
				maxLength: 22,
			},
			senderId: {
				type: 'string',
				pattern: '^[0-9]+L$',
				minLength: 1,
				maxLength: 22,
			},
			senderPublicKey: {
				type: 'string',
				pattern: '^[a-f0-9]{64}$',
			},
			asset: {
				type: 'object',
				description:
					'Send relevant data with transaction like delegate, vote, signature, ...',
			},
			signature: {
				type: 'string',
				pattern: '^[a-f0-9]{128}$',
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
