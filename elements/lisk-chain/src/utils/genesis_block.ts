/*
 * Copyright © 2020 Lisk Foundation
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

import { Schema, codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { GenesisBlock, AccountSchema } from '../types';
import { baseAccountSchema, getGenesisBlockHeaderAssetSchema, blockSchema, blockHeaderSchema } from '../schema';

export const readGenesisBlockJSON = (
	genesisBlockJSON: Record<string, unknown>,
	accounts: { [name: string]: AccountSchema },
): GenesisBlock => {
	const accountSchema = {
		...baseAccountSchema,
	} as Schema;
	for (const [name, schema] of Object.entries(accounts)) {
		accountSchema.properties[name] = schema;
	}
	const genesisBlockSchema = {
		...blockSchema,
		properties: {
			...blockSchema.properties,
			header: {
				...blockHeaderSchema,
				properties: {
					...blockHeaderSchema.properties,
					asset: {
						...blockHeaderSchema.properties.asset,
						...getGenesisBlockHeaderAssetSchema(accountSchema),
					},
				},
			},
		},
	};
	const cloned = objects.cloneDeep(genesisBlockJSON);

	if (typeof cloned.header === 'object' && cloned.header !== null) {
		// eslint-disable-next-line no-param-reassign
		delete (cloned as { header: { id: unknown }}).header.id;
	}
	return codec.fromJSON(genesisBlockSchema, cloned);
};
