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
export const transactionInterface = {
	required: [
		'toJSON',
		'getBytes',
		'validate',
		'apply',
		'undo',
		'prepare',
		'verifySignatures',
	],
	properties: {
		toJSON: {
			typeof: 'function',
		},
		getBytes: {
			typeof: 'function',
		},
		validate: {
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
		verifySignatures: {
			typeof: 'function',
		},
	},
};

// TODO: Add senderId and recipientId to required once deprecated functions relying on this schema are removed
export const baseTransaction = {
	$id: 'lisk/base-transaction',
	type: 'object',
	required: ['type', 'senderPublicKey', 'fee', 'nonce', 'asset', 'signatures'],
	properties: {
		blockId: {
			type: 'string',
			format: 'hex',
		},
		height: {
			type: 'integer',
			minimum: 0,
		},
		confirmations: {
			type: 'integer',
			minimum: 0,
		},
		type: {
			type: 'integer',
			minimum: 0,
		},
		nonce: {
			type: 'string',
			format: 'nonce',
		},
		fee: {
			type: 'string',
			format: 'fee',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		signatures: {
			type: 'array',
			items: {
				oneOf: [
					{ type: 'string', format: 'signature' },
					{ type: 'string', format: 'emptyString' },
				],
			},
			minItems: 1,
			maxItems: 64,
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
