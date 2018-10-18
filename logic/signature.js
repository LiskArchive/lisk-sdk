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

const ByteBuffer = require('bytebuffer');
const Bignum = require('../helpers/bignum.js');
const ed = require('../helpers/ed.js');

const { FEES } = global.constants;
let modules;
let library;

/**
 * Main signature logic. Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bytebuffer
 * @param {ZSchema} schema
 * @param {Object} logger
 * @todo Add description for the params
 */
class Signature {
	constructor(schema, logger) {
		library = {
			schema,
			logger,
		};
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds input parameters to private variable modules.
 *
 * @param {Accounts} accounts
 * @todo Add description for the params
 */
Signature.prototype.bind = function(accounts) {
	modules = {
		accounts,
	};
};

/**
 * Obtains constant fee secondSignature.
 *
 * @see {@link module:helpers~constants}
 * @returns {Bignumber} Transaction fee
 */
Signature.prototype.calculateFee = function() {
	return new Bignum(FEES.SECOND_SIGNATURE);
};

/**
 * Verifies signature fields from transaction asset and sender.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error, transaction
 * @todo Add description for the params
 */
Signature.prototype.verify = function(transaction, sender, cb) {
	if (!transaction.asset || !transaction.asset.signature) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	const amount = new Bignum(transaction.amount);
	if (amount.isGreaterThan(0)) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	try {
		if (
			!transaction.asset.signature.publicKey ||
			ed.hexToBuffer(transaction.asset.signature.publicKey).length !== 32
		) {
			return setImmediate(cb, 'Invalid public key');
		}
	} catch (e) {
		library.logger.error(e.stack);
		return setImmediate(cb, 'Invalid public key');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Returns transaction with setImmediate.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} null
 * @todo Check extra parameter sender
 * @todo Add description for the params
 */
Signature.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Returns a buffer with bytes from transaction asset information.
 *
 * @see {@link https://github.com/dcodeIO/bytebuffer.js/wiki/API}
 * @param {transaction} transaction - Uses multisignature from asset
 * @throws {Error}
 * @returns {!Array} Contents as an ArrayBuffer
 * @todo Check if this function is called
 */
Signature.prototype.getBytes = function(transaction) {
	try {
		const byteBuffer = new ByteBuffer(32, true);
		const publicKeyBuffer = ed.hexToBuffer(
			transaction.asset.signature.publicKey
		);

		for (let i = 0; i < publicKeyBuffer.length; i++) {
			byteBuffer.writeByte(publicKeyBuffer[i]);
		}

		byteBuffer.flip();
		return byteBuffer.toBuffer();
	} catch (e) {
		throw e;
	}
};

/**
 * Sets account second signature from transaction asset.
 *
 * @param {transaction} transaction - Uses publicKey from asset signature
 * @param {block} block - Unnecessary parameter
 * @param {account} sender - Uses the address
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 */
Signature.prototype.applyConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	modules.accounts.setAccountAndGet(
		{
			address: sender.address,
			secondSignature: 1,
			secondPublicKey: transaction.asset.signature.publicKey,
		},
		cb,
		tx
	);
};

/**
 * Sets account second signature to null.
 *
 * @param {transaction} transaction - Unnecessary parameter
 * @param {block} block - Unnecessary parameter
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Signature.prototype.undoConfirmed = function(
	transaction,
	block,
	sender,
	cb,
	tx
) {
	modules.accounts.setAccountAndGet(
		{
			address: sender.address,
			secondSignature: 0,
			secondPublicKey: null,
		},
		cb,
		tx
	);
};

/**
 * Activates unconfirmed second signature for sender account.
 *
 * @param {transaction} transaction - Unnecessary parameter
 * @param {block} block - Unnecessary parameter
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error - If second signature is already enabled
 * @todo Add description for the params
 */
Signature.prototype.applyUnconfirmed = function(transaction, sender, cb, tx) {
	if (sender.u_secondSignature || sender.secondSignature) {
		return setImmediate(cb, 'Second signature already enabled');
	}

	modules.accounts.setAccountAndGet(
		{ address: sender.address, u_secondSignature: 1 },
		cb,
		tx
	);
};

/**
 * Deactivates unconfirmed second signature for sender account.
 *
 * @param {transaction} transaction - Unnecessary parameter
 * @param {block} block - Unnecessary parameter
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Signature.prototype.undoUnconfirmed = function(transaction, sender, cb, tx) {
	modules.accounts.setAccountAndGet(
		{ address: sender.address, u_secondSignature: 0 },
		cb,
		tx
	);
};
/**
 * @typedef signature
 * @property {publicKey} publicKey
 */
Signature.prototype.schema = {
	id: 'Signature',
	type: 'object',
	properties: {
		publicKey: {
			type: 'string',
			format: 'publicKey',
		},
	},
	required: ['publicKey'],
};

/**
 * Validates signature schema.
 *
 * @param {transaction} transaction - Uses signature from asset
 * @throws {string}
 * @returns {transaction} Validated transaction
 */
Signature.prototype.objectNormalize = function(transaction) {
	const report = library.schema.validate(
		transaction.asset.signature,
		Signature.prototype.schema
	);

	if (!report) {
		throw `Failed to validate signature schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates signature object based on raw data.
 *
 * @param {Object} raw - Data from database
 * @returns {multisignature} Signature object with transaction id
 * @todo Check if this function is called
 */
Signature.prototype.dbRead = function(raw) {
	if (!raw.s_publicKey) {
		return null;
	}
	const signature = {
		transactionId: raw.t_id,
		publicKey: raw.s_publicKey,
	};

	return { signature };
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
Signature.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = Signature;
