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
	bufferArrayLexicographicallyOrdered,
	bufferArrayContainsSome,
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

		if (!bufferArrayLexicographicallyOrdered(account.keys.mandatoryKeys)) {
			errors.push({
				message: 'should be lexicographically ordered',
				keyword: 'mandatoryKeys',
				dataPath: '.accounts[0].keys.mandatoryKeys',
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/mandatoryKeys',
				params: { mandatoryKeys: account.keys.mandatoryKeys },
			});
		}

		if (!bufferArrayLexicographicallyOrdered(account.keys.optionalKeys)) {
			errors.push({
				message: 'should be lexicographically ordered',
				keyword: 'optionalKeys',
				dataPath: '.accounts[0].keys.optionalKeys',
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/optionalKeys',
				params: { optionalKeys: account.keys.optionalKeys },
			});
		}

		if (
			bufferArrayContainsSome(
				account.keys.mandatoryKeys,
				account.keys.optionalKeys,
			)
		) {
			errors.push({
				dataPath:
					'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'uniqueItems',
				message:
					'should NOT have duplicate items among mandatoryKeys and optionalKeys',
				params: {},
				schemaPath: '#/properties/accounts/items/properties/keys',
			});
		}

		const uniqueMandatoryKeys = [...new Set([...account.keys.mandatoryKeys])];
		const uniqueOptionalKeys = [...new Set([...account.keys.optionalKeys])];
		const uniqueAllKeys = [
			...new Set([...uniqueMandatoryKeys, ...uniqueOptionalKeys]),
		];

		if (uniqueAllKeys.length > 64) {
			errors.push({
				dataPath:
					'.accounts[0].keys.mandatoryKeys,.accounts[0].keys.optionalKeys',
				keyword: 'maxItems',
				message: 'should not have more than 64 keys',
				params: { maxItems: 64 },
				schemaPath: '#/properties/accounts/items/properties/keys',
			});
		}

		if (account.keys.numberOfSignatures < uniqueMandatoryKeys.length) {
			errors.push({
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'min',
				message: `should be minimum of length of mandatoryKeys`,
				params: { min: account.keys.mandatoryKeys.length },
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			});
		}

		if (account.keys.numberOfSignatures > uniqueAllKeys.length) {
			errors.push({
				dataPath: '.accounts[0].keys.numberOfSignatures',
				keyword: 'max',
				message: `should be maximum of length of mandatoryKeys and optionalKeys`,
				params: { max: uniqueAllKeys.length },
				schemaPath:
					'#/properties/accounts/items/properties/keys/properties/numberOfSignatures',
			});
		}
	}

	if (!bufferArrayLexicographicallyOrdered(initDelegates)) {
		errors.push({
			message: 'should be lexicographically ordered',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: { initDelegates },
		});
	}

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

	if (!bufferArrayLexicographicallyOrdered(accountAddresses)) {
		errors.push({
			message: 'should be lexicographically ordered',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts',
			schemaPath: 'properties.accounts',
			params: { orderKey: 'address' },
		});
	}

	if (totalBalance > BigInt(2) ** BigInt(63) - BigInt(1)) {
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
