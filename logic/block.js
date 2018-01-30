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

var slots = require('../helpers/slots.js');
var crypto = require('crypto');
var bignum = require('../helpers/bignum.js');
var ByteBuffer = require('bytebuffer');
var BlockReward = require('./block_reward.js');
var constants = require('../helpers/constants.js');

var transactionTypes = require('../helpers/transaction_types.js');

// Private fields
var __private = {};

/**
 * Main Block logic.
 * @memberof module:blocks
 * @class
 * @classdesc Main Block logic.
 * @param {Object} ed
 * @param {ZSchema} schema
 * @param {Transaction} transaction
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} With `this` as data.
 */
// Constructor
function Block (ed, schema, transaction, cb) {
	this.scope = {
		ed: ed,
		schema: schema,
		transaction: transaction,
	};
	__private.blockReward = new BlockReward();
	if (cb) {
		return setImmediate(cb, null, this);
	}
}

// Private methods
/**
 * Creates a blockReward instance.
 * @private
 */

/**
 * Gets address by public
 * @private
 * @implements {crypto.createHash}
 * @implements {bignum.fromBuffer}
 * @param {publicKey} publicKey
 * @return {address} address
 */
__private.getAddressByPublicKey = function (publicKey) {
	var publicKeyHash = crypto.createHash('sha256').update(publicKey, 'hex').digest();
	var temp = Buffer.alloc(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = bignum.fromBuffer(temp).toString() + 'L';
	return address;
};

// Public methods
/**
 * Sorts input data transactions.
 * Calculates reward based on previous block data.
 * Generates new block.
 * @implements {BlockReward.calcReward}
 * @implements {crypto.createHash}
 * @implements {scope.transaction.getBytes}
 * @implements {Block.sign}
 * @implements {Block.objectNormalize}
 * @param {Object} data
 * @returns {block} block
 */
Block.prototype.create = function (data) {
	var transactions = data.transactions.sort(function compare (a, b) {
		// Place MULTI transaction after all other transaction types
		if (a.type === transactionTypes.MULTI && b.type !== transactionTypes.MULTI) { return 1; }
		// Place all other transaction types before MULTI transaction
		if (a.type !== transactionTypes.MULTI && b.type === transactionTypes.MULTI) { return -1; }
		// Place depending on type (lower first)
		if (a.type < b.type) { return -1; }
		if (a.type > b.type) { return 1; }
		// Place depending on amount (lower first)
		if (a.amount < b.amount) { return -1; }
		if (a.amount > b.amount) { return 1; }
		return 0;
	});

	var nextHeight = (data.previousBlock) ? data.previousBlock.height + 1 : 1;

	var reward = __private.blockReward.calcReward(nextHeight),
	    totalFee = 0, totalAmount = 0, size = 0;

	var blockTransactions = [];
	var payloadHash = crypto.createHash('sha256');

	for (var i = 0; i < transactions.length; i++) {
		var transaction = transactions[i];
		var bytes = this.scope.transaction.getBytes(transaction);

		if (size + bytes.length > constants.maxPayloadLength) {
			break;
		}

		size += bytes.length;

		totalFee += transaction.fee;
		totalAmount += transaction.amount;

		blockTransactions.push(transaction);
		payloadHash.update(bytes);
	}

	var block = {
		version: 0,
		totalAmount: totalAmount,
		totalFee: totalFee,
		reward: reward,
		payloadHash: payloadHash.digest().toString('hex'),
		timestamp: data.timestamp,
		numberOfTransactions: blockTransactions.length,
		payloadLength: size,
		previousBlock: data.previousBlock.id,
		generatorPublicKey: data.keypair.publicKey.toString('hex'),
		transactions: blockTransactions
	};

	try {
		block.blockSignature = this.sign(block, data.keypair);

		block = this.objectNormalize(block);
	} catch (e) {
		throw e;
	}

	return block;
};

/**
 * Creates a block signature.
 * @implements {Block.getHash}
 * @implements {scope.ed.sign}
 * @param {block} block
 * @param {Object} keypair
 * @returns {signature} block signature
 */
Block.prototype.sign = function (block, keypair) {
	var hash = this.getHash(block);

	return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
};

/**
 * @implements {ByteBuffer}
 * @implements {bignum}
 * @param {block} block
 * @return {!Array} Contents as an ArrayBuffer
 * @throws {error} If buffer fails
 */
Block.prototype.getBytes = function (block) {
	var size = 4 + 4 + 8 + 4 + 4 + 8 + 8 + 4 + 4 + 4 + 32 + 32 + 64;
	var b, i;

	try {
		var bb = new ByteBuffer(size, true);
		bb.writeInt(block.version);
		bb.writeInt(block.timestamp);

		if (block.previousBlock) {
			var pb = new bignum(block.previousBlock).toBuffer({size: '8'});

			for (i = 0; i < 8; i++) {
				bb.writeByte(pb[i]);
			}
		} else {
			for (i = 0; i < 8; i++) {
				bb.writeByte(0);
			}
		}

		bb.writeInt(block.numberOfTransactions);
		bb.writeLong(block.totalAmount);
		bb.writeLong(block.totalFee);
		bb.writeLong(block.reward);

		bb.writeInt(block.payloadLength);

		var payloadHashBuffer = Buffer.from(block.payloadHash, 'hex');
		for (i = 0; i < payloadHashBuffer.length; i++) {
			bb.writeByte(payloadHashBuffer[i]);
		}

		var generatorPublicKeyBuffer = Buffer.from(block.generatorPublicKey, 'hex');
		for (i = 0; i < generatorPublicKeyBuffer.length; i++) {
			bb.writeByte(generatorPublicKeyBuffer[i]);
		}

		if (block.blockSignature) {
			var blockSignatureBuffer = Buffer.from(block.blockSignature, 'hex');
			for (i = 0; i < blockSignatureBuffer.length; i++) {
				bb.writeByte(blockSignatureBuffer[i]);
			}
		}

		bb.flip();
		b = bb.toBuffer();
	} catch (e) {
		throw e;
	}

	return b;
};

/**
 * Verifies block hash, generator block publicKey and block signature.
 * @implements {Block.getBytes}
 * @implements {crypto.createHash}
 * @implements {scope.ed.verify}
 * @param {block} block
 * @return {boolean} verified hash, signature and publicKey
 * @throws {error} catch error
 */
Block.prototype.verifySignature = function (block) {
	var remove = 64;
	var res;

	try {
		var data = this.getBytes(block);
		var data2 = Buffer.alloc(data.length - remove);

		for (var i = 0; i < data2.length; i++) {
			data2[i] = data[i];
		}
		var hash = crypto.createHash('sha256').update(data2).digest();
		var blockSignatureBuffer = Buffer.from(block.blockSignature, 'hex');
		var generatorPublicKeyBuffer = Buffer.from(block.generatorPublicKey, 'hex');
		res = this.scope.ed.verify(hash, blockSignatureBuffer || ' ', generatorPublicKeyBuffer || ' ');
	} catch (e) {
		throw e;
	}

	return res;
};

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
			maxLength: 20
		},
		height: {
			type: 'integer'
		},
		blockSignature: {
			type: 'string',
			format: 'signature'
		},
		generatorPublicKey: {
			type: 'string',
			format: 'publicKey'
		},
		numberOfTransactions: {
			type: 'integer'
		},
		payloadHash: {
			type: 'string',
			format: 'hex'
		},
		payloadLength: {
			type: 'integer'
		},
		previousBlock: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		},
		timestamp: {
			type: 'integer'
		},
		totalAmount: {
			type: 'integer',
			minimum: 0
		},
		totalFee: {
			type: 'integer',
			minimum: 0
		},
		reward: {
			type: 'integer',
			minimum: 0
		},
		transactions: {
			type: 'array',
			uniqueItems: true
		},
		version: {
			type: 'integer',
			minimum: 0
		}
	},
	required: ['blockSignature', 'generatorPublicKey', 'numberOfTransactions', 'payloadHash', 'payloadLength', 'timestamp', 'totalAmount', 'totalFee', 'reward', 'transactions', 'version']
};

/**
 * @implements {scope.schema.validate}
 * @implements {scope.transaction.objectNormalize}
 * @param {block} block
 * @return {error|transaction} error string | block normalized
 * @throws {string|error} error message | catch error
 */
Block.prototype.objectNormalize = function (block) {
	var i;

	for (i in block) {
		if (block[i] == null || typeof block[i] === 'undefined') {
			delete block[i];
		}
	}

	var report = this.scope.schema.validate(block, Block.prototype.schema);

	if (!report) {
		throw 'Failed to validate block schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	try {
		for (i = 0; i < block.transactions.length; i++) {
			block.transactions[i] = this.scope.transaction.objectNormalize(block.transactions[i]);
		}
	} catch (e) {
		throw e;
	}

	return block;
};

/**
 * Calculates block id based on block.
 * @implements {crypto.createHash}
 * @implements {Block.getBytes}
 * @implements {bignum.fromBuffer}
 * @param {block} block
 * @return {string} id string
 */
Block.prototype.getId = function (block) {
	var hash = crypto.createHash('sha256').update(this.getBytes(block)).digest();
	var temp = Buffer.alloc(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	var id = new bignum.fromBuffer(temp).toString();
	return id;
};

/**
 * Creates hash based on block bytes.
 * @implements {Block.getBytes}
 * @implements {crypto.createHash}
 * @param {block} block
 * @return {hash} sha256 crypto hash
 */
Block.prototype.getHash = function (block) {
	return crypto.createHash('sha256').update(this.getBytes(block)).digest();
};

/**
 * Returns send fees from constants.
 * @param {block} block
 * @return {number} fee
 * @todo delete unused input parameter
 */
Block.prototype.calculateFee = function (block) {
	return constants.fees.send;
};

/**
 * Creates block object based on raw data.
 * @implements {bignum}
 * @param {Object} raw
 * @return {null|block} blcok object
 */
Block.prototype.dbRead = function (raw) {
	if (!raw.b_id) {
		return null;
	} else {
		var block = {
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
			confirmations: parseInt(raw.b_confirmations)
		};
		block.totalForged = new bignum(block.totalFee).plus(new bignum(block.reward)).toString();
		return block;
	}
};

// Export
module.exports = Block;
