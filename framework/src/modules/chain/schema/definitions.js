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
 */

'use strict';

module.exports = {
	Signature: {
		id: 'Signature',
		type: 'object',
		required: ['transactionId', 'publicKey', 'signature'],
		properties: {
			transactionId: {
				type: 'string',
				format: 'id',
				example: '222675625422353767',
				minLength: 1,
				maxLength: 20,
				description:
					'Unique identifier of the multisignature transaction to sign.',
			},
			publicKey: {
				type: 'string',
				format: 'publicKey',
				example:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				description:
					'Public key of the account that intends to sign the multisignature transaction.',
			},
			signature: {
				type: 'string',
				format: 'signature',
				example:
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				description:
					'Signature to sign the transaction.\nThe signature can be generated locally, either by using Lisk Commander or with Lisk Elements.\n',
			},
		},
	},
	CommonBlock: {
		id: 'CommonBlock',
		type: 'object',
		required: ['id', 'height', 'previousBlock'],
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20,
				example: '6258354802676165798',
			},
			height: {
				type: 'integer',
				example: 123,
				minimum: 1,
			},
			previousBlock: {
				type: 'string',
				format: 'id',
				example: '15918760246746894806',
			},
		},
	},
	WSSignaturesList: {
		id: 'WSSignaturesList',
		type: 'object',
		required: ['signatures'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			signatures: {
				type: 'array',
				items: {
					type: 'object',
				},
				minItems: 1,
				maxItems: 25,
			},
		},
	},
	WSBlocksList: {
		id: 'WSBlocksList',
		type: 'array',
		items: {
			type: 'object',
		},
	},
	WSBlocksCommonRequest: {
		id: 'WSBlocksCommonRequest',
		type: 'object',
		required: ['ids'],
		properties: {
			ids: {
				type: 'string',
				format: 'csv',
			},
		},
	},
	WSTransactionsRequest: {
		id: 'WSTransactionsRequest',
		type: 'object',
		required: ['transactions'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			transactions: {
				type: 'array',
				items: {
					type: 'object',
				},
				minItems: 1,
				maxItems: 25,
			},
		},
	},
	WSTransactionsResponse: {
		id: 'WSTransactionsResponse',
		type: 'object',
		required: ['transactions'],
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100,
				items: {
					type: 'object',
				},
			},
		},
	},
	WSSignaturesResponse: {
		id: 'WSSignaturesResponse',
		required: ['signatures'],
		properties: {
			signatures: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100,
				items: {
					type: 'object',
				},
			},
		},
	},
	WSBlocksBroadcast: {
		id: 'WSBlocksBroadcast',
		type: 'object',
		required: ['block'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			block: {
				type: 'object',
				required: ['id', 'height', 'timestamp', 'generatorPublicKey'],
				properties: {
					id: {
						type: 'string',
						format: 'id',
						minLength: 1,
						maxLength: 20,
						example: '6258354802676165798',
					},
					version: {
						type: 'integer',
						example: 0,
						minimum: 0,
					},
					height: {
						type: 'integer',
						example: 123,
						minimum: 1,
					},
					timestamp: {
						description: 'Unix Timestamp',
						type: 'integer',
						example: 28227090,
					},
					generatorAddress: {
						type: 'string',
						format: 'address',
						example: '12668885769632475474L',
					},
					generatorPublicKey: {
						type: 'string',
						format: 'publicKey',
						example:
							'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
					},
					payloadLength: {
						type: 'integer',
						example: 117,
						minimum: 0,
					},
					payloadHash: {
						type: 'string',
						format: 'hex',
						example:
							'4e4d91be041e09a2e54bb7dd38f1f2a02ee7432ec9f169ba63cd1f193a733dd2',
					},
					blockSignature: {
						type: 'string',
						format: 'signature',
						example:
							'a3733254aad600fa787d6223002278c3400be5e8ed4763ae27f9a15b80e20c22ac9259dc926f4f4cabdf0e4f8cec49308fa8296d71c288f56b9d1e11dfe81e07',
					},
					confirmations: {
						type: 'integer',
						example: 200,
					},
					previousBlockId: {
						type: 'string',
						format: 'id',
						example: '15918760246746894806',
					},
				},
			},
		},
	},
};
