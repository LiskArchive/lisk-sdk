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
 * @param {transaction} trs
 * @param {account} sender
 * @return {number} fee
 */
InTransfer.prototype.calculateFee = function (trs, sender) {
	return constants.fees.send;
};

/**
 * Verifies recipientId, amount and InTransfer object content.
 * Finds application into `dapps` table.
 * @implements {library.db.one}
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} errors message | trs
 */
InTransfer.prototype.verify = function (trs, sender, cb) {
	if (trs.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!trs.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!trs.asset || !trs.asset.inTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	library.db.one(sql.countByTransactionId, {
		id: trs.asset.inTransfer.dappId
	}).then(function (row) {
		if (row.count === 0) {
			return setImmediate(cb, 'Application not found: ' + trs.asset.inTransfer.dappId);
		} else {
			return setImmediate(cb);
		}
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb, null, trs
 */
InTransfer.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

/**
 * Creates buffer with inTransfer content:
 * - dappId
 * @param {transaction} trs
 * @return {Array} Buffer
 * @throws {e} Error
 */
InTransfer.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = Buffer.from([]);
		var nameBuf = Buffer.from(trs.asset.inTransfer.dappId, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Calls getGenesis with dappid to obtain authorId.
 * Calls mergeAccountAndGet with unconfirmed trs amount and authorId as 
 * address.
 * @implements {shared.getGenesis}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} trs
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
InTransfer.prototype.apply = function (trs, block, sender, cb) {
	shared.getGenesis({dappid: trs.asset.inTransfer.dappId}, function (err, res) {
		if (err) {
			return setImmediate(cb, err);
		}
		modules.accounts.mergeAccountAndGet({
			address: res.authorId,
			balance: trs.amount,
			u_balance: trs.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * Calls getGenesis with dappid to obtain authorId.
 * Calls mergeAccountAndGet with authorId as address and unconfirmed 
 * trs amount and balance both negatives.
 * @implements {shared.getGenesis}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @implements {slots.calcRound}
 * @param {transaction} trs
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @return {setImmediateCallback} error, cb
 */
InTransfer.prototype.undo = function (trs, block, sender, cb) {
	shared.getGenesis({dappid: trs.asset.inTransfer.dappId}, function (err, res) {
		if (err) {
			return setImmediate(cb, err);
		}
		modules.accounts.mergeAccountAndGet({
			address: res.authorId,
			balance: -trs.amount,
			u_balance: -trs.amount,
			blockId: block.id,
			round: slots.calcRound(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

/**
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.applyUnconfirmed = function (trs, sender, cb) {
	return setImmediate(cb);
};

/**
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.undoUnconfirmed = function (trs, sender, cb) {
	return setImmediate(cb);
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
 * @param {transaction} trs
 * @return {error|transaction} error string | trs normalized
 * @throws {string} error message
 */
InTransfer.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.inTransfer, InTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate inTransfer schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
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
	'dappId',
	'transactionId'
];

/**
 * Creates db operation object to 'intransfer' table based on 
 * inTransfer data.
 * @param {transaction} trs
 * @return {Object[]} table, fields, values.
 */
InTransfer.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			dappId: trs.asset.inTransfer.dappId,
			transactionId: trs.id
		}
	};
};

/**
 * @param {transaction} trs
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
InTransfer.prototype.afterSave = function (trs, cb) {
	return setImmediate(cb);
};

/**
 * Checks sender multisignatures and transaction signatures.
 * @param {transaction} trs
 * @param {account} sender
 * @return {boolean} True if transaction signatures greather than 
 * sender multimin or there are not sender multisignatures.
 */
InTransfer.prototype.ready = function (trs, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(trs.signatures)) {
			return false;
		}
		return trs.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = InTransfer;
