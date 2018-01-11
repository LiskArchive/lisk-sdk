'use strict';

var constants = require('../helpers/constants.js');
var bignum = require('../helpers/bignum.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules, library;

/**
 * Main transfer logic.
 * @memberof module:transactions
 * @class
 * @classdesc Main transfer logic.
 */
// Constructor
function Transfer (logger, schema) {
	library = {
		logger: logger,
		schema: schema,
	};
}

// Public methods
/**
 * Binds input parameters to private variable modules.
 * @param {Accounts} accounts
 */
Transfer.prototype.bind = function (accounts) {
	modules = {
		accounts: accounts
	};
};

/**
 * Returns send fees from constants.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {number} fee
 */
Transfer.prototype.calculateFee = function (transaction, sender) {
	var fee = new bignum(constants.fees.send);
	if (transaction.asset && transaction.asset.data) {
		fee = fee.plus(constants.fees.data);
	}

	return Number(fee.toString());
};

/**
 * Verifies recipientAddress and amount greather than 0.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors | transaction
 */
Transfer.prototype.verify = function (transaction, sender, cb, tx) {
	if (!transaction.recipientAddress) {
		return setImmediate(cb, 'Missing recipient');
	}

	if (transaction.amount <= 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb, null, transaction
 */
Transfer.prototype.process = function (transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.transfer.data.
 * @param {transaction} transaction
 * @return {buffer} buf
 * @throws {error} error
 */
Transfer.prototype.getBytes = function (transaction) {
	var buf;

	try {
		buf = (transaction.asset && transaction.asset.data) ? Buffer.from(transaction.asset.data, 'utf8') : null;
	} catch (ex) {
		throw ex;
	}

	return buf;
};

/**
 * Calls setAccountAndGet based on transaction recipientAddress and
 * mergeAccountAndGet with unconfirmed transaction amount.
 * @implements {modules.accounts.setAccountAndGet}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
Transfer.prototype.apply = function (transaction, block, sender, cb, tx) {
	modules.accounts.setAccountAndGet({address: transaction.recipientAddress}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}

		modules.accounts.mergeAccountAndGet({
			address: transaction.recipientAddress,
			balance: transaction.amount,
			u_balance: transaction.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		}, tx);
	}, tx);
};

/**
 * Calls setAccountAndGet based on transaction recipientAddress and
 * mergeAccountAndGet with unconfirmed transaction amount and balance negative.
 * @implements {modules.accounts.setAccountAndGet}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
Transfer.prototype.undo = function (transaction, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: transaction.recipientAddress}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}

		modules.accounts.mergeAccountAndGet({
			address: transaction.recipientAddress,
			balance: -transaction.amount,
			u_balance: -transaction.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Transfer.prototype.applyUnconfirmed = function (transaction, sender, cb, tx) {
	return setImmediate(cb);
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Transfer.prototype.undoUnconfirmed = function (transaction, sender, cb, tx) {
	return setImmediate(cb);
};


/**
 * @typedef {Object} transfer 
 * @property {string} data
 */
Transfer.prototype.schema = {
	id: 'transfer',
	type: 'object',
	properties: {
		data: {
			type: 'string',
			format: 'additionalData',
			minLength: constants.additionalData.minLength,
			maxLength: constants.additionalData.maxLength
		}
	}
};

/**
 * Deletes blockId from transaction, and validates schema if asset exists.
 * @param {transaction} transaction
 * @return {transaction}
 */
Transfer.prototype.objectNormalize = function (transaction) {
	delete transaction.blockId;

	if (!transaction.asset) {
		return transaction;
	}

	var report = library.schema.validate(transaction.asset, Transfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate transfer schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Checks if asset exists, if so, returns value, otherwise returns null.
 * @param {Object} raw
 * @return {transferAsset|null}
 */
Transfer.prototype.dbRead = function (raw) {
	if (raw.tf_data) {
		return {data: raw.tf_data};
	}

	return null;
};


/**
 * Checks if transaction has enough signatures to be confirmed.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 */
Transfer.prototype.ready = function (transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = Transfer;
