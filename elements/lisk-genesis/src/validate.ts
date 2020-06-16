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
	bufferArraySubtract,
	bufferArrayOrderByLex,
	bufferArrayContainsSome,
	bufferArrayUniqueItems,
} from './utils';
import {
	EMPTY_BUFFER,
	GENESIS_BLOCK_GENERATOR_PUBLIC_KEY,
	GENESIS_BLOCK_MAX_BALANCE,
	GENESIS_BLOCK_REWARD,
	GENESIS_BLOCK_SIGNATURE,
	GENESIS_BLOCK_TRANSACTION_ROOT,
} from './constants';
import { getHeaderAssetSchemaWithAccountAsset } from './utils/schema';

export const validateGenesisBlock = (
	block:
		| GenesisBlock
		| {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				[key: string]: any;
		  },
	options: { roundLength: number; accountAssetSchema?: Schema },
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
	if (header.generatorPublicKey !== GENESIS_BLOCK_GENERATOR_PUBLIC_KEY) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.generatorPublicKey',
			schemaPath: 'properties.generatorPublicKey',
			params: { allowedValue: GENESIS_BLOCK_GENERATOR_PUBLIC_KEY },
		});
	}

	if (header.reward !== GENESIS_BLOCK_REWARD) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.reward',
			schemaPath: 'properties.reward',
			params: { allowedValue: GENESIS_BLOCK_REWARD },
		});
	}

	if (header.signature !== GENESIS_BLOCK_SIGNATURE) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.signature',
			schemaPath: 'properties.signature',
			params: { allowedValue: GENESIS_BLOCK_SIGNATURE },
		});
	}

	if (header.transactionRoot !== GENESIS_BLOCK_TRANSACTION_ROOT) {
		headerErrors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.transactionRoot',
			schemaPath: 'properties.transactionRoot',
			params: { allowedValue: GENESIS_BLOCK_TRANSACTION_ROOT },
		});
	}

	// Genesis block asset validation
	const assetSchemaWithAccountAsset = getHeaderAssetSchemaWithAccountAsset(
		genesisBlockHeaderAssetSchema,
		options.accountAssetSchema ?? defaultAccountAssetSchema,
	);
	const assetErrors = [
		...validator.validate(assetSchemaWithAccountAsset, header.asset),
	];

	const initDelegates = [...header.asset.initDelegates];
	const accountAddresses = [];
	const delegateAddresses = [];
	let totalBalance = BigInt(0);

	for (const account of header.asset.accounts) {
		accountAddresses.push(account.address);
		totalBalance += BigInt(account.balance);

		if (account.asset.delegate.username !== '') {
			delegateAddresses.push(account.address);
		}

		if (
			account.publicKey !== undefined &&
			!Buffer.alloc(0).equals(account.publicKey)
		) {
			const expectedAddress = getAddressFromPublicKey(account.publicKey);

			if (!expectedAddress.equals(account.address)) {
				assetErrors.push({
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

		if (!bufferArrayOrderByLex(account.keys.mandatoryKeys)) {
			assetErrors.push({
				message: 'should be lexicographically ordered',
				keyword: 'mandatoryKeys',
				dataPath: '.accounts[0].keys.mandatoryKeys',
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
				params: { mandatoryKeys: account.keys.mandatoryKeys },
			});
		}

		if (!bufferArrayUniqueItems(account.keys.mandatoryKeys)) {
			assetErrors.push({
				dataPath: '.accounts[0].keys.mandatoryKeys',
				keyword: 'uniqueItems',
				message: 'should NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/mandatoryKeys/uniqueItems',
			});
		}

		if (!bufferArrayOrderByLex(account.keys.optionalKeys)) {
			assetErrors.push({
				message: 'should be lexicographically ordered',
				keyword: 'optionalKeys',
				dataPath: '.accounts[0].keys.optionalKeys',
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/optionalKeys',
				params: { optionalKeys: account.keys.optionalKeys },
			});
		}

		if (!bufferArrayUniqueItems(account.keys.optionalKeys)) {
			assetErrors.push({
				dataPath: '.accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message: 'should NOT have duplicate items',
				params: {},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/optionalKeys/uniqueItems',
			});
		}

		if (
			bufferArrayContainsSome(
				account.keys.mandatoryKeys,
				account.keys.optionalKeys,
			)
		) {
			assetErrors.push({
				dataPath:
					'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message:
					'should NOT have duplicate items among mandatoryKeys and optionalKeys',
				params: {},
				schemaPath: '#/properties/accounts/items/properties/keys',
			});
		}

		if (
			account.keys.mandatoryKeys.length + account.keys.optionalKeys.length >
			64
		) {
			assetErrors.push({
				dataPath:
					'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'maxItems',
				message: 'should not have more than 64 keys',
				params: { maxItems: 64 },
				schemaPath: '#/properties/accounts/items/properties/keys',
			});
		}

		if (account.keys.numberOfSignatures < account.keys.mandatoryKeys.length) {
			assetErrors.push({
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'min',
				message: `should be minimum of length of mandatoryKeys`,
				params: { min: account.keys.mandatoryKeys.length },
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			});
		}

		if (
			account.keys.numberOfSignatures >
			account.keys.mandatoryKeys.length + account.keys.optionalKeys.length
		) {
			assetErrors.push({
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'max',
				message: `should be maximum of length of mandatoryKeys and optionalKeys`,
				params: {
					max:
						account.keys.mandatoryKeys.length +
						account.keys.optionalKeys.length,
				},
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			});
		}
	}

	if (!bufferArrayUniqueItems(initDelegates)) {
		assetErrors.push({
			dataPath: '.initDelegates',
			keyword: 'uniqueItems',
			message: 'should NOT have duplicate items',
			params: {},
			schemaPath: '#/properties/initDelegates/uniqueItems',
		});
	}

	if (!bufferArrayOrderByLex(initDelegates)) {
		assetErrors.push({
			message: 'should be lexicographically ordered',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: { initDelegates },
		});
	}

	if (initDelegates.length > options.roundLength) {
		assetErrors.push({
			keyword: 'maxItems',
			dataPath: '.initDelegates',
			schemaPath: '#/properties/initDelegates/maxItems',
			params: { limit: options.roundLength },
			message: 'should NOT have more than 4 items',
		});
	}

	if (!bufferArrayContains(delegateAddresses, initDelegates)) {
		assetErrors.push({
			message: 'delegate addresses are not present in accounts',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: {
				invalidAddresses: bufferArraySubtract(initDelegates, delegateAddresses),
			},
		});
	}

	if (!bufferArrayOrderByLex(accountAddresses)) {
		assetErrors.push({
			message: 'should be lexicographically ordered',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts',
			schemaPath: 'properties.accounts',
			params: { orderKey: 'address' },
		});
	}

	if (!bufferArrayUniqueItems(accountAddresses)) {
		assetErrors.push({
			dataPath: '.accounts',
			keyword: 'uniqueItems',
			message: 'should NOT have duplicate items',
			params: {},
			schemaPath: '#/properties/accounts/uniqueItems',
		});
	}

	if (totalBalance > GENESIS_BLOCK_MAX_BALANCE) {
		assetErrors.push({
			message: 'total balance exceed the limit (2^63)-1',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts[].balance',
			schemaPath: 'properties.accounts[].balance',
			params: { totalBalance: totalBalance.toString() },
		});
	}

	return [...payloadErrors, ...headerErrors, ...assetErrors];
};
