/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/*
 * Copyright © 2019 Lisk Foundation
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

import { verifyData } from '@liskhq/lisk-cryptography';
import { MerkleTree } from '@liskhq/lisk-tree';
import { objects } from '@liskhq/lisk-utils';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { Schema } from '@liskhq/lisk-codec';
import { Slots } from './slots';
import { Block, GenesisBlock } from './types';
import { getGenesisBlockHeaderAssetSchema, blockHeaderSchema } from './schema';
import {
	GENESIS_BLOCK_GENERATOR_PUBLIC_KEY,
	GENESIS_BLOCK_REWARD,
	GENESIS_BLOCK_SIGNATURE,
	GENESIS_BLOCK_TRANSACTION_ROOT,
	EMPTY_BUFFER,
	TAG_BLOCK_HEADER,
} from './constants';

export const validateSignature = (
	publicKey: Buffer,
	dataWithoutSignature: Buffer,
	signature: Buffer,
	networkIdentifier: Buffer,
): void => {
	const verified = verifyData(
		TAG_BLOCK_HEADER,
		networkIdentifier,
		dataWithoutSignature,
		signature,
		publicKey,
	);

	if (!verified) {
		throw new Error('Invalid block signature');
	}
};

export const validateReward = (block: Block, maxReward: bigint): void => {
	if (block.header.reward > maxReward) {
		throw new Error(
			`Invalid block reward: ${block.header.reward.toString()} maximum allowed: ${maxReward.toString()}`,
		);
	}
};

const getTransactionRoot = (ids: Buffer[]): Buffer => {
	const tree = new MerkleTree(ids);

	return tree.root;
};

export const validateBlockProperties = (
	block: Block,
	encodedPayload: Buffer,
	maxPayloadLength: number,
): void => {
	if (block.header.previousBlockID.length === 0) {
		throw new Error('Previous block id must not be empty');
	}
	if (encodedPayload.length > maxPayloadLength) {
		throw new Error('Payload length is too long');
	}

	const transactionIds: Buffer[] = [];
	for (const transaction of block.payload) {
		transactionIds.push(transaction.id);
	}

	const transactionRoot = getTransactionRoot(transactionIds);
	if (!transactionRoot.equals(block.header.transactionRoot)) {
		throw new Error('Invalid transaction root');
	}
};

export const validateBlockSlot = (block: Block, lastBlock: Block, slots: Slots): void => {
	const blockSlotNumber = slots.getSlotNumber(block.header.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.header.timestamp);

	if (blockSlotNumber > slots.getSlotNumber() || blockSlotNumber <= lastBlockSlotNumber) {
		throw new Error('Invalid block timestamp');
	}
};

export const validateGenesisBlockHeader = (block: GenesisBlock, accountSchema: Schema): void => {
	const { header, payload } = block;
	const errors = [];
	const headerErrors = validator.validate(
		objects.mergeDeep({}, blockHeaderSchema, {
			properties: {
				version: {
					const: 0,
				},
			},
		}),
		{ ...header, asset: EMPTY_BUFFER },
	);
	if (headerErrors.length) {
		errors.push(...headerErrors);
	}
	const assetErrors = validator.validate(
		getGenesisBlockHeaderAssetSchema(accountSchema),
		header.asset,
	);
	if (assetErrors.length) {
		errors.push(...assetErrors);
	}
	// Custom header validation not possible with validator
	if (!header.generatorPublicKey.equals(GENESIS_BLOCK_GENERATOR_PUBLIC_KEY)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.generatorPublicKey',
			schemaPath: 'properties.generatorPublicKey',
			params: { allowedValue: GENESIS_BLOCK_GENERATOR_PUBLIC_KEY },
		});
	}

	if (header.reward !== GENESIS_BLOCK_REWARD) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.reward',
			schemaPath: 'properties.reward',
			params: { allowedValue: GENESIS_BLOCK_REWARD },
		});
	}

	if (!header.signature.equals(GENESIS_BLOCK_SIGNATURE)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.signature',
			schemaPath: 'properties.signature',
			params: { allowedValue: GENESIS_BLOCK_SIGNATURE },
		});
	}

	if (!header.transactionRoot.equals(GENESIS_BLOCK_TRANSACTION_ROOT)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.transactionRoot',
			schemaPath: 'properties.transactionRoot',
			params: { allowedValue: GENESIS_BLOCK_TRANSACTION_ROOT },
		});
	}
	if (payload.length !== 0) {
		errors.push({
			message: 'Payload length must be zero',
			keyword: 'const',
			dataPath: 'payload',
			schemaPath: 'properties.payload',
			params: { allowedValue: [] },
		});
	}

	if (!objects.bufferArrayUniqueItems(header.asset.initDelegates as Buffer[])) {
		errors.push({
			dataPath: '.initDelegates',
			keyword: 'uniqueItems',
			message: 'must NOT have duplicate items',
			params: {},
			schemaPath: '#/properties/initDelegates/uniqueItems',
		});
	}

	if (!objects.bufferArrayOrderByLex(header.asset.initDelegates as Buffer[])) {
		errors.push({
			message: 'should be lexicographically ordered',
			keyword: 'initDelegates',
			dataPath: 'header.asset.initDelegates',
			schemaPath: 'properties.initDelegates',
			params: { initDelegates: header.asset.initDelegates },
		});
	}

	const accountAddresses = header.asset.accounts.map(a => a.address);
	const copiedAddresses = [...accountAddresses];
	copiedAddresses.sort((a, b) => {
		if (a.length > b.length) {
			return 1;
		}
		if (a.length < b.length) {
			return -1;
		}
		return a.compare(b);
	});

	if (!objects.bufferArrayEqual(accountAddresses, copiedAddresses)) {
		errors.push({
			message: 'should be length and lexicographically ordered',
			keyword: 'accounts',
			dataPath: 'header.asset.accounts',
			schemaPath: 'properties.accounts',
			params: { orderKey: 'address' },
		});
	}

	if (!objects.bufferArrayUniqueItems(accountAddresses)) {
		errors.push({
			dataPath: '.accounts',
			keyword: 'uniqueItems',
			message: 'must NOT have duplicate items',
			params: {},
			schemaPath: '#/properties/accounts/uniqueItems',
		});
	}

	if (errors.length) {
		throw new LiskValidationError(errors);
	}
};
