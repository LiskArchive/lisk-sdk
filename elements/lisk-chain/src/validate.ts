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

import {
	verifyData,
	stringToBuffer,
	bufferToHex,
} from '@liskhq/lisk-cryptography';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { MerkleTree } from '@liskhq/lisk-tree';

import { Slots } from './slots';
import { BlockInstance, GenesisBlock } from './types';

export const validateSignature = (
	block: BlockInstance,
	blockBytes: Buffer,
	networkIdentifier: string,
): void => {
	const signatureLength = 64;
	const dataWithoutSignature = blockBytes.slice(
		0,
		blockBytes.length - signatureLength,
	);
	const blockWithNetworkIdentifierBytes = Buffer.concat([
		Buffer.from(networkIdentifier, 'hex'),
		dataWithoutSignature,
	]);

	const verified = verifyData(
		blockWithNetworkIdentifierBytes,
		block.blockSignature,
		block.generatorPublicKey,
	);

	if (!verified) {
		throw new Error('Invalid block signature');
	}
};

export const validatePreviousBlockProperty = (
	block: BlockInstance,
	genesisBlock: GenesisBlock,
): void => {
	const isGenesisBlock =
		block.id === genesisBlock.id &&
		!block.previousBlockId &&
		block.height === 1;
	const propertyIsValid =
		isGenesisBlock ||
		(block.id !== genesisBlock.id &&
			block.previousBlockId &&
			block.height !== 1);

	if (!propertyIsValid) {
		throw new Error('Invalid previous block');
	}
};

export const validateReward = (
	block: BlockInstance,
	maxReward: bigint,
): void => {
	if (block.reward > maxReward) {
		throw new Error(
			`Invalid block reward: ${block.reward.toString()} maximum allowed: ${maxReward.toString()}`,
		);
	}
};

export const getTransactionRoot = (ids: ReadonlyArray<string>): string => {
	const idsAsBuffers = ids.map(id => stringToBuffer(id));
	const tree = new MerkleTree(idsAsBuffers);

	return bufferToHex(tree.root);
};

export const validateTransactionRoot = (
	block: BlockInstance,
	maxPayloadLength: number,
): void => {
	if (block.payloadLength > maxPayloadLength) {
		throw new Error('Payload length is too long');
	}

	let totalAmount = BigInt(0);
	let totalFee = BigInt(0);
	const transactionIds: string[] = [];
	const appliedTransactions: { [id: string]: BaseTransaction } = {};

	block.transactions.forEach(transaction => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (appliedTransactions[transaction.id]) {
			throw new Error(`Encountered duplicate transaction: ${transaction.id}`);
		}

		transactionIds.push(transaction.id);
		appliedTransactions[transaction.id] = transaction;
		// eslint-disable-next-line
		totalAmount += BigInt((transaction.asset as any).amount || 0);
		totalFee += BigInt(transaction.fee);
	});

	const transactionRoot = getTransactionRoot(transactionIds);

	if (transactionRoot !== block.transactionRoot) {
		throw new Error('Invalid transaction root');
	}

	if (totalAmount !== BigInt(block.totalAmount)) {
		throw new Error('Invalid total amount');
	}

	if (totalFee !== block.totalFee) {
		throw new Error('Invalid total fee');
	}
};

// TODO: Move to DPOS validation
export const validateBlockSlot = (
	block: BlockInstance,
	lastBlock: BlockInstance,
	slots: Slots,
): void => {
	const blockSlotNumber = slots.getSlotNumber(block.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	if (
		blockSlotNumber > slots.getSlotNumber() ||
		blockSlotNumber <= lastBlockSlotNumber
	) {
		throw new Error('Invalid block timestamp');
	}
};
