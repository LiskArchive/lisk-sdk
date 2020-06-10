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

import { validator, ErrorObject } from '@liskhq/lisk-validator';
import { GenesisBlock } from './types';
import {
	genesisBlockSchema,
	genesisBlockHeaderSchema,
	genesisBlockHeaderAssetSchema,
} from './schema';
import { bufferArrayContains, bufferArrayIdentical } from './utils';

export const validateGenesisBlock = (
	block:
		| GenesisBlock
		| {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
		  },
): ErrorObject[] => {
	const { header, payload } = block as GenesisBlock;

	const payloadErrors = validator.validate(genesisBlockSchema, {
		header: Buffer.alloc(0),
		payload,
	});
	const headerErrors = validator.validate(genesisBlockHeaderSchema, header);
	const assetErrors = validator.validate(
		genesisBlockHeaderAssetSchema,
		header.asset,
	);
	const errors = [...payloadErrors, ...headerErrors, ...assetErrors];

	const accountAddresses = header.asset.accounts.map(a => a.address);
	if (!bufferArrayContains(accountAddresses, [...header.asset.initDelegates])) {
		errors.push({
			message: 'Initial delegate addresses are not present in accounts',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: { accountAddresses, initDelegates: header.asset.initDelegates },
		});
	}

	const accountAddressesSorted = accountAddresses.sort((a, b) => a.compare(b));
	if (!bufferArrayIdentical(accountAddresses, accountAddressesSorted)) {
		errors.push({
			message: 'Accounts are not sorted by address',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts',
			schemaPath: 'properties.accounts',
			params: { accountAddresses },
		});
	}
	return errors;
};
