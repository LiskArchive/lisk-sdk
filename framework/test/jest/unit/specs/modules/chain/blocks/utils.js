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

'use strict';

const BigNum = require('@liskhq/bignum');
const {
	BIG_ENDIAN,
	hash,
	signDataWithPrivateKey,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
} = require('@liskhq/lisk-cryptography');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
// TODO: Move it out of mocha and put it in test main directory
const randomUtil = require('../../../../../../mocha/common/utils/random.js');

const sortTransactions = transactions =>
	transactions.sort((a, b) => a.type > b.type || a.id > b.id);

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

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

	const heightBuffer = intToBuffer(block.height, SIZE_INT32, LITTLE_ENDIAN);

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
		heightBuffer,
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

const calculateTransactionsInfo = block => {
	const sortedTransactions = sortTransactions(block.transactions);
	const transactionsBytesArray = [];
	let totalFee = new BigNum(0);
	let totalAmount = new BigNum(0);
	let payloadLength = 0;

	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < sortedTransactions.length; i++) {
		const transaction = sortedTransactions[i];
		const transactionBytes = transaction.getBytes(transaction);

		totalFee = totalFee.plus(transaction.fee);
		totalAmount = totalAmount.plus(transaction.amount);

		payloadLength += transactionBytes.length;
		transactionsBytesArray.push(transactionBytes);
	}

	const transactionsBuffer = Buffer.concat(transactionsBytesArray);
	const payloadHash = hash(transactionsBuffer).toString('hex');

	return {
		totalFee,
		totalAmount,
		payloadHash,
		payloadLength,
		numberOfTransactions: block.transactions.length,
	};
};

/**
 * Utility function to create a block object with valid computed properties while any property can be overridden
 * Calculates the signature, payloadHash etc. internally. Facilitating the creation of block with valid signature and other properties
 */
const newBlock = block => {
	const defaultBlockValues = {
		version: 2,
		height: 2,
		previousBlock: genesisBlock.id,
		keypair: randomUtil.account().keypair,
		transactions: [],
		reward: '0',
		timestamp: 1000,
	};
	const blockWithDefaultValues = {
		...defaultBlockValues,
		...block,
	};

	const transactionsInfo = calculateTransactionsInfo(blockWithDefaultValues);
	const blockWithCalculatedProperties = {
		...transactionsInfo,
		...blockWithDefaultValues,
		generatorPublicKey: blockWithDefaultValues.keypair.publicKey.toString(
			'hex',
		),
	};

	const hashedBlock = hash(getBytes(blockWithCalculatedProperties));
	const temp = Buffer.alloc(8);
	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < 8; i++) {
		temp[i] = hashedBlock[7 - i];
	}

	// eslint-disable-next-line new-cap
	const id = new BigNum.fromBuffer(temp).toString();
	return {
		...blockWithCalculatedProperties,
		blockSignature: signDataWithPrivateKey(
			hash(getBytes(blockWithCalculatedProperties)),
			Buffer.from(blockWithCalculatedProperties.keypair.privateKey, 'hex'),
		),
		id,
	};
};

module.exports = {
	newBlock,
	getBytes,
};
