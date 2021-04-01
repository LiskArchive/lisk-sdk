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
import { createGenesisBlock as createGenesis, getGenesisBlockJSON } from '@liskhq/lisk-genesis';

import { ModuleClass, PartialAccount } from './types';
import { getAccountSchemaFromModules } from './utils';
import { GenesisConfig } from '../types';
import { defaultAccounts } from './fixtures/accounts';

interface CreateGenesisBlock<T> {
	modules: ModuleClass[];
	accounts?: PartialAccount<T>[];
	genesisConfig?: GenesisConfig;
	initDelegates?: ReadonlyArray<Buffer>;
	height?: number;
	initRounds?: number;
	timestamp?: number;
	previousBlockID?: Buffer;
}

export const createGenesisBlock = <T = AccountDefaultProps>(
	params: CreateGenesisBlock<T>,
): { genesisBlock: GenesisBlock<T>; genesisBlockJSON: Record<string, unknown> } => {
	const accounts = params.accounts ?? defaultAccounts();
	const initDelegates: ReadonlyArray<Buffer> =
		params.initDelegates ?? defaultAccounts().map(delegate => delegate.address);
	const accountAssetSchemas = getAccountSchemaFromModules(params.modules, params.genesisConfig);
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	// Set genesis block timestamp to 1 day in past relative to current date
	const today = new Date();
	const yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24);
	const defaultTimestamp = Math.floor(yesterday.getTime() / 1000);
	const timestamp = params.timestamp ?? defaultTimestamp;
	const previousBlockID = params.previousBlockID ?? Buffer.alloc(0);

	const genesisBlock = createGenesis<T>({
		accounts,
		initDelegates,
		accountAssetSchemas,
		initRounds,
		height,
		timestamp,
		previousBlockID,
	});

	const genesisBlockJSON = getGenesisBlockJSON({
		genesisBlock: genesisBlock as never,
		accountAssetSchemas,
	});

	return {
		genesisBlock,
		genesisBlockJSON,
	};
};
