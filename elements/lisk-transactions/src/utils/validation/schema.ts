/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
export const transaction = {
	$id: 'lisk/transaction',
	type: 'object',
	required: ['type', 'amount', 'fee', 'senderPublicKey', 'timestamp'],
	properties: {
		id: {
			type: 'string',
		},
		blockId: {
			type: 'string',
		},
		amount: {
			type: ['string', 'integer'],
		},
		fee: {
			type: ['string', 'integer'],
		},
		type: {
			type: 'integer',
		},
		timestamp: {
			type: 'integer',
		},
		senderId: {
			type: 'string',
		},
		senderPublicKey: {
			type: 'string',
		},
		recipientId: {
			type: ['string', 'null'],
		},
		recipientPublicKey: {
			type: ['string', 'null'],
		},
		signature: {
			type: 'string',
		},
		signSignature: {
			type: 'string',
		},
		signatures: {
			type: 'array',
		},
		asset: {
			type: 'object',
		},
		receivedAt: {
			type: 'string',
		},
	},
};

export const transactionInterface = {
	required: [
		'toJSON',
		'isReady',
		'getBytes',
		'validate',
		'verifyAgainstOtherTransactions',
		'apply',
		'undo',
		'prepare',
		'addMultisignature',
		'addVerifiedMultisignature',
		'isExpired',
		'fromSync',
	],
	properties: {
		toJSON: {
			typeof: 'function',
		},
		isReady: {
			typeof: 'function',
		},
		getBytes: {
			typeof: 'function',
		},
		validate: {
			typeof: 'function',
		},
		verifyAgainstOtherTransactions: {
			typeof: 'function',
		},
		apply: {
			typeof: 'function',
		},
		undo: {
			typeof: 'function',
		},
		prepare: {
			typeof: 'function',
		},
		addMultisignature: {
			typeof: 'function',
		},
		addVerifiedMultisignature: {
			typeof: 'function',
		},
		processMultisignatures: {
			typeof: 'function',
		},
		isExpired: {
			typeof: 'function',
		},
		fromSync: {
			typeof: 'function',
		},
	},
};

// TODO: Add senderId and recipientId to required once deprecated functions relying on this schema are removed
export const baseTransaction = {
	$id: 'lisk/base-transaction',
	type: 'object',
	required: [
		'id',
		'type',
		'amount',
		'fee',
		'senderPublicKey',
		'timestamp',
		'asset',
		'signature',
	],
	properties: {
		id: {
			type: 'string',
			format: 'id',
		},
		blockId: {
			type: 'string',
			format: 'id',
		},
		height: {
			type: 'integer',
			minimum: 0,
		},
		confirmations: {
			type: 'integer',
			minimum: 0,
		},

		amount: {
			type: 'string',
			format: 'amount',
		},
		fee: {
			type: 'string',
			format: 'fee',
		},
		type: {
			type: 'integer',
			minimum: 0,
		},
		timestamp: {
			type: 'integer',
			minimum: -2147483648,
			maximum: 2147483647,
		},
		senderId: {
			type: 'string',
			format: 'address',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderSecondPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		recipientId: {
			type: 'string',
		},
		recipientPublicKey: {
			type: 'string',
			format: 'emptyOrPublicKey',
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		signatures: {
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string',
				format: 'signature',
			},
			minItems: 0,
			maxItems: 15,
		},
		asset: {
			type: 'object',
		},
		receivedAt: {
			type: 'string',
			format: 'date-time',
		},
	},
};

export const transferTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				recipientId: {
					format: 'address',
				},
				amount: {
					format: 'transferAmount',
				},
				asset: {
					type: 'object',
					properties: {
						data: {
							type: 'string',
							format: 'transferData',
							maxLength: 64,
						},
					},
				},
			},
		},
	},
};

export const signatureTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					format: 'nonTransferAmount',
				},
				asset: {
					type: 'object',
					required: ['signature'],
					properties: {
						signature: {
							type: 'object',
							required: ['publicKey'],
							properties: {
								publicKey: {
									type: 'string',
									format: 'publicKey',
								},
							},
						},
					},
				},
			},
		},
	},
};

export const delegateTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					format: 'nonTransferAmount',
				},
				asset: {
					type: 'object',
					required: ['delegate'],
					properties: {
						delegate: {
							type: 'object',
							required: ['username'],
							properties: {
								username: {
									type: 'string',
									maxLength: 20,
								},
							},
						},
					},
				},
			},
		},
	},
};

export const voteTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					format: 'nonTransferAmount',
				},
				asset: {
					type: 'object',
					required: ['votes'],
					properties: {
						votes: {
							type: 'array',
							uniqueSignedPublicKeys: true,
							minItems: 1,
							maxItems: 33,
							items: {
								type: 'string',
								format: 'signedPublicKey',
							},
						},
					},
				},
			},
		},
	},
};

export const multiTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					format: 'nonTransferAmount',
				},
				asset: {
					type: 'object',
					required: ['multisignature'],
					properties: {
						multisignature: {
							type: 'object',
							required: ['min', 'lifetime', 'keysgroup'],
							properties: {
								min: {
									type: 'integer',
									minimum: 1,
									maximum: 15,
								},
								lifetime: {
									type: 'integer',
									minimum: 1,
									maximum: 72,
								},
								keysgroup: {
									type: 'array',
									uniqueItems: true,
									minItems: 1,
									maxItems: 15,
									items: {
										type: 'string',
										format: 'additionPublicKey',
									},
								},
							},
						},
					},
				},
			},
		},
	},
};

export const dappTransaction = {
	$merge: {
		source: { $ref: 'lisk/base-transaction' },
		with: {
			properties: {
				amount: {
					format: 'nonTransferAmount',
				},
				asset: {
					type: 'object',
					required: ['dapp'],
					properties: {
						dapp: {
							type: 'object',
							required: ['name', 'type', 'category', 'link'],
							properties: {
								icon: {
									type: 'string',
								},
								category: {
									type: 'integer',
								},
								type: {
									type: 'integer',
								},
								link: {
									type: 'string',
								},
								tags: {
									type: 'string',
								},
								description: {
									type: 'string',
								},
								name: {
									type: 'string',
								},
							},
						},
					},
				},
			},
		},
	},
};
