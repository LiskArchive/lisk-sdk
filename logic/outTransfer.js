'use strict';

var constants = require('../helpers/constants.js');
var sql = require('../sql/dapps.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules, library, __private = {};

__private.unconfirmedOutTansfers = {};

/**
 * Initializes library.
 * @memberof module:dapps
 * @class
 * @classdesc Main OutTransfer logic.
 * @param {Database} db
 * @param {ZSchema} schema
 * @param {Object} logger
 */
// Constructor
function OutTransfer (db, schema, logger) {
	library = {
		db: db,
		schema: schema,
		logger: logger,
	};
}

// Public methods
/**
 * Binds input modules to private variable module.
 * @param {Accounts} accounts
 */
OutTransfer.prototype.bind = function (accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Returns send fee from constants.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {number} fee
 */
OutTransfer.prototype.calculateFee = function (transaction, sender) {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and outTransfer object content.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors messages | transaction
 */
OutTransfer.prototype.verify = function (transaction, sender, cb) {
	if (!transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.outTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!/^[0-9]+$/.test(transaction.asset.outTransfer.dappId)) {
		return setImmediate(cb, 'Invalid outTransfer dappId');
	}

	if (!/^[0-9]+$/.test(transaction.asset.outTransfer.transactionId)) {
		return setImmediate(cb, 'Invalid outTransfer transactionId');
	}

	return setImmediate(cb, null, transaction);
};

/**
 * Finds application into `dapps` table. Checks if transaction is already
 * processed. Checks if transaction is already confirmed.
 * @implements {library.db.one}
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors messages | transaction
 */
OutTransfer.prototype.process = function (transaction, sender, cb) {
	library.db.one(sql.countByTransactionId, {
		id: transaction.asset.outTransfer.dappId
	}).then(function (row) {
		if (row.count === 0) {
			return setImmediate(cb, 'Application not found: ' + transaction.asset.outTransfer.dappId);
		}

		if (__private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId]) {
			return setImmediate(cb, 'Transaction is already processed: ' + transaction.asset.outTransfer.transactionId);
		}

		library.db.one(sql.countByOutTransactionId, {
			transactionId: transaction.asset.outTransfer.transactionId
		}).then(function (row) {
			if (row.count > 0) {
				return setImmediate(cb, 'Transaction is already confirmed: ' + transaction.asset.outTransfer.transactionId);
			} else {
				return setImmediate(cb, null, transaction);
			}
		}).catch(function (err) {
			return setImmediate(cb, err);
		});
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Creates buffer with outTransfer content:
 * - dappId
 * - transactionId
 * @param {transaction} transaction
 * @return {Array} Buffer
 * @throws {e} Error
 */
OutTransfer.prototype.getBytes = function (transaction) {
	var buf;

	try {
		buf = Buffer.from([]);
		var dappIdBuf = Buffer.from(transaction.asset.outTransfer.dappId, 'utf8');
		var transactionIdBuff = Buffer.from(transaction.asset.outTransfer.transactionId, 'utf8');
		buf = Buffer.concat([buf, dappIdBuf, transactionIdBuff]);
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Sets unconfirmed out transfers to false.
 * Calls setAccountAndGet based on transaction recipientId and
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
OutTransfer.prototype.apply = function (transaction, block, sender, cb) {
	__private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false;

	modules.accounts.setAccountAndGet({address: transaction.recipientId}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}

		modules.accounts.mergeAccountAndGet({
			address: transaction.recipientId,
			balance: transaction.amount,
			u_balance: transaction.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * Sets unconfirmed out transfers to true.
 * Calls setAccountAndGet based on transaction recipientId and
 * mergeAccountAndGet with unconfirmed transaction amount and balance both negatives.
 * @implements {modules.accounts.setAccountAndGet}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
OutTransfer.prototype.undo = function (transaction, block, sender, cb) {
	__private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true;

	modules.accounts.setAccountAndGet({address: transaction.recipientId}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}
		modules.accounts.mergeAccountAndGet({
			address: transaction.recipientId,
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
 * Sets unconfirmed OutTansfers to true.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
OutTransfer.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	__private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = true;
	return setImmediate(cb);
};

/**
 * Sets unconfirmed OutTansfers to false.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
OutTransfer.prototype.undoUnconfirmed = function (transaction, sender, cb) {
	__private.unconfirmedOutTansfers[transaction.asset.outTransfer.transactionId] = false;
	return setImmediate(cb);
};

OutTransfer.prototype.schema = {
	id: 'OutTransfer',
	object: true,
	properties: {
		dappId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		},
		transactionId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		}
	},
	required: ['dappId', 'transactionId']
};

/**
 * Calls `objectNormalize` with asset outTransfer.
 * @implements {library.schema.validate}
 * @param {transaction} transaction
 * @return {error|transaction} error string | transaction normalized
 * @throws {string} error message
 */
OutTransfer.prototype.objectNormalize = function (transaction) {
	var report = library.schema.validate(transaction.asset.outTransfer, OutTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate outTransfer schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Creates outTransfer object based on raw data.
 * @param {Object} raw
 * @return {Object} outTransfer with dappId and transactionId
 */
OutTransfer.prototype.dbRead = function (raw) {
	if (!raw.ot_dappId) {
		return null;
	} else {
		var outTransfer = {
			dappId: raw.ot_dappId,
			transactionId: raw.ot_outTransactionId
		};

		return {outTransfer: outTransfer};
	}
};

OutTransfer.prototype.dbTable = 'outtransfer';

OutTransfer.prototype.dbFields = [
	'dappId',
	'outTransactionId',
	'transactionId'
];

/**
 * Creates db operation object to 'outtransfer' table based on
 * outTransfer data.
 * @param {transaction} transaction
 * @return {Object[]} table, fields, values.
 */
OutTransfer.prototype.dbSave = function (transaction) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			dappId: transaction.asset.outTransfer.dappId,
			outTransactionId: transaction.asset.outTransfer.transactionId,
			transactionId: transaction.id
		}
	};
};

/**
 * Checks sender multisignatures and transaction signatures.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than
 * sender multimin or there are not sender multisignatures.
 */
OutTransfer.prototype.ready = function (transaction, sender) {
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
module.exports = OutTransfer;
