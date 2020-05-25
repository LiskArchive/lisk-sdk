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

export const schemas = {
	getBlocksFromIdRequest: {
		id: 'getBlocksFromIdRequest',
		type: 'object',
		required: ['blockId'],
		properties: {
			blockId: {
				type: 'string',
				format: 'hex',
			},
		},
	},
	getTransactionsRequest: {
		id: 'getTransactionsRequest',
		type: 'object',
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
				minItems: 1,
			},
		},
	},
	postBlockEvent: {
		id: 'postBlockEvent',
		type: 'object',
		required: ['block'],
		properties: {
			block: {
				type: 'object',
				required: ['id', 'height', 'timestamp', 'generatorPublicKey'],
				properties: {
					id: {
						type: 'string',
						format: 'hex',
						minLength: 64,
						maxLength: 64,
						example:
							'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
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
					maxHeightPrevoted: {
						type: 'integer',
						example: 123,
						minimum: 0,
					},
					maxHeightPreviouslyForged: {
						type: 'integer',
						example: 123,
						minimum: 0,
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
					transactionRoot: {
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
						format: 'hex',
						example:
							'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
					},
				},
			},
		},
	},
	postSignatureEvent: {
		id: 'postSignatureEvent',
		type: 'object',
		required: ['signatures'],
		properties: {
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
	postTransactionsAnnouncementEvent: {
		id: 'postTransactionsAnnouncementEvent',
		type: 'object',
		required: ['transactionIds'],
		properties: {
			transactionIds: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
				minItems: 1,
				maxItems: 100,
			},
		},
	},
	getHighestCommonBlockRequest: {
		id: 'getHighestCommonBlockRequest',
		type: 'object',
		required: ['ids'],
		properties: {
			ids: {
				type: 'array',
				items: {
					type: 'string',
					format: 'hex',
				},
				uniqueItems: true,
				minItems: 1,
			},
		},
	},
};
