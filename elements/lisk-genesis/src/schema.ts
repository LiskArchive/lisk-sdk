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

import {
	blockSchema,
	baseAccountSchema,
	blockHeaderSchema,
} from '@liskhq/lisk-chain';
import { mergeDeep } from './utils';
import { EMPTY_BUFFER, EMPTY_HASH } from './constants';

export const genesisAccountSchema = baseAccountSchema;
export const genesisBlockSchema: object = mergeDeep({}, blockSchema, {
	properties: {
		payload: {
			minLength: 0,
			maxLength: 0,
		},
	},
});
export const genesisBlockHeaderSchema: object = mergeDeep(
	{},
	blockHeaderSchema,
	{
		properties: {
			height: {
				minimum: 0,
			},
			version: {
				const: 0,
			},
			generatorPublicKey: {
				const: EMPTY_BUFFER,
			},
			reward: {
				const: BigInt(0),
			},
			signature: {
				const: EMPTY_BUFFER,
			},
			transactionRoot: {
				const: EMPTY_HASH,
			},
		},
	},
);
export const genesisBlockHeaderAssetDBSchema = {
	$id: '/genesis_block/header/asset',
	type: 'object',
	required: ['accounts', 'initDelegates', 'initRounds'],
	properties: {
		accounts: {
			type: 'array',
			items: {
				...genesisAccountSchema,
			},
			fieldNumber: 1,
			uniqueItems: true,
		},
		initDelegates: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
			minLength: 1,
			uniqueItems: true,
		},
		initRounds: {
			dataType: 'uint32',
			fieldNumber: 3,
			minimum: 3,
		},
	},
};
