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

const crypto = require('crypto');
const ByteBuffer = require('bytebuffer');
const Bignum = require('../helpers/bignum.js');
const transactionTypes = require('../helpers/transaction_types.js');
const blockVersion = require('./block_version.js');
const BlockReward = require('./block_reward.js');

const { MAX_PAYLOAD_LENGTH, FEES } = global.constants;
const __private = {};

/**
 * Main Block logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bytebuffer
 * @requires crypto
 * @requires helpers/bignum
 * @requires helpers/transaction_types
 * @requires logic/block_reward
 * @param {Object} ed
 * @param {ZSchema} schema
 * @param {Transaction} transaction
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, this
 * @todo Add description for the params
 */
class Block {
	constructor(ed, schema, transaction, cb) {
		this.scope = {
			ed,
			schema,
			transaction,
		};
		__private.blockReward = new BlockReward();
		if (cb) {
			return setImmediate(cb, null, this);
		}
	}

	/**
	 * Sorts input data transactions.
	 * Calculates reward based on previous block data.
	 * Generates new block.
	 *
	 * @param {Object} data
	 * @returns {block} block
	 * @todo Add description for the params
	 */
	create(data) {
		const transactions = data.transactions.sort((a, b) => {
			// Place MULTI transaction after all other transaction types
			if (
				a.type === transactionTypes.MULTI &&
				b.type !== transactionTypes.MULTI
			) {
				return 1;
			}
			// Place all other transaction types before MULTI transaction
			if (
				a.type !== transactionTypes.MULTI &&
				b.type === transactionTypes.MULTI
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
			if (a.amount.isLessThan(b.amount)) {
				return -1;
			}
			if (a.amount.isGreaterThan(b.amount)) {
				return 1;
			}
			return 0;
		});

		const nextHeight = data.previousBlock ? data.previousBlock.height + 1 : 1;

		const reward = __private.blockReward.calcReward(nextHeight);
		let totalFee = new Bignum(0);
		let totalAmount = new Bignum(0);
		let size = 0;

		const blockTransactions = [];
		const payloadHash = crypto.createHash('sha256');

		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const bytes = this.scope.transaction.getBytes(transaction);

			if (size + bytes.length > MAX_PAYLOAD_LENGTH) {
				break;
			}

			size += bytes.length;

			totalFee = totalFee.plus(transaction.fee);
			totalAmount = totalAmount.plus(transaction.amount);

			blockTransactions.push(transaction);
			payloadHash.update(bytes);
		}

		let block = {
			version: blockVersion.currentBlockVersion,
			totalAmount,
			totalFee,
			reward,
			payloadHash: payloadHash.digest().toString('hex'),
			timestamp: data.timestamp,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlock: data.previousBlock.id,
			generatorPublicKey: data.keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
		};

		try {
			block.blockSignature = this.sign(block, data.keypair);

			block = this.objectNormalize(block);
		} catch (e) {
			throw e;
		}

		return block;
	}

	/**
	 * Creates a block signature.
	 *
	 * @param {block} block
	 * @param {Object} keypair
	 * @returns {signature} Block signature
	 * @todo Add description for the params
	 */
	sign(block, keypair) {
		const hash = this.getHash(block);

		return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
	}

	/**
	 * Creates hash based on block bytes.
	 *
	 * @param {block} block
	 * @returns {Buffer} SHA256 hash
	 * @todo Add description for the params
	 */
	getHash(block) {
		return crypto
			.createHash('sha256')
			.update(this.getBytes(block))
			.digest();
	}

	/**
	 * Verifies block hash, generator block publicKey and block signature.
	 *
	 * @param {block} block
	 * @throws {Error}
	 * @returns {boolean} Verified hash, signature and publicKey
	 * @todo Add description for the params
	 */
	verifySignature(block) {
		const signatureLength = 64;
		let res;

		try {
			const data = this.getBytes(block);
			const dataWithoutSignature = Buffer.alloc(data.length - signatureLength);

			for (let i = 0; i < dataWithoutSignature.length; i++) {
				dataWithoutSignature[i] = data[i];
			}
			const hash = crypto
				.createHash('sha256')
				.update(dataWithoutSignature)
				.digest();
			const blockSignatureBuffer = this.scope.ed.hexToBuffer(
				block.blockSignature
			);
			const generatorPublicKeyBuffer = this.scope.ed.hexToBuffer(
				block.generatorPublicKey
			);
			res = this.scope.ed.verify(
				hash,
				blockSignatureBuffer || ' ',
				generatorPublicKeyBuffer || ' '
			);
		} catch (e) {
			throw e;
		}

		return res;
	}

	/**
	 * Description of the function.
	 *
	 * @param {block} block
	 * @throws {string|Error}
	 * @returns {Object} Normalized block
	 * @todo Add description for the function and the params
	 */
	objectNormalize(block) {
		for (const i of Object.keys(block)) {
			if (block[i] == null || typeof block[i] === 'undefined') {
				delete block[i];
			}
		}

		const report = this.scope.schema.validate(block, Block.prototype.schema);

		if (!report) {
			throw `Failed to validate block schema: ${this.scope.schema
				.getLastErrors()
				.map(err => err.message)
				.join(', ')}`;
		}

		try {
			for (let i = 0; i < block.transactions.length; i++) {
				block.transactions[i] = this.scope.transaction.objectNormalize(
					block.transactions[i]
				);
			}
		} catch (e) {
			throw e;
		}

		return block;
	}
}

/**
 * Gets address by public.
 *
 * @private
 * @param {publicKey} publicKey
 * @returns {address} address
 * @todo Add description for the params
 */
__private.getAddressByPublicKey = function(publicKey) {
	const publicKeyHash = crypto
		.createHash('sha256')
		.update(publicKey, 'hex')
		.digest();
	const temp = Buffer.alloc(8);

	for (let i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	const address = `${Bignum.fromBuffer(temp).toString()}L`;
	return address;
};

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * @typedef {Object} block
 * @property {string} id - Between 1 and 20 chars
 * @property {number} height
 * @property {signature} blockSignature
 * @property {publicKey} generatorPublicKey
 * @property {number} numberOfTransactions
 * @property {string} payloadHash
 * @property {number} payloadLength
 * @property {string} previousBlock - Between 1 and 20 chars
 * @property {number} timestamp
 * @property {number} totalAmount - Minimun 0
 * @property {number} totalFee - Minimun 0
 * @property {number} reward - Minimun 0
 * @property {Array} transactions - Unique items
 * @property {number} version - Minimun 0
 */
Block.prototype.schema = {
	id: 'Block',
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

/**
 * Description of the function.
 *
 * @param {block} block
 * @throws {Error}
 * @returns {!Array} Contents as an ArrayBuffer
 * @todo Add description for the function and the params
 */
Block.prototype.getBytes = function(block) {
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
	let bytes;

	try {
		const byteBuffer = new ByteBuffer(capacity, true);
		byteBuffer.writeInt(block.version);
		byteBuffer.writeInt(block.timestamp);

		if (block.previousBlock) {
			const pb = new Bignum(block.previousBlock).toBuffer({ size: '8' });

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

		const payloadHashBuffer = this.scope.ed.hexToBuffer(block.payloadHash);
		for (let i = 0; i < payloadHashBuffer.length; i++) {
			byteBuffer.writeByte(payloadHashBuffer[i]);
		}

		const generatorPublicKeyBuffer = this.scope.ed.hexToBuffer(
			block.generatorPublicKey
		);
		for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
			byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
		}

		if (block.blockSignature) {
			const blockSignatureBuffer = this.scope.ed.hexToBuffer(
				block.blockSignature
			);
			for (let i = 0; i < blockSignatureBuffer.length; i++) {
				byteBuffer.writeByte(blockSignatureBuffer[i]);
			}
		}

		byteBuffer.flip();
		bytes = byteBuffer.toBuffer();
	} catch (e) {
		throw e;
	}

	return bytes;
};

/**
 * Calculates block id based on block.
 *
 * @param {block} block
 * @returns {string} Block id
 * @todo Add description for the params
 */
Block.prototype.getId = function(block) {
	const hash = crypto
		.createHash('sha256')
		.update(this.getBytes(block))
		.digest();
	const temp = Buffer.alloc(8);
	for (let i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	const id = new Bignum.fromBuffer(temp).toString();
	return id;
};

/**
 * Returns send fees from constants.
 *
 * @returns {Bignumber} Transaction fee
 * @todo Delete unused param
 */
Block.prototype.calculateFee = function() {
	return new Bignum(FEES.SEND);
};

/**
 * Creates block object based on raw data.
 *
 * @param {Object} raw
 * @returns {null|block} Block object
 * @todo Add description for the params
 */
Block.prototype.dbRead = function(raw) {
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
		totalAmount: new Bignum(raw.b_totalAmount),
		totalFee: new Bignum(raw.b_totalFee),
		reward: new Bignum(raw.b_reward),
		payloadLength: parseInt(raw.b_payloadLength),
		payloadHash: raw.b_payloadHash,
		generatorPublicKey: raw.b_generatorPublicKey,
		generatorId: __private.getAddressByPublicKey(raw.b_generatorPublicKey),
		blockSignature: raw.b_blockSignature,
		confirmations: parseInt(raw.b_confirmations),
	};
	block.totalForged = block.totalFee.plus(block.reward).toString();
	return block;
};

module.exports = Block;
