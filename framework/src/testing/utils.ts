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

import { AccountSchema } from '@liskhq/lisk-chain';
import { GenesisConfig } from '..';
import { ModuleClass } from './types';

export const getAccountSchemaFromModules = (
	modules: ModuleClass[],
	genesisConfig?: GenesisConfig,
): { [key: string]: AccountSchema } => {
	const accountSchemas: { [key: string]: AccountSchema } = {};

	for (const Klass of modules) {
		const m = new Klass(genesisConfig ?? ({} as never));
		if (m.accountSchema) {
			accountSchemas[m.name] = m.accountSchema as AccountSchema;
		}
	}

	return accountSchemas;
};
