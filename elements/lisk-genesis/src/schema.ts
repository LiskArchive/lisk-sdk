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

export const genesisAccountDBSchema = baseAccountSchema;
export const genesisBlockDBSchema = blockSchema;
export const genesisBlockHeaderDBSchema = blockHeaderSchema;
export const genesisBlockHeaderAssetDBSchema = {
	$id: '/genesis_block/header/asset',
	type: 'object',
	required: ['accounts', 'initDelegates', 'initRounds'],
	properties: {
		accounts: {
			type: 'array',
			items: {
				...genesisAccountDBSchema,
			},
			fieldNumber: 1,
		},
		initDelegates: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 2,
		},
		initRounds: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};
