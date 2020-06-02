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

export const blockSchema = {
	$id: 'blockSchema',
	type: 'object',
	properties: {
		header: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		payload: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
	},
	required: ['header', 'payload'],
};

export const signingBlockHeaderSchema = {
	$id: 'signingBlockHeaderSchema',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
		generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: { dataType: 'bytes', fieldNumber: 8 },
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'transactionRoot',
		'generatorPublicKey',
		'reward',
		'asset',
	],
};

export const blockHeaderSchema = {
	...signingBlockHeaderSchema,
	$id: 'blockHeaderSchema',
	properties: {
		...signingBlockHeaderSchema.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

export const baseAccountSchema = {
	$id: 'baseAccountSchema',
	type: 'object',
	properties: {
		address: { dataType: 'bytes', fieldNumber: 1 },
		balance: { dataType: 'uint64', fieldNumber: 2 },
		publicKey: { dataType: 'bytes', fieldNumber: 3 },
		nonce: { dataType: 'uint64', fieldNumber: 4 },
		keys: {
			fieldNumber: 5,
			type: 'object',
			properties: {
				numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
				mandatoryKeys: {
					type: 'array',
					items: { dataType: 'bytes' },
					fieldNumber: 2,
				},
				optionalKeys: {
					type: 'array',
					items: { dataType: 'bytes' },
					fieldNumber: 3,
				},
			},
			required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
		},
		asset: {
			fieldNumber: 6,
			type: 'object',
		},
	},
	required: ['address', 'balance', 'publicKey', 'nonce', 'keys', 'asset'],
};
