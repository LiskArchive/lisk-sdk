/*
 * Copyright © 2021 Lisk Foundation
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

import { AccountDefaultProps, GenesisBlock } from '@liskhq/lisk-chain';
import { createGenesisBlock as createGenesis } from '@liskhq/lisk-genesis';
import { GenesisConfig } from '..';
import { ModuleClass, PartialAccount } from './types';
import { getAccountSchemaFromModules } from './utils';

interface CreateGenesisBlock<T> {
	modules: ModuleClass[];
	accounts: PartialAccount<T>[];
	genesisConfig?: GenesisConfig;
	initDelegates?: ReadonlyArray<Buffer>;
	height?: number;
	initRounds?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
}

export const createGenesisBlock = <T = AccountDefaultProps>(
	params: CreateGenesisBlock<T>,
): GenesisBlock<T> => {
	const accountAssetSchemas = getAccountSchemaFromModules(params.modules, params.genesisConfig);

	const initDelegates: ReadonlyArray<Buffer> = params.initDelegates ?? [];
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
	const previousBlockID = params.previousBlockID ?? Buffer.alloc(0);

	return createGenesis<T>({
		accounts: params.accounts,
		initDelegates,
		accountAssetSchemas,
		initRounds,
		height,
		timestamp,
		previousBlockID,
	});
};
