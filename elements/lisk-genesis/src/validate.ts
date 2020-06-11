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
import {
	EMPTY_BUFFER,
	GB_GENERATOR_PUBLIC_KEY,
	GB_REWARD,
	GB_SIGNATURE,
	GB_TRANSACTION_ROOT,
} from './constants';

export const validateGenesisBlock = (
	block:
		| GenesisBlock
		| {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
		  },
): ErrorObject[] => {
	const { header, payload } = block as GenesisBlock;

	// Genesis block schema validation, only check payload length to be zero
	const payloadErrors = validator.validate(genesisBlockSchema, {
		header: EMPTY_BUFFER,
		payload,
	});

	// Genesis block header validation
	const headerErrors = [
		...validator.validate(genesisBlockHeaderSchema, {
			...header,
			asset: EMPTY_BUFFER,
		}),
	];

	// Custom header validation not possible with validator
	if (header.generatorPublicKey !== GB_GENERATOR_PUBLIC_KEY) {
		headerErrors.push({
			message: 'generatorPublicKey must be empty buffer',
			keyword: 'const',
			dataPath: 'header.generatorPublicKey',
			schemaPath: 'properties.generatorPublicKey',
			params: { generatorPublicKey: header.generatorPublicKey },
		});
	}

	if (header.reward !== GB_REWARD) {
		headerErrors.push({
			message: 'reward must be zero',
			keyword: 'const',
			dataPath: 'header.reward',
			schemaPath: 'properties.reward',
			params: { reward: header.reward },
		});
	}

	if (header.signature !== GB_SIGNATURE) {
		headerErrors.push({
			message: 'signature must be empty buffer',
			keyword: 'const',
			dataPath: 'header.signature',
			schemaPath: 'properties.signature',
			params: { signature: header.signature },
		});
	}

	if (header.transactionRoot !== GB_TRANSACTION_ROOT) {
		headerErrors.push({
			message: 'transactionRoot must be hash of empty buffer',
			keyword: 'const',
			dataPath: 'header.transactionRoot',
			schemaPath: 'properties.transactionRoot',
			params: { transactionRoot: header.transactionRoot },
		});
	}

	// Genesis block asset validation
	const assetErrors = [
		...validator.validate(genesisBlockHeaderAssetSchema, header.asset),
	];

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
