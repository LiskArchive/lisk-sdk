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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	getAddressFromPublicKey,
	hexToBuffer,
	signDataWithPrivateKey,
	hash,
	verifyData,
} = require('@liskhq/lisk-cryptography');
const _ = require('lodash');
const crypto = require('crypto');
const ByteBuffer = require('bytebuffer');
const BigNum = require('@liskhq/bignum');
const validator = require('../../../controller/validator');
const { validateTransactions } = require('../transactions');
const blockVersion = require('./block_version');

// TODO: remove type constraints
const TRANSACTION_TYPES_MULTI = 4;

/**
 * Creates bytebuffer out of block data used for signatures.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {!Array} Contents as an ArrayBuffer
 * @todo Add description for the function and the params
 */
const getBytesV0 = block => {
	const capacity =
		4 + // version (int)
		4 + // timestamp (int)
		8 + // previousBlock
		4 + // numberOfTransactions (int)
		8 + // totalAmount (long)
		8 + // totalFee (long)
		8 + // reward (long)
		4 + // payloadLength (int)
		32 + // payloadHash
		32 + // generatorPublicKey
		64 + // blockSignature or unused
		4; // unused

	const byteBuffer = new ByteBuffer(capacity, true);
	byteBuffer.writeInt(block.version);
	byteBuffer.writeInt(block.timestamp);

	if (block.previousBlock) {
		const pb = new BigNum(block.previousBlock).toBuffer({ size: '8' });

		for (let i = 0; i < 8; i++) {
			byteBuffer.writeByte(pb[i]);
		}
	} else {
		for (let i = 0; i < 8; i++) {
			byteBuffer.writeByte(0);
		}
	}

	byteBuffer.writeInt(block.numberOfTransactions);
	byteBuffer.writeLong(block.totalAmount.toString());
	byteBuffer.writeLong(block.totalFee.toString());
	byteBuffer.writeLong(block.reward.toString());

	byteBuffer.writeInt(block.payloadLength);

	const payloadHashBuffer = hexToBuffer(block.payloadHash);
	for (let i = 0; i < payloadHashBuffer.length; i++) {
		byteBuffer.writeByte(payloadHashBuffer[i]);
	}

	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);
	for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
		byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
	}

	if (block.blockSignature) {
		const blockSignatureBuffer = hexToBuffer(block.blockSignature);
		for (let i = 0; i < blockSignatureBuffer.length; i++) {
			byteBuffer.writeByte(blockSignatureBuffer[i]);
		}
	}

	byteBuffer.flip();
	return byteBuffer.toBuffer();
};

const getBytesV1 = block => getBytesV0(block);

/**
 * Sorts input data transactions.
 * Calculates reward based on previous block data.
 * Generates new block.
 *
 * @param {Object} data
 * @returns {block} block
 * @todo Add description for the params
 */
const createV1 = ({
	blockReward,
	transactions,
	previousBlock,
	keypair,
	timestamp,
	maxPayloadLength,
	exceptions,
}) => {
	// TODO: move to transactions module logic
	const sortedTransactions = transactions.sort((a, b) => {
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

	const nextHeight = previousBlock ? previousBlock.height + 1 : 1;

	const reward = blockReward.calculateReward(nextHeight);
	let totalFee = new BigNum(0);
	let totalAmount = new BigNum(0);
	let size = 0;

	const blockTransactions = [];
	const payloadHash = crypto.createHash('sha256');

	for (let i = 0; i < sortedTransactions.length; i++) {
		const transaction = sortedTransactions[i];
		const bytes = transaction.getBytes(transaction);

		if (size + bytes.length > maxPayloadLength) {
			break;
		}

		size += bytes.length;

		totalFee = totalFee.plus(transaction.fee);
		totalAmount = totalAmount.plus(transaction.amount);

		blockTransactions.push(transaction);
		payloadHash.update(bytes);
	}

	const block = {
		version: blockVersion.getBlockVersion(nextHeight, exceptions),
		totalAmount,
		totalFee,
		reward,
		payloadHash: payloadHash.digest().toString('hex'),
		timestamp,
		numberOfTransactions: blockTransactions.length,
		payloadLength: size,
		previousBlock: previousBlock.id,
		generatorPublicKey: keypair.publicKey.toString('hex'),
		transactions: blockTransactions,
	};

	block.blockSignature = sign(block, keypair);
	return objectNormalize(block, exceptions);
};

/**
 * Creates block object based on raw data.
 *
 * @param {Object} raw
 * @returns {null|block} Block object
 * @todo Add description for the params
 */
const dbReadV0 = raw => {
	if (!raw.b_id) {
		return null;
	}
	const block = {
		id: raw.b_id,
		version: parseInt(raw.b_version),
		timestamp: parseInt(raw.b_timestamp),
		height: parseInt(raw.b_height),
		previousBlock: raw.b_previousBlock,
		numberOfTransactions: parseInt(raw.b_numberOfTransactions),
		totalAmount: new BigNum(raw.b_totalAmount),
		totalFee: new BigNum(raw.b_totalFee),
		reward: new BigNum(raw.b_reward),
		payloadLength: parseInt(raw.b_payloadLength),
		payloadHash: raw.b_payloadHash,
		generatorPublicKey: raw.b_generatorPublicKey,
		generatorId: getAddressFromPublicKey(raw.b_generatorPublicKey),
		blockSignature: raw.b_blockSignature,
		confirmations: parseInt(raw.b_confirmations),
	};
	block.totalForged = block.totalFee.plus(block.reward).toString();
	return block;
};

const dbReadV1 = raw => dbReadV0(raw);

/**
 * Creates block object based on raw database block data.
 *
 * @param {Object} raw Raw database data block object
 * @returns {null|block} Block object
 */
const storageReadV0 = raw => {
	if (!raw.id) {
		return null;
	}

	const block = {
		id: raw.id,
		version: parseInt(raw.version),
		timestamp: parseInt(raw.timestamp),
		height: parseInt(raw.height),
		previousBlock: raw.previousBlockId,
		numberOfTransactions: parseInt(raw.numberOfTransactions),
		totalAmount: new BigNum(raw.totalAmount),
		totalFee: new BigNum(raw.totalFee),
		reward: new BigNum(raw.reward),
		payloadLength: parseInt(raw.payloadLength),
		payloadHash: raw.payloadHash,
		generatorPublicKey: raw.generatorPublicKey,
		generatorId: getAddressFromPublicKey(raw.generatorPublicKey),
		blockSignature: raw.blockSignature,
		confirmations: parseInt(raw.confirmations),
	};

	if (raw.transactions) {
		block.transactions = raw.transactions
			.filter(tx => !!tx.id)
			.map(tx => _.omitBy(tx, _.isNull));
	}

	block.totalForged = block.totalFee.plus(block.reward).toString();

	return block;
};

const storageReadV1 = raw => storageReadV0(raw);

/**
 * Creates a block signature.
 *
 * @param {block} block
 * @param {Object} keypair
 * @returns {signature} Block signature
 * @todo Add description for the params
 */
const sign = (block, keypair) =>
	signDataWithPrivateKey(hash(getBytesV1(block)), keypair.privateKey);

/**
 * Creates hash based on block bytes.
 *
 * @param {block} block
 * @returns {Buffer} SHA256 hash
 * @todo Add description for the params
 */
const getHash = block => hash(getBytesV1(block));

/**
 * Description of the function.
 *
 * @param {block} block
 * @throws {string|Error}
 * @returns {Object} Normalized block
 * @todo Add description for the function and the params
 */
const objectNormalize = (block, exceptions = {}) => {
	Object.keys(block).forEach(key => {
		if (block[key] === null || typeof block[key] === 'undefined') {
			delete block[key];
		}
	});
	try {
		validator.validate(blockSchema, block);
	} catch (schemaError) {
		throw schemaError.errors;
	}
	const { transactionsResponses } = validateTransactions(exceptions)(
		block.transactions
	);
	const invalidTransactionResponse = transactionsResponses.find(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK
	);
	if (invalidTransactionResponse) {
		throw invalidTransactionResponse.errors;
	}
	return block;
};

/**
 * Verifies block hash, generator block publicKey and block signature.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {boolean} Verified hash, signature and publicKey
 * @todo Add description for the params
 */
const verifySignature = block => {
	const signatureLength = 64;
	const data = getBytesV1(block);
	const dataWithoutSignature = Buffer.alloc(data.length - signatureLength);

	for (let i = 0; i < dataWithoutSignature.length; i++) {
		dataWithoutSignature[i] = data[i];
	}
	const hashedBlock = hash(dataWithoutSignature);
	return verifyData(
		hashedBlock,
		block.blockSignature,
		block.generatorPublicKey
	);
};

/**
 * Calculates block id based on block.
 *
 * @param {block} block
 * @returns {string} Block id
 * @todo Add description for the params
 */
const getId = block => {
	const hashedBlock = hash(getBytesV1(block));
	const temp = Buffer.alloc(8);
	for (let i = 0; i < 8; i++) {
		temp[i] = hashedBlock[7 - i];
	}

	// eslint-disable-next-line new-cap
	const id = new BigNum.fromBuffer(temp).toString();
	return id;
};

const blockSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		height: {
			type: 'integer',
		},
		maxHeightPreviouslyForged: {
			type: 'integer',
		},
		prevotedConfirmedUptoHeight: {
			type: 'integer',
		},
		blockSignature: {
			type: 'string',
			format: 'signature',
		},
		generatorPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		numberOfTransactions: {
			type: 'integer',
		},
		payloadHash: {
			type: 'string',
			format: 'hex',
		},
		payloadLength: {
			type: 'integer',
		},
		previousBlock: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		timestamp: {
			type: 'integer',
		},
		totalAmount: {
			type: 'object',
			format: 'amount',
		},
		totalFee: {
			type: 'object',
			format: 'amount',
		},
		reward: {
			type: 'object',
			format: 'amount',
		},
		transactions: {
			type: 'array',
			uniqueItems: true,
		},
		version: {
			type: 'integer',
			minimum: 0,
		},
	},
	required: [
		'blockSignature',
		'generatorPublicKey',
		'numberOfTransactions',
		'payloadHash',
		'payloadLength',
		'timestamp',
		'totalAmount',
		'totalFee',
		'reward',
		'transactions',
		'version',
	],
};

module.exports = {
	getBytesV0,
	getBytesV1,
	createV1,
	dbReadV0,
	dbReadV1,
	storageReadV0,
	storageReadV1,
	verifySignature,
	getId,
	getHash,
	objectNormalize,
	sign,
};
