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

import { codec, Schema } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { LiskValidationError } from '@liskhq/lisk-validator';
import {
	EMPTY_BUFFER,
	GENESIS_BLOCK_GENERATOR_PUBLIC_KEY,
	GENESIS_BLOCK_PAYLOAD,
	GENESIS_BLOCK_REWARD,
	GENESIS_BLOCK_SIGNATURE,
	GENESIS_BLOCK_TRANSACTION_ROOT,
	GENESIS_BLOCK_VERSION,
} from './constants';
import {
	DefaultAccountAsset,
	GenesisAccountState,
	GenesisBlock,
	GenesisBlockHeaderWithoutId,
	GenesisBlockParams,
	PartialReq,
} from './types';
import { validateGenesisBlock } from './validate';
import {
	defaultAccountAssetSchema,
	genesisBlockHeaderAssetSchema,
	genesisBlockHeaderSchema,
} from './schema';
import { getHeaderAssetSchemaWithAccountAsset } from './utils/schema';

// eslint-disable-next-line import/order
import cloneDeep = require('lodash.clonedeep');

const getBlockId = <T>(
	header: GenesisBlockHeaderWithoutId<T>,
	accountAssetSchema: Schema,
): Buffer => {
	// eslint-disable-next-line
	const genesisBlockAssetBuffer = codec.encode(
		getHeaderAssetSchemaWithAccountAsset(
			genesisBlockHeaderAssetSchema,
			accountAssetSchema,
		),
		header.asset,
	);

	const genesisBlockHeaderBuffer = codec.encode(genesisBlockHeaderSchema, {
		...header,
		asset: genesisBlockAssetBuffer,
	});

	return hash(genesisBlockHeaderBuffer);
};

const createAccount = <T>(
	account: PartialReq<GenesisAccountState<T>, 'address'>,
): GenesisAccountState<T> => ({
	address: account.address,
	publicKey: account.publicKey ?? Buffer.alloc(0),
	balance: account.balance ?? BigInt(0),
	nonce: account.nonce ?? BigInt(0),
	keys: account.keys
		? {
				mandatoryKeys: [
					...account.keys.mandatoryKeys.sort((a, b) => a.compare(b)),
				],
				optionalKeys: [
					...account.keys.optionalKeys.sort((a, b) => a.compare(b)),
				],
				numberOfSignatures: account.keys.numberOfSignatures,
		  }
		: {
				mandatoryKeys: [],
				optionalKeys: [],
				numberOfSignatures: 0,
		  },
	asset: account.asset ? cloneDeep(account.asset) : ({} as T),
});

export const createGenesisBlock = <T = DefaultAccountAsset>(
	params: GenesisBlockParams<T>,
): GenesisBlock<T> => {
	// Default values
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
	const previousBlockID = params.previousBlockID ?? Buffer.from(EMPTY_BUFFER);
	const accountAssetSchema =
		params.accountAssetSchema ?? defaultAccountAssetSchema;

	// Constant values
	const version = GENESIS_BLOCK_VERSION;
	const generatorPublicKey = GENESIS_BLOCK_GENERATOR_PUBLIC_KEY;
	const reward = GENESIS_BLOCK_REWARD;
	const payload = GENESIS_BLOCK_PAYLOAD;
	const signature = GENESIS_BLOCK_SIGNATURE;
	const transactionRoot = GENESIS_BLOCK_TRANSACTION_ROOT;

	const accounts: ReadonlyArray<GenesisAccountState<T>> = params.accounts
		.map(createAccount)
		.sort((a, b): number => a.address.compare(b.address));

	const initDelegates: ReadonlyArray<Buffer> = [
		...params.initDelegates,
	].sort((a, b): number => a.compare(b));

	const header: GenesisBlockHeaderWithoutId<T> = {
		generatorPublicKey,
		height,
		previousBlockID,
		reward,
		signature,
		timestamp,
		transactionRoot,
		version,
		asset: {
			initRounds,
			initDelegates,
			accounts,
		},
	};

	const errors = validateGenesisBlock(
		{ header, payload },
		{ accountAssetSchema, roundLength: params.roundLength },
	);
	if (errors.length) {
		throw new LiskValidationError(errors);
	}

	const genesisBlock: GenesisBlock<T> = {
		header: {
			...header,
			id: getBlockId<T>(header, accountAssetSchema),
		},
		payload: [],
	};

	return genesisBlock;
};
