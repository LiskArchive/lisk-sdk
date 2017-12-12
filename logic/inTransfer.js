'use strict';

var constants = require('../helpers/constants.js');
var sql = require('../sql/dapps.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules, library, shared;

/**
 * Initializes library.
 * @memberof module:dapps
 * @class
 * @classdesc Main InTransfer logic.
 * @param {Database} db
 * @param {ZSchema} schema
 */
// Constructor
function InTransfer (db, schema) {
	library = {
		db: db,
		schema: schema,
	};
}

// Public methods
/**
 * Binds input parameters to private variables modules and shared.
 * @param {Accounts} accounts
 * @param {Object} sharedApi
 */
InTransfer.prototype.bind = function (accounts, sharedApi) {
	modules = {
		accounts: accounts
	};
	shared = sharedApi;
};

/**
 * Returns send fee from constants.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {number} fee
 */
InTransfer.prototype.calculateFee = function (transaction, sender) {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and InTransfer object content.
 * Finds application into `dapps` table.
 * @implements {library.db.one}
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors message | transaction
 */
InTransfer.prototype.verify = function (transaction, sender, cb) {
	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!transaction.asset || !transaction.asset.inTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	library.db.one(sql.countByTransactionId, {
		id: transaction.asset.inTransfer.dappId
	}).then(function (row) {
		if (row.count === 0) {
			return setImmediate(cb, 'Application not found: ' + transaction.asset.inTransfer.dappId);
		} else {
			return setImmediate(cb);
		}
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb, null, transaction
 */
InTransfer.prototype.process = function (transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates buffer with inTransfer content:
 * - dappId
 * @param {transaction} transaction
 * @return {Array} Buffer
 * @throws {e} Error
 */
InTransfer.prototype.getBytes = function (transaction) {
	var buf;

	try {
		buf = Buffer.from([]);
		var nameBuf = Buffer.from(transaction.asset.inTransfer.dappId, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw e;
	}

	return buf;
};

InTransfer.prototype.schema = {
	id: 'InTransfer',
	object: true,
	properties: {
		dappId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		},
	},
	required: ['dappId']
};

/**
 * Calls `objectNormalize` with asset inTransfer.
 * @implements {library.schema.validate}
 * @param {transaction} transaction
 * @return {error|transaction} error string | transaction normalized
 * @throws {string} error message
 */
InTransfer.prototype.objectNormalize = function (transaction) {
	var report = library.schema.validate(transaction.asset.inTransfer, InTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate inTransfer schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Creates inTransfer object based on raw data.
 * @param {Object} raw
 * @return {Object} inTransfer with dappId
 */
InTransfer.prototype.dbRead = function (raw) {
	if (!raw.in_dappId) {
		return null;
	} else {
		var inTransfer = {
			dappId: raw.in_dappId
		};

		return {inTransfer: inTransfer};
	}
};

InTransfer.prototype.dbTable = 'intransfer';

InTransfer.prototype.dbFields = [
	'dapp_id',
	'transaction_id'
];

/**
 * Creates db operation object to 'intransfer' table based on
 * inTransfer data.
 * @param {transaction} transaction
 * @return {Object[]} table, fields, values.
 */
InTransfer.prototype.dbSave = function (transaction) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			dapp_id: transaction.asset.inTransfer.dappId,
			transaction_id: transaction.id
		}
	};
};

/**
 * @param {transaction} transaction
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.afterSave = function (transaction, cb) {
	return setImmediate(cb);
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 * @param {transaction} transaction
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 */
InTransfer.prototype.ready = function (transaction, sender) {
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
module.exports = InTransfer;
