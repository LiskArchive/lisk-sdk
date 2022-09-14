/*
 * Copyright © 2022 Lisk Foundation
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

export const blockSchemaV2 = {
	$id: '/block/v2',
	type: 'object',
	properties: {
		header: {
			dataType: 'bytes',
			fieldNumber: 1,
		},
		transactions: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
	},
	required: ['header', 'transactions'],
};

const HASH_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;
const SIGNATURE_LENGTH = 64;

export const blockHeaderSchemaV2 = {
	$id: '/block/v2/header/',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		transactionRoot: {
			dataType: 'bytes',
			fieldNumber: 5,
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		generatorPublicKey: {
			dataType: 'bytes',
			fieldNumber: 6,
			minLength: PUBLIC_KEY_LENGTH,
			maxLength: PUBLIC_KEY_LENGTH,
		},
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: { dataType: 'bytes', fieldNumber: 8 },
		signature: {
			dataType: 'bytes',
			fieldNumber: 9,
			minLength: SIGNATURE_LENGTH,
			maxLength: SIGNATURE_LENGTH,
		},
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
