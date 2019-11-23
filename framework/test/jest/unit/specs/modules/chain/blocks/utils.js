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
const { hash, signDataWithPrivateKey } = require('@liskhq/lisk-cryptography');
const genesisBlock = require('../../../../../../fixtures/config/devnet/genesis_block.json');
// TODO: Move it out of mocha and put it in test main directory
const randomUtil = require('../../../../../../mocha/common/utils/random.js');
const {
	getBytes,
} = require('../../../../../../../src/modules/chain/block_processor_v2');

const sortTransactions = transactions =>
	transactions.sort((a, b) => a.type > b.type || a.id > b.id);

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
		totalAmount = totalAmount.plus(transaction.asset.amount || '0');

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
		maxHeightPreviouslyForged: 0,
		maxHeightPrevoted: 0,
		previousBlockId: genesisBlock.id,
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

	const { keypair } = blockWithCalculatedProperties;
	delete blockWithCalculatedProperties.keypair;

	// eslint-disable-next-line new-cap
	const blockWithSignature = {
		...blockWithCalculatedProperties,
		blockSignature: signDataWithPrivateKey(
			hash(getBytes(blockWithCalculatedProperties)),
			Buffer.from(keypair.privateKey, 'hex'),
		),
	};
	const hashedBlockBytes = hash(getBytes(blockWithSignature));

	const temp = Buffer.alloc(8);
	// eslint-disable-next-line no-plusplus
	for (let i = 0; i < 8; i++) {
		temp[i] = hashedBlockBytes[7 - i];
	}

	return {
		...blockWithSignature,
		id: BigNum.fromBuffer(temp).toString(),
	};
};

module.exports = {
	newBlock,
	getBytes,
};
