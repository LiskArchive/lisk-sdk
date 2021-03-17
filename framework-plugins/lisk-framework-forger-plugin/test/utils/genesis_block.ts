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

import { createGenesisBlock, getGenesisBlockJSON as getGenesisJSON } from '@liskhq/lisk-genesis';
import { readGenesisBlockJSON } from '@liskhq/lisk-chain';
import { KeysModule, SequenceModule, testing, TokenModule, DPoSModule } from 'lisk-framework';
import * as genesisBlockJSON from '../fixtures/genesis_block.json';

const defaultModules = [TokenModule, SequenceModule, KeysModule, DPoSModule];
export const defaultAccountSchema = testing.getAccountSchemaFromModules(defaultModules);

export const getGenesisBlockJSON = ({
	timestamp,
}: {
	timestamp: number;
}): Record<string, unknown> => {
	const genesisBlock = readGenesisBlockJSON(genesisBlockJSON, defaultAccountSchema);

	const updatedGenesisBlock = createGenesisBlock({
		initDelegates: genesisBlock.header.asset.initDelegates,
		initRounds: genesisBlock.header.asset.initRounds,
		timestamp,
		accounts: genesisBlock.header.asset.accounts,
		accountAssetSchemas: defaultAccountSchema,
	});

	return getGenesisJSON({
		genesisBlock: updatedGenesisBlock,
		accountAssetSchemas: defaultAccountSchema,
	});
};
