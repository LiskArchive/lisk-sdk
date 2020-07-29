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
import { GenesisBlock, AccountSchema } from '../types';
import { baseAccountSchema, getGenesisBlockHeaderAssetSchema } from '../schema';

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
	const genesisBlockSchema = getGenesisBlockHeaderAssetSchema(accountSchema);
	return codec.fromJSON(genesisBlockSchema, genesisBlockJSON);
};
