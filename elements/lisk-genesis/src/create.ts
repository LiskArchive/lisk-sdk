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
import { Account } from '@liskhq/lisk-chain';
import { hash } from '@liskhq/lisk-cryptography';
import { LiskValidationError } from '@liskhq/lisk-validator';
import {
	EMPTY_BUFFER,
	GB_GENERATOR_PUBLIC_KEY,
	GB_PAYLOAD,
	GB_REWARD,
	GB_SIGNATURE,
	GB_TRANSACTION_ROOT,
	GB_VERSION,
} from './constants';
import {
	GenesisAccountState,
	GenesisBlock,
	GenesisBlockHeaderWithoutId,
	GenesisBlockParams,
} from './types';
import { validateGenesisBlock } from './validate';
import {
	defaultAccountAssetSchema,
	genesisBlockHeaderAssetSchema,
	genesisBlockHeaderSchema,
} from './schema';
import { getHeaderAssetSchemaWithAccountAsset } from './utils/schema';

const getBlockId = (
	header: GenesisBlockHeaderWithoutId,
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
		...{ asset: genesisBlockAssetBuffer },
	});

	return hash(genesisBlockHeaderBuffer);
};

export const createGenesisBlock = (
	params: GenesisBlockParams,
): GenesisBlock => {
	// Default values
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
	const previousBlockID = params.previousBlockID ?? Buffer.from(EMPTY_BUFFER);
	const accountAssetSchema =
		params.accountAssetSchema ?? defaultAccountAssetSchema;

	// Constant values
	const version = GB_VERSION;
	const generatorPublicKey = GB_GENERATOR_PUBLIC_KEY;
	const reward = GB_REWARD;
	const payload = GB_PAYLOAD;
	const signature = GB_SIGNATURE;
	const transactionRoot = GB_TRANSACTION_ROOT;

	const accounts: ReadonlyArray<GenesisAccountState> = params.accounts
		.map(acc => new Account(acc))
		.sort((a, b): number => a.address.compare(b.address));

	for (const account of accounts) {
		account.keys.mandatoryKeys.sort((a, b) => a.compare(b));
		account.keys.optionalKeys.sort((a, b) => a.compare(b));
	}

	const initDelegates: ReadonlyArray<Buffer> = [
		...params.initDelegates,
	].sort((a, b): number => a.compare(b));

	const header: GenesisBlockHeaderWithoutId = {
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
		console.error(errors);
		throw new LiskValidationError(errors);
	}

	const genesisBlock: GenesisBlock = {
		header: {
			...header,
			id: getBlockId(header, accountAssetSchema),
		},
		payload,
	};

	return genesisBlock;
};
