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
	},
};

// TODO: Add senderId and recipientId to required once deprecated functions relying on this schema are removed
export const baseTransaction = {
	$id: 'lisk/base-transaction',
	type: 'object',
	required: [
		'id',
		'type',
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
		type: {
			type: 'integer',
			minimum: 0,
		},
		timestamp: {
			type: 'integer',
			minimum: -2147483648,
			maximum: 2147483647,
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderSecondPublicKey: {
			type: 'string',
			format: 'publicKey',
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
