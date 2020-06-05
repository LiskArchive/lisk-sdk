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
export const genesisBlockSchema = {
	$id: '#genesisBlock',
	type: 'object',
	required: ['communityIdentifier', 'payload', 'header'],
	properties: {
		communityIdentifier: {
			type: 'string',
		},
		header: {
			type: 'object',
			required: [
				'version',
				'reward',
				'transactionRoot',
				'timestamp',
				'generatorPublicKey',
				'signature',
			],
			properties: {
				version: {
					type: 'integer',
					minimum: 0,
				},
				height: {
					type: 'integer',
					minimum: 1,
				},
				signature: {
					type: 'string',
					format: 'signature',
				},
				id: {
					type: 'string',
					format: 'hex',
					minLength: 64,
					maxLength: 64,
				},
				reward: {
					type: 'string',
					format: 'amount',
				},

				transactionRoot: {
					type: 'string',
					format: 'hex',
				},
				timestamp: {
					type: 'integer',
					minimum: 0,
				},
				previousBlockID: {
					type: 'string',
					format: 'hex',
				},
				generatorPublicKey: {
					type: 'string',
					format: 'publicKey',
				},
				asset: {
					type: 'object',
					required: [
						'seedReveal',
						'maxHeightPrevoted',
						'maxHeightPreviouslyForged',
					],
					properties: {
						seedReveal: {
							type: 'string',
							format: 'hex',
						},
						maxHeightPrevoted: {
							type: 'integer',
							minimum: 0,
						},
						maxHeightPreviouslyForged: {
							type: 'integer',
							minimum: 0,
						},
					},
				},
			},
		},
		payload: {
			type: 'array',
			items: {
				type: 'object',
				required: ['type', 'nonce', 'senderPublicKey', 'signatures', 'fee'],
				properties: {
					type: {
						type: 'integer',
					},
					fee: {
						type: 'string',
						format: 'amount',
					},
					nonce: {
						type: 'string',
						format: 'amount',
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
					id: {
						type: 'string',
						format: 'hex',
						minLength: 64,
						maxLength: 64,
					},
				},
				additionalProperties: false,
			},
			uniqueItems: true,
		},
	},
	additionalProperties: false,
};
