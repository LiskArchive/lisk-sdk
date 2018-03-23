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
const bignum = require('../helpers/bignum.js');
const { MAX_PAYLOAD_LENGTH, FEES } = require('../helpers/constants.js');
const transactionTypes = require('../helpers/transaction_types.js');
const BlockReward = require('./block_reward.js');

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
 * @requires helpers/constants
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
			if (a.amount < b.amount) {
				return -1;
			}
			if (a.amount > b.amount) {
				return 1;
			}
			return 0;
		});

		const nextHeight = data.previousBlock ? data.previousBlock.height + 1 : 1;

		const reward = __private.blockReward.calcReward(nextHeight);
		let totalFee = 0;
		let totalAmount = 0;
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

			totalFee += transaction.fee;
			totalAmount += transaction.amount;

			blockTransactions.push(transaction);
			payloadHash.update(bytes);
		}

		let block = {
			version: 0,
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
	 * @returns {hash} SHA256 hash
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
		const remove = 64;
		let res;

		try {
			const data = this.getBytes(block);
			const data2 = Buffer.alloc(data.length - remove);

			for (let i = 0; i < data2.length; i++) {
				data2[i] = data[i];
			}
			const hash = crypto
				.createHash('sha256')
				.update(data2)
				.digest();
			const blockSignatureBuffer = Buffer.from(block.blockSignature, 'hex');
			const generatorPublicKeyBuffer = Buffer.from(
				block.generatorPublicKey,
				'hex'
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

	const address = `${bignum.fromBuffer(temp).toString()}L`;
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
 * @property {hash} payloadHash
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
			type: 'integer',
			minimum: 0,
		},
		totalFee: {
			type: 'integer',
			minimum: 0,
		},
		reward: {
			type: 'integer',
			minimum: 0,
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
	const size = 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 64;
	let bytes;

	try {
		const byteBuffer = new ByteBuffer(size, true);
		byteBuffer.writeInt(block.version);
		byteBuffer.writeInt(block.timestamp);

		if (block.previousBlock) {
			const pb = new bignum(block.previousBlock).toBuffer({ size: '8' });

			for (let i = 0; i < 8; i++) {
				byteBuffer.writeByte(pb[i]);
			}
		} else {
			for (let i = 0; i < 8; i++) {
				byteBuffer.writeByte(0);
			}
		}

		byteBuffer.writeInt(block.numberOfTransactions);
		byteBuffer.writeLong(block.totalAmount);
		byteBuffer.writeLong(block.totalFee);
		byteBuffer.writeLong(block.reward);

		byteBuffer.writeInt(block.payloadLength);

		const payloadHashBuffer = Buffer.from(block.payloadHash, 'hex');
		for (let i = 0; i < payloadHashBuffer.length; i++) {
			byteBuffer.writeByte(payloadHashBuffer[i]);
		}

		const generatorPublicKeyBuffer = Buffer.from(
			block.generatorPublicKey,
			'hex'
		);
		for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
			byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
		}

		if (block.blockSignature) {
			const blockSignatureBuffer = Buffer.from(block.blockSignature, 'hex');
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

	const id = new bignum.fromBuffer(temp).toString();
	return id;
};

/**
 * Returns send fees from constants.
 *
 * @returns {number} Transaction fee
 * @todo Delete unused param
 */
Block.prototype.calculateFee = function() {
	return FEES.send;
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
		totalAmount: parseInt(raw.b_totalAmount),
		totalFee: parseInt(raw.b_totalFee),
		reward: parseInt(raw.b_reward),
		payloadLength: parseInt(raw.b_payloadLength),
		payloadHash: raw.b_payloadHash,
		generatorPublicKey: raw.b_generatorPublicKey,
		generatorId: __private.getAddressByPublicKey(raw.b_generatorPublicKey),
		blockSignature: raw.b_blockSignature,
		confirmations: parseInt(raw.b_confirmations),
	};
	block.totalForged = new bignum(block.totalFee)
		.plus(new bignum(block.reward))
		.toString();
	return block;
};

module.exports = Block;
