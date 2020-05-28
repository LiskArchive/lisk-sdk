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

import { Slots } from './slots';
import { Block } from './types';
import { BufferSet } from './utils';

export const validateSignature = (
	publicKey: Buffer,
	dataWithoutSignature: Buffer,
	signature: Buffer,
	networkIdentifier: Buffer,
): void => {
	const blockWithNetworkIdentifierBytes = Buffer.concat([
		networkIdentifier,
		dataWithoutSignature,
	]);

	const verified = verifyData(
		blockWithNetworkIdentifierBytes,
		signature,
		publicKey,
	);

	if (!verified) {
		throw new Error('Invalid block signature');
	}
};

export const validatePreviousBlockProperty = (
	block: Block,
	genesisBlock: Block,
): void => {
	const isGenesisBlock =
		block.header.id.equals(genesisBlock.header.id) &&
		block.header.previousBlockID.length === 0 &&
		block.header.height === 1;
	const propertyIsValid =
		isGenesisBlock ||
		(!block.header.id.equals(genesisBlock.header.id) &&
			block.header.previousBlockID.length > 0 &&
			block.header.height !== 1);

	if (!propertyIsValid) {
		throw new Error('Invalid previous block');
	}
};

export const validateReward = (block: Block, maxReward: bigint): void => {
	if (block.header.reward > maxReward) {
		throw new Error(
			`Invalid block reward: ${block.header.reward.toString()} maximum allowed: ${maxReward.toString()}`,
		);
	}
};

export const getTransactionRoot = (ids: Buffer[]): Buffer => {
	const tree = new MerkleTree(ids);

	return tree.root;
};

export const validateBlockProperties = (
	block: Block,
	encodedPayload: Buffer,
	maxPayloadLength: number,
): void => {
	if (encodedPayload.length > maxPayloadLength) {
		throw new Error('Payload length is too long');
	}

	const transactionIds: Buffer[] = [];
	const appliedTransactions = new BufferSet();

	block.payload.forEach(transaction => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (appliedTransactions.has(transaction.id)) {
			throw new Error(
				`Encountered duplicate transaction: ${transaction.id.toString('hex')}`,
			);
		}
		transactionIds.push(transaction.id);
		appliedTransactions.add(transaction.id);
	});

	const transactionRoot = getTransactionRoot(transactionIds);

	if (!transactionRoot.equals(block.header.transactionRoot)) {
		throw new Error('Invalid transaction root');
	}
};

export const validateBlockSlot = (
	block: Block,
	lastBlock: Block,
	slots: Slots,
): void => {
	const blockSlotNumber = slots.getSlotNumber(block.header.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.header.timestamp);

	if (
		blockSlotNumber > slots.getSlotNumber() ||
		blockSlotNumber <= lastBlockSlotNumber
	) {
		throw new Error('Invalid block timestamp');
	}
};
