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

import { hash, verifyData } from '@liskhq/lisk-cryptography';
import { BaseTransaction } from '@liskhq/lisk-transactions';

import { Slots } from './slots';
import { BlockInstance } from './types';

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
	const hashedBlock = hash(
		Buffer.concat([
			Buffer.from(networkIdentifier, 'hex'),
			dataWithoutSignature,
		]),
	);

	const verified = verifyData(
		hashedBlock,
		block.blockSignature,
		block.generatorPublicKey,
	);

	if (!verified) {
		throw new Error('Invalid block signature');
	}
};

export const validatePreviousBlockProperty = (
	block: BlockInstance,
	genesisBlock: BlockInstance,
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
	expectedReward: string,
): void => {
	const expectedRewardBigInt = BigInt(expectedReward);

	if (block.height !== 1 && expectedRewardBigInt !== BigInt(block.reward)) {
		throw new Error(
			`Invalid block reward: ${block.reward.toString()} expected: ${expectedReward}`,
		);
	}
};

export const validatePayload = (
	block: BlockInstance,
	maxPayloadLength: number,
): void => {
	if (block.payloadLength > maxPayloadLength) {
		throw new Error('Payload length is too long');
	}

	// tslint:disable-next-line no-let
	let totalAmount = BigInt(0);
	// tslint:disable-next-line no-let
	let totalFee = BigInt(0);
	const transactionsBytesArray: Buffer[] = [];
	// tslint:disable-next-line readonly-keyword
	const appliedTransactions: { [id: string]: BaseTransaction } = {};

	block.transactions.forEach(transaction => {
		const transactionBytes = transaction.getBytes();

		if (appliedTransactions[transaction.id]) {
			throw new Error(`Encountered duplicate transaction: ${transaction.id}`);
		}

		appliedTransactions[transaction.id] = transaction;
		if (transactionBytes) {
			transactionsBytesArray.push(transactionBytes);
		}
		// tslint:disable-next-line no-any
		totalAmount = totalAmount + BigInt((transaction.asset as any).amount || 0);
		totalFee = totalFee + BigInt(transaction.fee);
	});

	const transactionsBuffer = Buffer.concat(transactionsBytesArray);
	const payloadHash = hash(transactionsBuffer).toString('hex');

	if (payloadHash !== block.payloadHash) {
		throw new Error('Invalid payload hash');
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
