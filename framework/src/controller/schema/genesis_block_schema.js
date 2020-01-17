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
	$id: '#genesisBlock',
	type: 'object',
	required: [
		'communityIdentifier',
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
		communityIdentifier: {
			type: 'string',
		},
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
			minimum: 0,
		},
		numberOfTransactions: {
			type: 'integer',
			minimum: 0,
		},
		payloadLength: {
			type: 'integer',
			minimum: 0,
		},
		previousBlockId: {
			type: ['null', 'string'],
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		generatorPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		maxHeightPrevoted: {
			type: 'integer',
			minimum: 0,
		},
		maxHeightPreviouslyForged: {
			type: 'integer',
			minimum: 0,
		},
		transactions: {
			type: 'array',
			items: {
				type: 'object',
				required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
				properties: {
					type: {
						type: 'integer',
					},
					fee: {
						type: 'string',
						format: 'amount',
					},
					timestamp: {
						type: 'integer',
						min: 0,
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
			minimum: 1,
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
