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
					$ref: 'transactions',
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
	},

	transactions: {
		id: 'transactions',
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
				enum: [
					'trace',
					'debug',
					'log',
					'info',
					'warn',
					'error',
					'fatal',
					'none',
				],
			},
			consoleLogLevel: {
				type: 'string',
				enum: [
					'trace',
					'debug',
					'log',
					'info',
					'warn',
					'error',
					'fatal',
					'none',
				],
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
			ipc: {
				type: 'object',
				properties: {
					enabled: {
						type: 'boolean',
					},
				},
			},
			components: {
				type: 'object',
				properties: {
					logger: {
						$ref: '#/app/logger',
					},
				},
			},
			modules: {
				type: 'object',
				properties: {
					chain: {
						type: 'object',
					},
					network: {
						type: 'object',
					},
				},
				additionalProperties: true,
			},
			initialState: {
				id: '#/app/initialState',
				type: 'object',
				properties: {
					nethash: {
						type: 'string',
					},
					version: {
						type: 'string',
					},
					wsPort: {
						type: 'integer',
					},
					httpPort: {
						type: 'integer',
					},
					minVersion: {
						type: 'string',
					},
					protocolVersion: {
						type: 'string',
					},
					nonce: {
						type: 'string',
					},
				},
			},
		},
		additionalProperties: false,
	},
};
