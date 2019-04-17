module.exports = {
	constants: {
		id: 'constants',
		type: 'object',
		required: [
			'ACTIVE_DELEGATES',
			'BLOCK_SLOT_WINDOW',
			'ADDITIONAL_DATA',
			'BLOCK_RECEIPT_TIMEOUT',
			'FEES',
			'MAX_PAYLOAD_LENGTH',
			'MAX_PEERS',
			'MAX_SHARED_TRANSACTIONS',
			'MAX_VOTES_PER_TRANSACTION',
			'MAX_VOTES_PER_ACCOUNT',
			'MIN_BROADHASH_CONSENSUS',
			'MULTISIG_CONSTRAINTS',
			'NETHASHES',
			'NORMALIZER',
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
				const: 101,
				description: 'The default number of delegates allowed to forge a block',
			},
			BLOCK_SLOT_WINDOW: {
				type: 'integer',
				min: 1,
				const: 5,
				description: 'The default number of previous blocks to keep in memory',
			},
			ADDITIONAL_DATA: {
				type: 'object',
				required: ['MIN_LENGTH', 'MAX_LENGTH'],
				properties: {
					MIN_LENGTH: {
						type: 'integer',
						min: 1,
						const: 1,
						description: 'Additional data (Min length)',
					},
					MAX_LENGTH: {
						type: 'integer',
						min: 1,
						const: 64,
						description: 'Additional data (Max length)',
					},
				},
			},
			BLOCK_RECEIPT_TIMEOUT: {
				type: 'integer',
				min: 1,
				const: 20,
				description: 'Seconds to check if the block is fresh or not',
			},
			FEES: {
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
						const: '10000000',
						description: 'Fee for sending a transaction',
					},
					VOTE: {
						type: 'string',
						format: 'amount',
						const: '100000000',
						description: 'Fee for voting a delegate',
					},
					SECOND_SIGNATURE: {
						type: 'string',
						format: 'amount',
						const: '500000000',
						description: 'Fee for creating a second signature',
					},
					DELEGATE: {
						type: 'string',
						format: 'amount',
						const: '2500000000',
						description: 'Fee for registering as a delegate',
					},
					MULTISIGNATURE: {
						type: 'string',
						format: 'amount',
						const: '500000000',
						description: 'Fee for multisignature transaction',
					},
					DAPP_REGISTRATION: {
						type: 'string',
						format: 'amount',
						const: '2500000000',
						description: 'Fee for registering as a dapp',
					},
					DAPP_WITHDRAWAL: {
						type: 'string',
						format: 'amount',
						const: '10000000',
					},
					DAPP_DEPOSIT: {
						type: 'string',
						format: 'amount',
						const: '10000000',
					},
				},
				additionalProperties: false,
			},
			MAX_PAYLOAD_LENGTH: {
				type: 'integer',
				min: 1,
				const: 1024 * 1024,
				description:
					'Maximum transaction bytes length for 25 transactions in a single block',
			},
			MAX_PEERS: {
				type: 'integer',
				min: 1,
				const: 100,
				description:
					'Maximum number of peers allowed to connect while broadcasting a block',
			},
			MAX_SHARED_TRANSACTIONS: {
				type: 'integer',
				min: 1,
				const: 100,
				description:
					'Maximum number of in-memory transactions/signatures shared across peers',
			},
			MAX_VOTES_PER_TRANSACTION: {
				type: 'integer',
				min: 1,
				const: 33,
				description: 'Maximum number of transactions allowed per block',
			},
			MAX_VOTES_PER_ACCOUNT: {
				type: 'number',
				min: 1,
				maximum: {
					$data: '/ACTIVE_DELEGATES',
				},
				const: 101,
				description:
					'The maximum number of votes allowed in transaction type(3) votes',
			},
			MIN_BROADHASH_CONSENSUS: {
				type: 'integer',
				min: 1,
				const: 51,
				description:
					'Minimum broadhash consensus(%) among connected {MAX_PEERS} peers',
			},
			MULTISIG_CONSTRAINTS: {
				type: 'object',
				required: ['MIN', 'LIFETIME', 'KEYSGROUP'],
				properties: {
					KEYSGROUP: {
						type: 'object',
						required: ['MIN_ITEMS', 'MAX_ITEMS'],
						properties: {
							MIN_ITEMS: {
								type: 'integer',
								min: 1,
								const: 1,
								description:
									'Minimum allowed number of keys inside a Multisignature pool',
							},
							MAX_ITEMS: {
								type: 'integer',
								min: 1,
								const: 15,
								description:
									'Maximum allowed number of keys inside a Multisignature pool',
							},
						},
						additionalProperties: false,
					},
					MIN: {
						type: 'object',
						required: ['MINIMUM', 'MAXIMUM'],
						properties: {
							MINIMUM: {
								type: 'integer',
								min: 1,
								const: 1,
								description:
									'Minimum allowed number of signatures required to process a multisignature transaction',
							},
							MAXIMUM: {
								type: 'number',
								min: 1,
								maximum: {
									$data: '/MULTISIG_CONSTRAINTS/KEYSGROUP/MAX_ITEMS',
								},
								const: 15,
								description:
									'Maximum allowed number of signatures required to process a multisignature transaction',
							},
						},
					},
					LIFETIME: {
						type: 'object',
						required: ['MINIMUM', 'MAXIMUM'],
						properties: {
							MINIMUM: {
								type: 'integer',
								min: 1,
								const: 1,
								description:
									'Minimum timeframe in which a multisignature transaction will exist in memory before the transaction is confirmed',
							},
							MAXIMUM: {
								type: 'integer',
								min: 1,
								const: 72,
								description:
									'Maximum timeframe in which multisignature transaction will exist in memory before the transaction is confirmed',
							},
						},
						additionalProperties: false,
					},
				},
				additionalProperties: false,
			},
			NETHASHES: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
				const: [
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
				const: '100000000',
				description: 'Use this to convert LISK amount to normal value',
			},
			TOTAL_AMOUNT: {
				type: 'string',
				format: 'amount',
				const: '10000000000000000',
				description:
					'Total amount of LSK available in network before rewards milestone started',
			},
			TRANSACTION_TYPES: {
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
						const: 0,
					},
					SIGNATURE: {
						type: 'integer',
						const: 1,
					},
					DELEGATE: {
						type: 'integer',
						const: 2,
					},
					VOTE: {
						type: 'integer',
						const: 3,
					},
					MULTI: {
						type: 'integer',
						const: 4,
					},
					DAPP: {
						type: 'integer',
						const: 5,
					},
					IN_TRANSFER: {
						type: 'integer',
						const: 6,
					},
					OUT_TRANSFER: {
						type: 'integer',
						const: 7,
					},
				},
				additionalProperties: false,
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: {
				type: 'integer',
				min: 1,
				const: 10800,
				description:
					'Expiration time for unconfirmed transaction/signatures in transaction pool',
			},
			EXPIRY_INTERVAL: {
				type: 'integer',
				min: 1,
				const: 30000,
				description: 'Transaction pool expiry timer in milliseconds',
			},
		},
		additionalProperties: false,
		default: {
			ACTIVE_DELEGATES: 101,
			BLOCK_SLOT_WINDOW: 5,
			ADDITIONAL_DATA: {
				MIN_LENGTH: 1,
				MAX_LENGTH: 64,
			},
			BLOCK_RECEIPT_TIMEOUT: 20, // 2 blocks
			FEES: {
				SEND: '10000000',
				VOTE: '100000000',
				SECOND_SIGNATURE: '500000000',
				DELEGATE: '2500000000',
				MULTISIGNATURE: '500000000',
				DAPP_REGISTRATION: '2500000000',
				DAPP_WITHDRAWAL: '10000000',
				DAPP_DEPOSIT: '10000000',
			},
			MAX_PAYLOAD_LENGTH: 1024 * 1024,
			MAX_PEERS: 100,
			MAX_SHARED_TRANSACTIONS: 100,
			MAX_VOTES_PER_TRANSACTION: 33,
			MAX_VOTES_PER_ACCOUNT: 101,
			MIN_BROADHASH_CONSENSUS: 51,
			MULTISIG_CONSTRAINTS: {
				MIN: {
					MINIMUM: 1,
					MAXIMUM: 15,
				},
				LIFETIME: {
					MINIMUM: 1,
					MAXIMUM: 72,
				},
				KEYSGROUP: {
					MIN_ITEMS: 1,
					MAX_ITEMS: 15,
				},
			},
			NETHASHES: [
				// Mainnet
				'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
				// Testnet
				'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			],
			NORMALIZER: '100000000',
			// WARNING: When changing totalAmount you also need to change getBlockRewards(int) SQL function!
			TOTAL_AMOUNT: '10000000000000000',
			TRANSACTION_TYPES: {
				SEND: 0,
				SIGNATURE: 1,
				DELEGATE: 2,
				VOTE: 3,
				MULTI: 4,
				DAPP: 5,
				IN_TRANSFER: 6,
				OUT_TRANSFER: 7,
			},
			UNCONFIRMED_TRANSACTION_TIMEOUT: 10800, // 1080 blocks
			EXPIRY_INTERVAL: 30000,
		},
	},
};
