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

import { Schema } from '@liskhq/lisk-codec';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { validator, ErrorObject } from '@liskhq/lisk-validator';
import { GenesisBlock } from './types';
import {
	genesisBlockSchema,
	genesisBlockHeaderSchema,
	genesisBlockHeaderAssetSchema,
	defaultAccountAssetSchema,
} from './schema';
import {
	bufferArrayContains,
	bufferArrayIdentical,
	bufferArraySubtract,
} from './utils';
import {
	EMPTY_BUFFER,
	GB_GENERATOR_PUBLIC_KEY,
	GB_REWARD,
	GB_SIGNATURE,
	GB_TRANSACTION_ROOT,
} from './constants';
import { getHeaderAssetSchemaWithAccountAsset } from './utils/schema';

export const validateGenesisBlock = (
	block:
		| GenesisBlock
		| {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
		  },
	accountAssetSchema?: Schema,
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
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.generatorPublicKey',
			schemaPath: 'properties.generatorPublicKey',
			params: { allowedValue: GB_GENERATOR_PUBLIC_KEY },
		});
	}

	if (header.reward !== GB_REWARD) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.reward',
			schemaPath: 'properties.reward',
			params: { allowedValue: GB_REWARD },
		});
	}

	if (header.signature !== GB_SIGNATURE) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.signature',
			schemaPath: 'properties.signature',
			params: { allowedValue: GB_SIGNATURE },
		});
	}

	if (header.transactionRoot !== GB_TRANSACTION_ROOT) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.transactionRoot',
			schemaPath: 'properties.transactionRoot',
			params: { allowedValue: GB_TRANSACTION_ROOT },
		});
	}

	// Genesis block asset validation
	const assetSchemaWithAccountAsset = getHeaderAssetSchemaWithAccountAsset(
		genesisBlockHeaderAssetSchema,
		accountAssetSchema ?? defaultAccountAssetSchema,
	);
	const assetErrors = [
		...validator.validate(assetSchemaWithAccountAsset, header.asset),
	];

	const errors = [...payloadErrors, ...headerErrors, ...assetErrors];

	const initDelegates = [...header.asset.initDelegates];
	const initDelegatesSorted = [...header.asset.initDelegates].sort((a, b) =>
		a.compare(b),
	);
	if (!bufferArrayIdentical(initDelegates, initDelegatesSorted)) {
		errors.push({
			message: 'should be lexicographically ordered',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: { initDelegates },
		});
	}

	const accountAddresses = [];
	const delegateAddresses = [];
	let totalBalance = BigInt(0);
	for (const account of header.asset.accounts) {
		accountAddresses.push(account.address);
		totalBalance += BigInt(account.balance);

		if (account.asset.delegate.username !== '') {
			delegateAddresses.push(account.address);
		}

		if (account.publicKey !== undefined) {
			const expectedAddress = getAddressFromPublicKey(account.publicKey);

			if (!expectedAddress.equals(account.address)) {
				errors.push({
					message: 'account addresses not match with publicKey',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts',
					schemaPath: 'properties.accounts',
					params: {
						publicKey: account.publicKey,
						givenAddress: account.address,
						expectedAddress,
					},
				});
			}
		}
	}
	const accountAddressesSorted = [...accountAddresses].sort((a, b) =>
		a.compare(b),
	);

	if (!bufferArrayContains(delegateAddresses, initDelegates)) {
		errors.push({
			message: 'delegate addresses are not present in accounts',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: {
				invalidAddresses: bufferArraySubtract(initDelegates, delegateAddresses),
			},
		});
	}

	if (!bufferArrayIdentical(accountAddresses, accountAddressesSorted)) {
		errors.push({
			message: 'should be lexicographically ordered',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts',
			schemaPath: 'properties.accounts',
			params: { orderKey: 'address' },
		});
	}

	if (totalBalance > BigInt(2 ** 63 - 1)) {
		errors.push({
			message: 'total balance exceed the limit (2^63)-1',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts[].balance',
			schemaPath: 'properties.accounts[].balance',
			params: { totalBalance: totalBalance.toString() },
		});
	}

	return errors;
};
