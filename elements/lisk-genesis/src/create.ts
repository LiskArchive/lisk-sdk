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
import {
	getAccountSchemaWithDefault,
	getGenesisBlockHeaderAssetSchema,
	Account,
	GenesisBlock,
	blockHeaderSchema,
} from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import {
	EMPTY_BUFFER,
	GENESIS_BLOCK_GENERATOR_PUBLIC_KEY,
	GENESIS_BLOCK_REWARD,
	GENESIS_BLOCK_SIGNATURE,
	GENESIS_BLOCK_TRANSACTION_ROOT,
	GENESIS_BLOCK_VERSION,
} from './constants';
import {
	GenesisBlockHeaderWithoutId,
	GenesisBlockParams,
	GenesisBlockJSONParams,
	accountAssetSchemas,
} from './types';

export const getGenesisBlockSchema = (accountSchema: accountAssetSchemas): Schema =>
	objects.mergeDeep(
		{
			$id: '/block/genesis',
			type: 'object',
			required: ['header', 'payload'],
			properties: {
				header: {
					fieldNumber: 1,
					type: 'object',
				},
				payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2, const: [] },
			},
		},
		{
			properties: {
				header: objects.mergeDeep({}, blockHeaderSchema, {
					$id: '/block/genesis/header/id',
					properties: {
						id: {
							dataType: 'bytes',
						},
						asset: getGenesisBlockHeaderAssetSchema(getAccountSchemaWithDefault(accountSchema)),
					},
				}),
			},
		},
	) as Schema;

const getBlockId = (header: GenesisBlockHeaderWithoutId, accountSchema: Schema): Buffer => {
	// eslint-disable-next-line
	const genesisBlockAssetBuffer = codec.encode(
		getGenesisBlockHeaderAssetSchema(accountSchema),
		header.asset,
	);

	const genesisBlockHeaderBuffer = codec.encode(blockHeaderSchema, {
		...header,
		asset: genesisBlockAssetBuffer,
	});

	return hash(genesisBlockHeaderBuffer);
};

const createAccount = <T>(account: Account, defaultAccount: Record<string, unknown>): Account =>
	objects.mergeDeep({}, objects.cloneDeep(defaultAccount), account) as Account<T>;

export const createGenesisBlock = (params: GenesisBlockParams): GenesisBlock => {
	// Default values
	const initRounds = params.initRounds ?? 3;
	const height = params.height ?? 0;
	const timestamp = params.timestamp ?? Math.floor(Date.now() / 1000);
	const previousBlockID = params.previousBlockID ?? Buffer.from(EMPTY_BUFFER);
	const { default: defaultAccount, ...accountSchema } = getAccountSchemaWithDefault(
		params.accountAssetSchemas,
	);

	// Constant values
	const version = GENESIS_BLOCK_VERSION;
	const generatorPublicKey = GENESIS_BLOCK_GENERATOR_PUBLIC_KEY;
	const reward = GENESIS_BLOCK_REWARD;
	const signature = GENESIS_BLOCK_SIGNATURE;
	const transactionRoot = GENESIS_BLOCK_TRANSACTION_ROOT;

	const accounts: ReadonlyArray<Account> = params.accounts
		.map(account => createAccount(account, defaultAccount))
		.sort((a, b): number => a.address.compare(b.address));

	const initDelegates: ReadonlyArray<Buffer> = [...params.initDelegates].sort((a, b): number =>
		a.compare(b),
	);

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

	const genesisBlock: GenesisBlock = {
		header: {
			...header,
			id: getBlockId(header, accountSchema),
		},
		payload: [],
	};

	return genesisBlock;
};

export const getGenesisBlockJSON = (params: GenesisBlockJSONParams): Record<string, unknown> =>
	codec.toJSON(getGenesisBlockSchema(params.accountAssetSchemas), params.genesisBlock);
