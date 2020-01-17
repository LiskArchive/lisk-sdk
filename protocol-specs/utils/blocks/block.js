/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const {
	hash,
	signDataWithPrivateKey,
	BIG_ENDIAN,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
} = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');
const { getDelegateKeypairForCurrentSlot } = require('../dpos');
const blockRewards = require('../blocks/block_rewards');

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;
const TRANSACTION_TYPES_MULTI = 4;

const getBytes = block => {
	const blockVersionBuffer = intToBuffer(
		block.version,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const timestampBuffer = intToBuffer(
		block.timestamp,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const previousBlockBuffer = block.previousBlock
		? intToBuffer(block.previousBlock, SIZE_INT64, BIG_ENDIAN)
		: Buffer.alloc(SIZE_INT64);

	const numTransactionsBuffer = intToBuffer(
		block.numberOfTransactions,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const totalAmountBuffer = intToBuffer(
		block.totalAmount.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const totalFeeBuffer = intToBuffer(
		block.totalFee.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const rewardBuffer = intToBuffer(
		block.reward.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const payloadLengthBuffer = intToBuffer(
		block.payloadLength,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const payloadHashBuffer = hexToBuffer(block.payloadHash);

	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);

	const blockSignatureBuffer = block.blockSignature
		? hexToBuffer(block.blockSignature)
		: Buffer.alloc(0);

	return Buffer.concat([
		blockVersionBuffer,
		timestampBuffer,
		previousBlockBuffer,
		numTransactionsBuffer,
		totalAmountBuffer,
		totalFeeBuffer,
		rewardBuffer,
		payloadLengthBuffer,
		payloadHashBuffer,
		generatorPublicKeyBuffer,
		blockSignatureBuffer,
	]);
};

const sign = (block, keypair) =>
	signDataWithPrivateKey(hash(getBytes(block)), keypair.privateKey);

const sortTransactions = transactions =>
	transactions.sort((a, b) => {
		// Place MULTI transaction after all other transaction types
		if (
			a.type === TRANSACTION_TYPES_MULTI &&
			b.type !== TRANSACTION_TYPES_MULTI
		) {
			return 1;
		}
		// Place all other transaction types before MULTI transaction
		if (
			a.type !== TRANSACTION_TYPES_MULTI &&
			b.type === TRANSACTION_TYPES_MULTI
		) {
			return -1;
		}
		// Place depending on type (lower first)
		if (a.type < b.type) {
			return -1;
		}
		if (a.type > b.type) {
			return 1;
		}
		// Place depending on amount (lower first)
		if (a.amount.lt(b.amount)) {
			return -1;
		}
		if (a.amount.gt(b.amount)) {
			return 1;
		}
		return 0;
	});

const createBlock = (
	config,
	accountsState,
	previousBlock,
	round,
	slot,
	{ version = 1, transactions = [] },
) => {
	const forgerKeyPair = getDelegateKeypairForCurrentSlot(
		config,
		accountsState,
		slot,
		round,
	);

	const blockRewardsSettings = {
		distance: config.constants.REWARDS.DISTANCE,
		rewardOffset: config.constants.REWARDS.OFFSET,
		milestones: config.constants.REWARDS.MILESTONES,
	};

	const reward = blockRewards.calculateReward(
		previousBlock.height + 1,
		blockRewardsSettings,
	);

	const blockTransactions = [];
	const transactionsBytesArray = [];

	let totalFee = new BigNum(0);
	let totalAmount = new BigNum(0);
	let size = 0;

	const sortedTransactions = sortTransactions(transactions);

	// eslint-disable-next-line no-restricted-syntax
	for (const transaction of sortedTransactions) {
		const transactionBytes = transaction.getBytes(transaction);

		if (size + transactionBytes.length > config.constants.MAX_PAYLOAD_LENGTH) {
			break;
		}

		size += transactionBytes.length;

		totalFee = totalFee.plus(transaction.fee);
		totalAmount = totalAmount.plus(transaction.amount);

		blockTransactions.push(transaction);
		transactionsBytesArray.push(transactionBytes);
	}

	const newBlock = {
		version,
		totalAmount: totalAmount.toString(),
		totalFee: totalFee.toString(),
		reward: reward.toString(),
		timestamp: previousBlock.timestamp + config.constants.BLOCK_TIME,
		numberOfTransactions: blockTransactions.length,
		payloadLength: size,
		previousBlock: previousBlock.id,
		generatorPublicKey: forgerKeyPair.publicKey.toString('hex'),
		transactions: blockTransactions.map(tx => tx.toJSON()),
	};

	newBlock.payloadHash = hash(Buffer.concat(transactionsBytesArray)).toString(
		'hex',
	); // arg is [] as block has no txs
	newBlock.blockSignature = sign(newBlock, forgerKeyPair);
	newBlock.height = previousBlock.height + 1;

	return newBlock;
};

module.exports = {
	createBlock,
};
