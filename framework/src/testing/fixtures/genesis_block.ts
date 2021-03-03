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
import { getGenesisBlockJSON } from '@liskhq/lisk-genesis';
import { DPoSModule } from '../../modules';
import { createGenesisBlock } from '../create_genesis_block';
import { ModuleClass, PartialAccount } from '../types';
import { getAccountSchemaFromModules } from '../utils';
import { defaultAccountsAddresses, defaultDelegates } from './accounts';

export const createGenesisBlockWithAccounts = <T = AccountDefaultProps>(
	modules: ModuleClass[],
): { genesisBlock: GenesisBlock<T>; genesisBlockJSON: Record<string, unknown> } => {
	if (!modules.includes(DPoSModule)) {
		modules.push(DPoSModule);
	}

	const accounts = defaultAccountsAddresses.map(
		accountAddress => ({ address: Buffer.from(accountAddress, 'hex') } as PartialAccount<T>),
	);
	const delegates = defaultDelegates.map(
		delegate =>
			(({
				...delegate,
				address: delegate.address,
			} as unknown) as PartialAccount<T>),
	);
	// Set genesis block timestamp to 1 day in past relative to current date
	const timestamp = Math.floor(new Date().setDate(new Date().getDay() - 1) / 1000);

	const genesisBlock = createGenesisBlock<T>({
		modules,
		accounts: [...accounts, ...delegates] as PartialAccount<T>[],
		initDelegates: delegates.map(delegate => delegate.address),
		timestamp,
	});

	const genesisBlockJSON = getGenesisBlockJSON({
		genesisBlock: genesisBlock as never,
		accountAssetSchemas: getAccountSchemaFromModules(modules),
	});

	return { genesisBlock, genesisBlockJSON };
};
