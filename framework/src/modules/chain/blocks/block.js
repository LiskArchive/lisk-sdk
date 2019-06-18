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

const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	BIG_ENDIAN,
	bigNumberToBuffer,
	getAddressFromPublicKey,
	hash,
	hexToBuffer,
	LITTLE_ENDIAN,
	signDataWithPrivateKey,
	verifyData,
} = require('@liskhq/lisk-cryptography');
const _ = require('lodash');
const BigNum = require('@liskhq/bignum');
const validator = require('../../../controller/validator');
const { validateTransactions } = require('../transactions');
const blockVersion = require('./block_version');

// TODO: remove type constraints
const TRANSACTION_TYPES_MULTI = 4;

// Block attribute buffer sizes
const BLOCK_VERSION_LENGTH = 4;
const TIMESTAMP_LENGTH = 4;
const PREVIOUS_BLOCK_LENGTH = 8;
const NUMBERS_OF_TRANSACTIONS_LENGTH = 4;
const TOTAL_AMOUNT_LENGTH = 8;
const TOTAL_FEE_LENGTH = 8;
const REWARD_LENGTH = 8;
const PAYLOAD_LENGTH_LENGTH = 4;
// const PAYLOAD_HASH_LENGTH = 32;
// const GENERATOR_PUBLIC_KEY_LENGTH = 32;
// const BLOCK_SIGNATURE_LENGTH = 64;
// const UNUSED_LENGTH = 4;

/**
 * Creates a block signature.
 *
 * @param {block} block
 * @param {Object} keypair
 * @returns {signature} Block signature
 * @todo Add description for the params
 */
const sign = (block, keypair) =>
	signDataWithPrivateKey(hash(getBytes(block)), keypair.privateKey);

/**
 * Creates hash based on block bytes.
 *
 * @param {block} block
 * @returns {Buffer} SHA256 hash
 * @todo Add description for the params
 */
const getHash = block => hash(getBytes(block));

/**
 * Description of the function.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {!Array} Contents as an ArrayBuffer
 * @todo Add description for the function and the params
 */
const getBytes = block => {
	const bufferArray = [];

	const blockVersionBuffer = Buffer.alloc(BLOCK_VERSION_LENGTH);
	blockVersionBuffer.writeIntLE(block.version, 0, BLOCK_VERSION_LENGTH);
	bufferArray.push(blockVersionBuffer);

	const timestampBuffer = Buffer.alloc(TIMESTAMP_LENGTH);
	timestampBuffer.writeIntLE(block.timestamp, 0, TIMESTAMP_LENGTH);
	bufferArray.push(timestampBuffer);

	const previousBlockBuffer = block.previousBlock
		? bigNumberToBuffer(block.previousBlock, PREVIOUS_BLOCK_LENGTH, BIG_ENDIAN)
		: Buffer.alloc(PREVIOUS_BLOCK_LENGTH);
	bufferArray.push(previousBlockBuffer);

	const numTransactionsBuffer = Buffer.alloc(NUMBERS_OF_TRANSACTIONS_LENGTH);
	numTransactionsBuffer.writeIntLE(
		block.numberOfTransactions,
		0,
		NUMBERS_OF_TRANSACTIONS_LENGTH
	);
	bufferArray.push(numTransactionsBuffer);

	const totalAmountBuffer = bigNumberToBuffer(
		block.totalAmount.toString(),
		TOTAL_AMOUNT_LENGTH,
		LITTLE_ENDIAN
	);
	bufferArray.push(totalAmountBuffer);

	const totalFeeBuffer = bigNumberToBuffer(
		block.totalFee.toString(),
		TOTAL_FEE_LENGTH,
		LITTLE_ENDIAN
	);
	bufferArray.push(totalFeeBuffer);

	const rewardBuffer = bigNumberToBuffer(
		block.reward.toString(),
		REWARD_LENGTH,
		LITTLE_ENDIAN
	);
	bufferArray.push(rewardBuffer);

	const payloadLengthBuffer = Buffer.alloc(PAYLOAD_LENGTH_LENGTH);
	payloadLengthBuffer.writeUIntLE(
		block.payloadLength,
		0,
		PAYLOAD_LENGTH_LENGTH
	);
	bufferArray.push(payloadLengthBuffer);

	const payloadHashBuffer = hexToBuffer(block.payloadHash);
	bufferArray.push(payloadHashBuffer);

	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);
	bufferArray.push(generatorPublicKeyBuffer);

	const blockSignatureBuffer = block.blockSignature
		? hexToBuffer(block.blockSignature)
		: Buffer.alloc(0);
	bufferArray.push(blockSignatureBuffer);

	return Buffer.concat(bufferArray);
};

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
 * Sorts input data transactions.
 * Calculates reward based on previous block data.
 * Generates new block.
 *
 * @param {Object} data
 * @returns {block} block
 * @todo Add description for the params
 */
const create = ({
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
	const transactionsBytesArray = [];

	for (let i = 0; i < sortedTransactions.length; i++) {
		const transaction = sortedTransactions[i];
		const transactionBytes = transaction.getBytes(transaction);

		if (size + transactionBytes.length > maxPayloadLength) {
			break;
		}

		size += transactionBytes.length;

		totalFee = totalFee.plus(transaction.fee);
		totalAmount = totalAmount.plus(transaction.amount);

		blockTransactions.push(transaction);
		transactionsBytesArray.push(transactionBytes);
	}

	const transactionsBuffer = Buffer.concat(transactionsBytesArray);
	const payloadHash = hash(transactionsBuffer).toString('hex');

	const block = {
		version: blockVersion.currentBlockVersion,
		totalAmount,
		totalFee,
		reward,
		payloadHash,
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
 * Verifies block hash, generator block publicKey and block signature.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {boolean} Verified hash, signature and publicKey
 * @todo Add description for the params
 */
const verifySignature = block => {
	const signatureLength = 64;
	const data = getBytes(block);
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
	const hashedBlock = hash(getBytes(block));
	const temp = Buffer.alloc(8);
	for (let i = 0; i < 8; i++) {
		temp[i] = hashedBlock[7 - i];
	}

	// eslint-disable-next-line new-cap
	const id = new BigNum.fromBuffer(temp).toString();
	return id;
};

/**
 * Creates block object based on raw data.
 *
 * @param {Object} raw
 * @returns {null|block} Block object
 * @todo Add description for the params
 */
const dbRead = raw => {
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

/**
 * Creates block object based on raw database block data.
 *
 * @param {Object} raw Raw database data block object
 * @returns {null|block} Block object
 */
const storageRead = raw => {
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
	sign,
	getHash,
	getId,
	create,
	dbRead,
	storageRead,
	getBytes,
	verifySignature,
	objectNormalize,
};
