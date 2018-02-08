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

var crypto = require('crypto');
var extend = require('extend');
var ByteBuffer = require('bytebuffer');
var _ = require('lodash');
var bignum = require('../helpers/bignum.js');
var constants = require('../helpers/constants.js');
var exceptions = require('../helpers/exceptions.js');
var slots = require('../helpers/slots.js');

// Private fields
var self;
var __private = {};

/**
 * @typedef {Object} privateTypes
 * - 0: Transfer
 * - 1: Signature
 * - 2: Delegate
 * - 3: Vote
 * - 4: Multisignature
 * - 5: DApp
 * - 6: InTransfer
 * - 7: OutTransfer
 */
__private.types = {};

/**
 * Main transaction logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bytebuffer
 * @requires crypto
 * @requires extend
 * @requires lodash
 * @requires helpers/bignum
 * @requires helpers/constants
 * @requires helpers/exceptions
 * @requires helpers/slots
 * @param {Database} db - Description of the param
 * @param {Object} ed - Description of the param
 * @param {ZSchema} schema - Description of the param
 * @param {Object} genesisblock - Description of the param
 * @param {Account} account - Description of the param
 * @param {Object} logger - Description of the param
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} With `this` as data.
 * @todo Add descriptions for the params
 */
// Constructor
function Transaction(db, ed, schema, genesisblock, account, logger, cb) {
	this.scope = {
		db: db,
		ed: ed,
		schema: schema,
		genesisblock: genesisblock,
		account: account,
		logger: logger,
	};
	self = this;
	if (cb) {
		return setImmediate(cb, null, this);
	}
}

// Public methods
/**
 * Sets private type based on type id after instance object validation.
 *
 * @param {number} typeId - Description of the param
 * @param {Object} instance - Description of the param
 * @throws {string} Invalid instance interface if validations are wrong
 * @returns {Object} instance
 * @todo Add descriptions for the params
 */
Transaction.prototype.attachAssetType = function(typeId, instance) {
	if (
		instance &&
		typeof instance.getBytes === 'function' &&
		typeof instance.calculateFee === 'function' &&
		typeof instance.verify === 'function' &&
		typeof instance.objectNormalize === 'function' &&
		typeof instance.dbRead === 'function' &&
		typeof instance.apply === 'function' &&
		typeof instance.undo === 'function' &&
		typeof instance.applyUnconfirmed === 'function' &&
		typeof instance.undoUnconfirmed === 'function' &&
		typeof instance.ready === 'function' &&
		typeof instance.process === 'function'
	) {
		__private.types[typeId] = instance;
		return instance;
	} else {
		throw 'Invalid instance interface';
	}
};

/**
 * Creates a signature.
 *
 * @param {Object} keypair - Constains privateKey and publicKey
 * @param {transaction} transaction - Description of the param
 * @returns {signature} sign
 * @todo Add descriptions for the params
 */
Transaction.prototype.sign = function(keypair, transaction) {
	var hash = this.getHash(transaction);
	return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
};

/**
 * Creates a signature based on multiple signatures
 *
 * @param {Object} keypair - Constains privateKey and publicKey
 * @param {transaction} transaction - Description of the param
 * @returns {signature} sign
 * @todo Add descriptions for the params
 */
Transaction.prototype.multisign = function(keypair, transaction) {
	var bytes = this.getBytes(transaction, true, true);
	var hash = crypto
		.createHash('sha256')
		.update(bytes)
		.digest();
	return this.scope.ed.sign(hash, keypair.privateKey).toString('hex');
};

/**
 * Calculates transaction id based on transaction
 *
 * @param {transaction} transaction - Description of the param
 * @returns {string} id@todo Add descriptions for the params
 *
 */
Transaction.prototype.getId = function(transaction) {
	var hash = this.getHash(transaction);
	var temp = Buffer.alloc(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	var id = bignum.fromBuffer(temp).toString();
	return id;
};

/**
 * Creates hash based on transaction bytes.
 *
 * @param {transaction} transaction - Description of the param
 * @returns {hash} sha256 crypto hash
 * @todo Add descriptions for the params
 */
Transaction.prototype.getHash = function(transaction) {
	return crypto
		.createHash('sha256')
		.update(this.getBytes(transaction))
		.digest();
};

/**
 * Calls `getBytes` based on transaction type (see privateTypes)
 * @see privateTypes
 *
 * @param {transaction} transaction - Description of the param
 * @param {boolean} skipSignature - Description of the param
 * @param {boolean} skipSecondSignature - Description of the param
 * @throws {error} If buffer fails.
 * @returns {!Array} Contents as an ArrayBuffer.
 * @todo Add descriptions for the params
 */
Transaction.prototype.getBytes = function(
	transaction,
	skipSignature,
	skipSecondSignature
) {
	if (!__private.types[transaction.type]) {
		throw `Unknown transaction type ${transaction.type}`;
	}

	var bb;

	try {
		var assetBytes = __private.types[transaction.type].getBytes.call(
			this,
			transaction,
			skipSignature,
			skipSecondSignature
		);
		var assetSize = assetBytes ? assetBytes.length : 0;
		var i;

		bb = new ByteBuffer(1 + 4 + 32 + 32 + 8 + 8 + 64 + 64 + assetSize, true);
		bb.writeByte(transaction.type);
		bb.writeInt(transaction.timestamp);

		var senderPublicKeyBuffer = Buffer.from(transaction.senderPublicKey, 'hex');
		for (i = 0; i < senderPublicKeyBuffer.length; i++) {
			bb.writeByte(senderPublicKeyBuffer[i]);
		}

		if (transaction.requesterPublicKey) {
			var requesterPublicKey = Buffer.from(
				transaction.requesterPublicKey,
				'hex'
			);
			for (i = 0; i < requesterPublicKey.length; i++) {
				bb.writeByte(requesterPublicKey[i]);
			}
		}

		if (transaction.recipientId) {
			var recipient = transaction.recipientId.slice(0, -1);
			recipient = new bignum(recipient).toBuffer({ size: 8 });

			for (i = 0; i < 8; i++) {
				bb.writeByte(recipient[i] || 0);
			}
		} else {
			for (i = 0; i < 8; i++) {
				bb.writeByte(0);
			}
		}

		bb.writeLong(transaction.amount);

		if (assetSize > 0) {
			for (i = 0; i < assetSize; i++) {
				bb.writeByte(assetBytes[i]);
			}
		}

		if (!skipSignature && transaction.signature) {
			var signatureBuffer = Buffer.from(transaction.signature, 'hex');
			for (i = 0; i < signatureBuffer.length; i++) {
				bb.writeByte(signatureBuffer[i]);
			}
		}

		if (!skipSecondSignature && transaction.signSignature) {
			var signSignatureBuffer = Buffer.from(transaction.signSignature, 'hex');
			for (i = 0; i < signSignatureBuffer.length; i++) {
				bb.writeByte(signSignatureBuffer[i]);
			}
		}

		bb.flip();
	} catch (e) {
		throw e;
	}

	return bb.toBuffer();
};

/**
 * Calls `ready` based on transaction type (see privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {function|boolean} calls `ready` | false
 * @todo Add descriptions for the params
 */
Transaction.prototype.ready = function(transaction, sender) {
	if (!__private.types[transaction.type]) {
		throw `Unknown transaction type ${transaction.type}`;
	}

	if (!sender) {
		return false;
	}

	return __private.types[transaction.type].ready.call(
		this,
		transaction,
		sender
	);
};

/**
 * Counts transactions from `trs` table by id.
 *
 * @param {transaction} transaction - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} error | row.count
 * @todo Add descriptions for the params
 */
Transaction.prototype.countById = function(transaction, cb) {
	self.scope.db.transactions
		.countById(transaction.id)
		.then(count => setImmediate(cb, null, count))
		.catch(err => {
			self.scope.logger.error(err.stack);
			return setImmediate(cb, 'Transaction#countById error');
		});
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} error | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.checkConfirmed = function(transaction, cb) {
	this.countById(transaction, (err, count) => {
		if (err) {
			return setImmediate(cb, err);
		} else if (count > 0) {
			return setImmediate(
				cb,
				`Transaction is already confirmed: ${transaction.id}`
			);
		} else {
			return setImmediate(cb);
		}
	});
};

/**
 * Checks if balance is less than amount for sender.
 *
 * @param {number} amount - Description of the param
 * @param {number} balance - Description of the param
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {Object} With exceeded boolean and error: address, balance
 * @todo Add descriptions for the params
 */
Transaction.prototype.checkBalance = function(
	amount,
	balance,
	transaction,
	sender
) {
	var exceededBalance = new bignum(sender[balance].toString()).lessThan(amount);
	var exceeded =
		transaction.blockId !== this.scope.genesisblock.block.id && exceededBalance;

	return {
		exceeded: exceeded,
		error: exceeded
			? [
					'Account does not have enough LSK:',
					sender.address,
					'balance:',
					new bignum(sender[balance].toString() || '0').div(Math.pow(10, 8)),
				].join(' ')
			: null,
	};
};

/**
 * Validates parameters.
 * Calls `process` based on transaction type (see privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {account} requester - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} validation errors | transaction
 * @todo Add descriptions for the params
 */
Transaction.prototype.process = function(
	transaction,
	sender,
	requester,
	cb,
	tx
) {
	if (typeof requester === 'function') {
		cb = requester;
	}

	// Check transaction type
	if (!__private.types[transaction.type]) {
		return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
	}

	// if (!this.ready(trs, sender)) {
	// 	return setImmediate(cb, 'Transaction is not ready: ' + trs.id);
	// }

	// Check sender
	if (!sender) {
		return setImmediate(cb, 'Missing sender');
	}

	// Get transaction id
	var txId;

	try {
		txId = this.getId(transaction);
	} catch (e) {
		this.scope.logger.error(e.stack);
		return setImmediate(cb, 'Failed to get transaction id');
	}

	// Check transaction id
	if (transaction.id && transaction.id !== txId) {
		return setImmediate(cb, 'Invalid transaction id');
	} else {
		transaction.id = txId;
	}

	// Equalize sender address
	transaction.senderId = sender.address;

	// Call process on transaction type
	__private.types[transaction.type].process.call(
		this,
		transaction,
		sender,
		(err, transaction) => {
			if (err) {
				return setImmediate(cb, err);
			} else {
				return setImmediate(cb, null, transaction);
			}
		},
		tx
	);
};

/**
 * Validates parameters.
 * Calls `process` based on transaction type (see privateTypes)
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {account} requester - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} validation errors | transaction
 * @todo Add descriptions for the params
 */
Transaction.prototype.verify = function(
	transaction,
	sender,
	requester,
	cb,
	tx
) {
	var valid = false;
	var err = null;

	if (typeof requester === 'function') {
		cb = requester;
	}

	// Check sender
	if (!sender) {
		return setImmediate(cb, 'Missing sender');
	}

	// Check transaction type
	if (!__private.types[transaction.type]) {
		return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
	}

	// Check for missing sender second signature
	if (
		!transaction.requesterPublicKey &&
		sender.secondSignature &&
		!transaction.signSignature &&
		transaction.blockId !== this.scope.genesisblock.block.id
	) {
		return setImmediate(cb, 'Missing sender second signature');
	}

	// If second signature provided, check if sender has one enabled
	if (
		!transaction.requesterPublicKey &&
		!sender.secondSignature &&
		(transaction.signSignature && transaction.signSignature.length > 0)
	) {
		return setImmediate(cb, 'Sender does not have a second signature');
	}

	// Check for missing requester second signature
	if (
		transaction.requesterPublicKey &&
		requester.secondSignature &&
		!transaction.signSignature
	) {
		return setImmediate(cb, 'Missing requester second signature');
	}

	// If second signature provided, check if requester has one enabled
	if (
		transaction.requesterPublicKey &&
		!requester.secondSignature &&
		(transaction.signSignature && transaction.signSignature.length > 0)
	) {
		return setImmediate(cb, 'Requester does not have a second signature');
	}

	// Check sender public key
	if (sender.publicKey && sender.publicKey !== transaction.senderPublicKey) {
		err = [
			'Invalid sender public key:',
			transaction.senderPublicKey,
			'expected:',
			sender.publicKey,
		].join(' ');

		if (exceptions.senderPublicKey.indexOf(transaction.id) > -1) {
			this.scope.logger.debug(err);
			this.scope.logger.debug(JSON.stringify(transaction));
		} else {
			return setImmediate(cb, err);
		}
	}

	// Check sender is not genesis account unless block id equals genesis
	if (
		[
			exceptions.genesisPublicKey.mainnet,
			exceptions.genesisPublicKey.testnet,
		].indexOf(sender.publicKey) !== -1 &&
		transaction.blockId !== this.scope.genesisblock.block.id
	) {
		return setImmediate(
			cb,
			'Invalid sender. Can not send from genesis account'
		);
	}

	// Check sender address
	if (
		String(transaction.senderId).toUpperCase() !==
		String(sender.address).toUpperCase()
	) {
		return setImmediate(cb, 'Invalid sender address');
	}

	// Determine multisignatures from sender or transaction asset
	var multisignatures = sender.multisignatures || [];
	if (multisignatures.length === 0) {
		if (
			transaction.asset &&
			transaction.asset.multisignature &&
			transaction.asset.multisignature.keysgroup
		) {
			for (
				var i = 0;
				i < transaction.asset.multisignature.keysgroup.length;
				i++
			) {
				var key = transaction.asset.multisignature.keysgroup[i];

				if (!key || typeof key !== 'string') {
					return setImmediate(cb, 'Invalid member in keysgroup');
				}

				multisignatures.push(key.slice(1));
			}
		}
	}

	// Check requester public key
	if (transaction.requesterPublicKey) {
		multisignatures.push(transaction.senderPublicKey);

		if (
			!Array.isArray(sender.multisignatures) ||
			sender.multisignatures.indexOf(transaction.requesterPublicKey) < 0
		) {
			return setImmediate(
				cb,
				'Account does not belong to multisignature group'
			);
		}
	}

	// Verify signature
	try {
		valid = false;
		valid = this.verifySignature(
			transaction,
			transaction.requesterPublicKey || transaction.senderPublicKey,
			transaction.signature
		);
	} catch (e) {
		this.scope.logger.error(e.stack);
		return setImmediate(cb, e.toString());
	}

	if (!valid) {
		err = 'Failed to verify signature';

		if (exceptions.signatures.indexOf(transaction.id) > -1) {
			this.scope.logger.debug(err);
			this.scope.logger.debug(JSON.stringify(transaction));
			valid = true;
			err = null;
		} else {
			return setImmediate(cb, err);
		}
	}

	// Verify second signature
	if (requester.secondSignature || sender.secondSignature) {
		try {
			valid = false;
			valid = this.verifySecondSignature(
				transaction,
				requester.secondPublicKey || sender.secondPublicKey,
				transaction.signSignature
			);
		} catch (e) {
			return setImmediate(cb, e.toString());
		}

		if (!valid) {
			return setImmediate(cb, 'Failed to verify second signature');
		}
	}

	// Check that signatures are unique
	if (transaction.signatures && transaction.signatures.length) {
		var signatures = transaction.signatures.reduce((p, c) => {
			if (p.indexOf(c) < 0) {
				p.push(c);
			}
			return p;
		}, []);

		if (signatures.length !== transaction.signatures.length) {
			return setImmediate(cb, 'Encountered duplicate signature in transaction');
		}
	}

	// Verify multisignatures
	if (transaction.signatures) {
		for (var d = 0; d < transaction.signatures.length; d++) {
			valid = false;

			for (var s = 0; s < multisignatures.length; s++) {
				if (
					transaction.requesterPublicKey &&
					multisignatures[s] === transaction.requesterPublicKey
				) {
					continue; // eslint-disable-line no-continue
				}

				if (
					this.verifySignature(
						transaction,
						multisignatures[s],
						transaction.signatures[d]
					)
				) {
					valid = true;
				}
			}

			if (!valid) {
				return setImmediate(cb, 'Failed to verify multisignature');
			}
		}
	}

	// Calculate fee
	var fee =
		__private.types[transaction.type].calculateFee.call(
			this,
			transaction,
			sender
		) || false;
	if (!fee || transaction.fee !== fee) {
		return setImmediate(cb, 'Invalid transaction fee');
	}

	// Check amount
	if (
		transaction.amount < 0 ||
		transaction.amount > constants.totalAmount ||
		String(transaction.amount).indexOf('.') >= 0 ||
		transaction.amount.toString().indexOf('e') >= 0
	) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	// Check confirmed sender balance
	var amount = new bignum(transaction.amount.toString()).plus(
		transaction.fee.toString()
	);
	var senderBalance = this.checkBalance(amount, 'balance', transaction, sender);

	if (senderBalance.exceeded) {
		return setImmediate(cb, senderBalance.error);
	}

	// Check timestamp
	if (slots.getSlotNumber(transaction.timestamp) > slots.getSlotNumber()) {
		return setImmediate(
			cb,
			'Invalid transaction timestamp. Timestamp is in the future'
		);
	}

	// Call verify on transaction type
	__private.types[transaction.type].verify.call(
		this,
		transaction,
		sender,
		err => {
			if (err) {
				return setImmediate(cb, err);
			} else {
				// Check for already confirmed transaction
				return self.checkConfirmed(transaction, cb);
			}
		},
		tx
	);
};

/**
 * Verifies signature for valid transaction type.
 *
 * @param {transaction} transaction - Description of the param
 * @param {publicKey} publicKey - Description of the param
 * @param {signature} signature - Description of the param
 * @throws {error}
 * @returns {boolean}
 * @todo Add descriptions for the params
 */
Transaction.prototype.verifySignature = function(
	transaction,
	publicKey,
	signature
) {
	if (!__private.types[transaction.type]) {
		throw `Unknown transaction type ${transaction.type}`;
	}

	if (!signature) {
		return false;
	}

	var res;

	try {
		var bytes = this.getBytes(transaction, true, true);
		res = this.verifyBytes(bytes, publicKey, signature);
	} catch (e) {
		throw e;
	}

	return res;
};

/**
 * Verifies second signature for valid transaction type.
 *
 * @param {transaction} transaction - Description of the param
 * @param {publicKey} publicKey - Description of the param
 * @param {signature} signature - Description of the param
 * @throws {error}
 * @returns {boolean}
 * @todo Add descriptions for the params
 */
Transaction.prototype.verifySecondSignature = function(
	transaction,
	publicKey,
	signature
) {
	if (!__private.types[transaction.type]) {
		throw `Unknown transaction type ${transaction.type}`;
	}

	if (!signature) {
		return false;
	}

	var res;

	try {
		var bytes = this.getBytes(transaction, false, true);
		res = this.verifyBytes(bytes, publicKey, signature);
	} catch (e) {
		throw e;
	}

	return res;
};

/**
 * Verifies hash, publicKey and signature.
 *
 * @param {Array} bytes - Description of the param
 * @param {publicKey} publicKey - Description of the param
 * @param {signature} signature - Description of the param
 * @throws {error}
 * @returns {boolean} verified hash, signature and publicKey
 * @todo Add descriptions for the params
 */
Transaction.prototype.verifyBytes = function(bytes, publicKey, signature) {
	var res;

	try {
		var data2 = Buffer.alloc(bytes.length);

		for (var i = 0; i < data2.length; i++) {
			data2[i] = bytes[i];
		}

		var hash = crypto
			.createHash('sha256')
			.update(data2)
			.digest();
		var signatureBuffer = Buffer.from(signature, 'hex');
		var publicKeyBuffer = Buffer.from(publicKey, 'hex');

		res = this.scope.ed.verify(
			hash,
			signatureBuffer || ' ',
			publicKeyBuffer || ' '
		);
	} catch (e) {
		throw e;
	}

	return res;
};

/**
 * Merges account into sender address, Calls `apply` based on transaction type (privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} for errors | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.apply = function(transaction, block, sender, cb, tx) {
	if (!this.ready(transaction, sender)) {
		return setImmediate(cb, 'Transaction is not ready');
	}

	// Check confirmed sender balance
	var amount = new bignum(transaction.amount.toString()).plus(
		transaction.fee.toString()
	);
	var senderBalance = this.checkBalance(amount, 'balance', transaction, sender);

	if (senderBalance.exceeded) {
		return setImmediate(cb, senderBalance.error);
	}

	amount = amount.toNumber();

	this.scope.logger.trace('Logic/Transaction->apply', {
		sender: sender.address,
		balance: -amount,
		blockId: block.id,
		round: slots.calcRound(block.height),
	});
	this.scope.account.merge(
		sender.address,
		{
			balance: -amount,
			blockId: block.id,
			round: slots.calcRound(block.height),
		},
		(err, sender) => {
			if (err) {
				return setImmediate(cb, err);
			}
			/**
			 * calls apply for Transfer, Signature, Delegate, Vote, Multisignature,
			 * DApp, InTransfer or OutTransfer.
			 */
			__private.types[transaction.type].apply.call(
				this,
				transaction,
				block,
				sender,
				err => {
					if (err) {
						this.scope.account.merge(
							sender.address,
							{
								balance: amount,
								blockId: block.id,
								round: slots.calcRound(block.height),
							},
							err => setImmediate(cb, err),
							tx
						);
					} else {
						return setImmediate(cb);
					}
				},
				tx
			);
		},
		tx
	);
};

/**
 * Merges account into sender address, Calls `undo` based on transaction type (privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} for errors | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.undo = function(transaction, block, sender, cb) {
	var amount = new bignum(transaction.amount.toString());
	amount = amount.plus(transaction.fee.toString()).toNumber();

	this.scope.logger.trace('Logic/Transaction->undo', {
		sender: sender.address,
		balance: amount,
		blockId: block.id,
		round: slots.calcRound(block.height),
	});
	this.scope.account.merge(
		sender.address,
		{
			balance: amount,
			blockId: block.id,
			round: slots.calcRound(block.height),
		},
		(err, sender) => {
			if (err) {
				return setImmediate(cb, err);
			}

			__private.types[transaction.type].undo.call(
				this,
				transaction,
				block,
				sender,
				err => {
					if (err) {
						this.scope.account.merge(
							sender.address,
							{
								balance: -amount,
								blockId: block.id,
								round: slots.calcRound(block.height),
							},
							err => setImmediate(cb, err)
						);
					} else {
						return setImmediate(cb);
					}
				}
			);
		}
	);
};

/**
 * Checks unconfirmed sender balance. Merges account into sender address with
 * unconfirmed balance negative amount.
 * Calls `applyUnconfirmed` based on transaction type (privateTypes). If error merge
 * account with amount.
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {account} requester - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} for errors | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.applyUnconfirmed = function(
	transaction,
	sender,
	requester,
	cb,
	tx
) {
	if (typeof requester === 'function') {
		if (cb) {
			tx = cb;
		}

		cb = requester;
	}

	// Check unconfirmed sender balance
	var amount = new bignum(transaction.amount.toString()).plus(
		transaction.fee.toString()
	);
	var senderBalance = this.checkBalance(
		amount,
		'u_balance',
		transaction,
		sender
	);

	if (senderBalance.exceeded) {
		return setImmediate(cb, senderBalance.error);
	}

	amount = amount.toNumber();

	this.scope.account.merge(
		sender.address,
		{ u_balance: -amount },
		(err, sender) => {
			if (err) {
				return setImmediate(cb, err);
			}

			__private.types[transaction.type].applyUnconfirmed.call(
				this,
				transaction,
				sender,
				err => {
					if (err) {
						this.scope.account.merge(
							sender.address,
							{ u_balance: amount },
							err2 => setImmediate(cb, err2 || err),
							tx
						);
					} else {
						return setImmediate(cb);
					}
				},
				tx
			);
		},
		tx
	);
};

/**
 * Merges account into sender address with unconfirmed balance transaction amount.
 * Calls `undoUnconfirmed` based on transaction type (privateTypes). If error merge
 * account with megative amount.
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} for errors | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.undoUnconfirmed = function(transaction, sender, cb, tx) {
	var amount = new bignum(transaction.amount.toString());
	amount = amount.plus(transaction.fee.toString()).toNumber();

	this.scope.account.merge(
		sender.address,
		{ u_balance: amount },
		(err, sender) => {
			if (err) {
				return setImmediate(cb, err);
			}

			__private.types[transaction.type].undoUnconfirmed.call(
				this,
				transaction,
				sender,
				err => {
					if (err) {
						this.scope.account.merge(
							sender.address,
							{ u_balance: -amount },
							err2 => setImmediate(cb, err2 || err),
							tx
						);
					} else {
						return setImmediate(cb);
					}
				},
				tx
			);
		},
		tx
	);
};

/**
 * Calls `afterSave` based on transaction type (privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} error string | cb
 * @todo Add descriptions for the params
 */
Transaction.prototype.afterSave = function(transaction, cb) {
	var tx_type = __private.types[transaction.type];

	if (!tx_type) {
		return setImmediate(cb, `Unknown transaction type ${transaction.type}`);
	} else if (typeof tx_type.afterSave === 'function') {
		return tx_type.afterSave.call(this, transaction, cb);
	} else {
		return setImmediate(cb);
	}
};

/**
 * @typedef {Object} transaction
 * @property {string} id
 * @property {number} height
 * @property {string} blockId
 * @property {number} type
 * @property {number} timestamp
 * @property {publicKey} senderPublicKey
 * @property {publicKey} requesterPublicKey
 * @property {string} senderId
 * @property {string} recipientId
 * @property {number} amount
 * @property {number} fee
 * @property {string} signature
 * @property {string} signSignature
 * @property {Object} asset
 * @property {multisignature} [asset.multisignature]
 * @property {signature} [asset.signature]
 * @property {dapp} [asset.dapp]
 * @property {Object} [asset.outTransfer] - Contains dappId and transactionId
 * @property {Object} [asset.inTransfer] - Contains dappId
 * @property {votes} [asset.votes] - Contains multiple votes to a transactionId
 *
 */
Transaction.prototype.schema = {
	id: 'Transaction',
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
		blockId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20,
		},
		type: {
			type: 'integer',
		},
		timestamp: {
			type: 'integer',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		requesterPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderId: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		recipientId: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		amount: {
			type: 'integer',
			minimum: 0,
			maximum: constants.totalAmount,
		},
		fee: {
			type: 'integer',
			minimum: 0,
			maximum: constants.totalAmount,
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		asset: {
			type: 'object',
		},
	},
	required: ['type', 'timestamp', 'senderPublicKey', 'signature'],
};

/**
 * Calls `objectNormalize` based on transaction type (privateTypes).
 *
 * @see privateTypes
 * @param {transaction} transaction - Description of the param
 * @throws {string} error message
 * @returns {error|transaction} error string | transaction normalized
 * @todo Add descriptions for the params
 */
Transaction.prototype.objectNormalize = function(transaction) {
	if (_.isEmpty(transaction)) {
		throw 'Empty trs passed';
	}
	if (!__private.types[transaction.type]) {
		throw `Unknown transaction type ${transaction.type}`;
	}

	for (var i in transaction) {
		if (
			transaction[i] === null ||
			typeof transaction[i] === 'undefined' ||
			(_.isString(transaction[i]) && _.isEmpty(transaction[i]))
		) {
			delete transaction[i];
		}
	}

	if (transaction.amount) {
		transaction.amount = parseInt(transaction.amount);
	}

	if (transaction.fee) {
		transaction.fee = parseInt(transaction.fee);
	}

	var report = this.scope.schema.validate(
		transaction,
		Transaction.prototype.schema
	);

	if (!report) {
		throw `Failed to validate transaction schema: ${self.scope.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	try {
		transaction = __private.types[transaction.type].objectNormalize.call(
			this,
			transaction
		);
	} catch (e) {
		throw e;
	}

	return transaction;
};

/**
 * Calls `dbRead` based on transaction type (privateTypes) to add tr asset.
 *
 * @see privateTypes
 * @param {Object} raw - Description of the param
 * @throws {string} Unknown transaction type
 * @returns {null|transaction}
 * @todo Add descriptions for the params
 */
Transaction.prototype.dbRead = function(raw) {
	if (!raw.t_id) {
		return null;
	} else {
		var transaction = {
			id: raw.t_id,
			height: raw.b_height,
			blockId: raw.b_id || raw.t_blockId,
			type: parseInt(raw.t_type),
			timestamp: parseInt(raw.t_timestamp),
			senderPublicKey: raw.t_senderPublicKey,
			requesterPublicKey: raw.t_requesterPublicKey,
			senderId: raw.t_senderId,
			recipientId: raw.t_recipientId,
			recipientPublicKey: raw.m_recipientPublicKey || null,
			amount: parseInt(raw.t_amount),
			fee: parseInt(raw.t_fee),
			signature: raw.t_signature,
			signSignature: raw.t_signSignature,
			signatures: raw.t_signatures ? raw.t_signatures.split(',') : [],
			confirmations: parseInt(raw.confirmations),
			asset: {},
		};

		if (!__private.types[transaction.type]) {
			throw `Unknown transaction type ${transaction.type}`;
		}

		var asset = __private.types[transaction.type].dbRead.call(this, raw);

		if (asset) {
			transaction.asset = extend(transaction.asset, asset);
		}

		return transaction;
	}
};

// Export
module.exports = Transaction;
