/*
 * Copyright © 2023 Lisk Foundation
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

import {
	NUM_BYTES_ADDRESS,
	MAX_LENGTH_NAME,
	LENGTH_PROOF_OF_POSSESSION,
	LENGTH_BLS_KEY,
	LENGTH_GENERATOR_KEY,
} from './constants';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#genesis-poa-store-schema
export const genesisPoAStoreSchema = {
	type: 'object',
	required: ['validators', 'snapshotSubstore'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'name', 'blsKey', 'proofOfPossession', 'generatorKey'],
				properties: {
					address: {
						dataType: 'bytes',
						minLength: NUM_BYTES_ADDRESS,
						maxLength: NUM_BYTES_ADDRESS,
						fieldNumber: 1,
					},
					name: {
						dataType: 'string',
						minLength: 1,
						maxLength: MAX_LENGTH_NAME,
						fieldNumber: 2,
					},
					blsKey: {
						dataType: 'bytes',
						minLength: LENGTH_BLS_KEY,
						maxLength: LENGTH_BLS_KEY,
						fieldNumber: 3,
					},
					proofOfPossession: {
						dataType: 'bytes',
						minLength: LENGTH_PROOF_OF_POSSESSION,
						maxLength: LENGTH_PROOF_OF_POSSESSION,
						fieldNumber: 4,
					},
					generatorKey: {
						dataType: 'bytes',
						minLength: LENGTH_GENERATOR_KEY,
						maxLength: LENGTH_GENERATOR_KEY,
						fieldNumber: 5,
					},
				},
			},
		},
		snapshotSubstore: {
			type: 'object',
			properties: {
				activeValidators: {
					type: 'array',
					fieldNumber: 1,
					items: {
						type: 'object',
						required: ['address', 'weight'],
						properties: {
							address: {
								dataType: 'bytes',
								minLength: NUM_BYTES_ADDRESS,
								maxLength: NUM_BYTES_ADDRESS,
								fieldNumber: 1,
							},
							weight: {
								dataType: 'uint64',
								fieldNumber: 2,
							},
						},
					},
				},
				threshold: {
					dataType: 'uint64',
					fieldNumber: 2,
				},
			},
			required: ['activeValidators', 'threshold'],
		},
	},
};
