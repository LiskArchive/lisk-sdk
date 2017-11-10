'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var exceptions = require('../helpers/exceptions.js');

// Private fields
var modules, library, self;

/**
 * Initializes library.
 * @memberof module:delegates
 * @class
 * @classdesc Main delegate logic.
 * @param {logger} logger
 * @param {ZSchema} schema
 */
function Delegate (logger, schema) {
	self = this;
	library = {
		schema: schema,
		logger: logger
	};
}

// Public methods
/**
 * Binds input parameters to private variables modules.
 * @param {Accounts} accounts
 */
Delegate.prototype.bind = function (accounts) {
	modules = {
		accounts: accounts,
	};
};

/**
 * Obtains constant fee delegate.
 * @see {@link module:helpers/constants}
 * @returns {number} constants.fees.delegate
 * @todo delete unnecessary function parameters transaction, sender.
 */
Delegate.prototype.calculateFee = function (transaction, sender) {
	return constants.fees.delegate;
};

/**
 * Verifies fields from transaction and sender, calls modules.accounts.getAccount().
 * @implements module:accounts#Account~getAccount
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|Object} returns error if invalid parameter |
 * transaction validated.
 */
Delegate.prototype.verify = function (transaction, sender, cb) {
	if (transaction.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (transaction.amount !== 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (sender.isDelegate) {
		return setImmediate(cb, 'Account is already a delegate');
	}

	if (!transaction.asset || !transaction.asset.delegate) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!transaction.asset.delegate.username) {
		return setImmediate(cb, 'Username is undefined');
	}

	if (transaction.asset.delegate.username !== transaction.asset.delegate.username.toLowerCase()) {
		return setImmediate(cb, 'Username must be lowercase');
	}

	var isAddress = /^[0-9]{1,21}[L|l]$/g;
	var allowSymbols = /^[a-z0-9!@$&_.]+$/g;

	var username = String(transaction.asset.delegate.username).toLowerCase().trim();

	if (username === '') {
		return setImmediate(cb, 'Empty username');
	}

	if (username.length > 20) {
		return setImmediate(cb, 'Username is too long. Maximum is 20 characters');
	}

	if (isAddress.test(username)) {
		return setImmediate(cb, 'Username can not be a potential address');
	}

	if (!allowSymbols.test(username)) {
		return setImmediate(cb, 'Username can only contain alphanumeric characters with the exception of !@$&_.');
	}

	self.checkConfirmed(transaction, function (err) {
		return setImmediate(cb, err, transaction);
	});
};

/**
 * Returns transaction with setImmediate.
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Null error
 * @todo delete extra parameter sender.
 */
Delegate.prototype.process = function (transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Validates delegate username and returns buffer.
 * @param {transaction} transaction
 * @returns {null|string} Returns null if no delegate| buffer.
 * @throws {error} If buffer fails.
 */
Delegate.prototype.getBytes = function (transaction) {
	if (!transaction.asset.delegate.username) {
		return null;
	}

	var buf;

	try {
		buf = Buffer.from(transaction.asset.delegate.username, 'utf8');
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Calls cb with error when account already exists
 * @param {transaction} transaction
 * @param {string} username - username key to search for (username / u_username)
 * @param {string} isDelegate - isDelegate key to search for (isDelegate / u_isDelegate)
 * @param {function} cb
 */
Delegate.prototype.checkDuplicates = function (transaction, username, isDelegate, cb) {
	async.parallel({
		duplicatedDelegate: function (eachCb) {
			var query = {};
			query[isDelegate] = 1;
			query.publicKey = transaction.senderPublicKey;
			return modules.accounts.getAccount(query, [username], eachCb);
		},
		duplicatedUsername: function (eachCb) {
			var query = {};
			query[username] = transaction.asset.delegate.username;
			return modules.accounts.getAccount(query, [username], eachCb);
		}
	}, function (err, res) {
		if (err) {
			return setImmediate(cb, err);
		}
		if (res.duplicatedDelegate) {
			return setImmediate(cb, 'Account is already a delegate');
		}
		if (res.duplicatedUsername) {
			return setImmediate(cb, 'Username ' + transaction.asset.delegate.username + ' already exists');
		}
		return setImmediate(cb);
	});
};

/**
 * Checks if confirmed delegate is already registered
 * @param {transaction} transaction
 * @param {function} cb
 */
Delegate.prototype.checkConfirmed = function (transaction, cb) {
	self.checkDuplicates(transaction, 'username', 'isDelegate', function (err) {
		if (err && exceptions.delegates.indexOf(transaction.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(transaction));
			err = null;
		}
		return setImmediate(cb, err, transaction);
	});
};

/**
 * Checks if unconfirmed delegate is already registered
 * @param {transaction} transaction
 * @param {function} cb
 */
Delegate.prototype.checkUnconfirmed = function (transaction, cb) {
	self.checkDuplicates(transaction, 'u_username', 'u_isDelegate', function (err) {
		return setImmediate(cb, err, transaction);
	});
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @todo delete extra parameter block.
 */
Delegate.prototype.apply = function (transaction, block, sender, cb) {
	var data = {
		publicKey: transaction.senderPublicKey,
		address: sender.address,
		u_isDelegate: 0,
		isDelegate: 1,
		vote: 0,
		u_username: null,
		username: transaction.asset.delegate.username
	};

	async.series([
		function (seriesCb) {
			self.checkConfirmed(transaction, seriesCb);
		},
		function (seriesCb) {
			modules.accounts.setAccountAndGet(data, seriesCb);
		}
	], cb);
};

/**
 * Checks transaction delegate and no nameexist and calls modules.accounts.setAccountAndGet() with u_username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @todo delete extra parameter block.
 */
Delegate.prototype.undo = function (transaction, block, sender, cb) {
	var data = {
		address: sender.address,
		u_isDelegate: 1,
		isDelegate: 0,
		vote: 0,
		username: null,
		u_username: transaction.asset.delegate.username
	};

	modules.accounts.setAccountAndGet(data, cb);
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with u_username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 */
Delegate.prototype.applyUnconfirmed = function (transaction, sender, cb) {
	var data = {
		publicKey: transaction.senderPublicKey,
		address: sender.address,
		u_isDelegate: 1,
		isDelegate: 0,
		username: null,
		u_username: transaction.asset.delegate.username
	};

	async.series([
		function (seriesCb) {
			self.checkUnconfirmed(transaction, seriesCb);
		},
		function (seriesCb) {
			modules.accounts.setAccountAndGet(data, seriesCb);
		}
	], cb);
};

/**
 * Checks transaction delegate and calls modules.accounts.setAccountAndGet() with
 * username and u_username both null.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function.
 */
Delegate.prototype.undoUnconfirmed = function (transaction, sender, cb) {
	var data = {
		address: sender.address,
		u_isDelegate: 0,
		isDelegate: 0,
		username: null,
		u_username: null
	};

	modules.accounts.setAccountAndGet(data, cb);
};

Delegate.prototype.schema = {
	id: 'Delegate',
	type: 'object',
	properties: {
		username: {
			type: 'string',
			format: 'username'
		}
	},
	required: ['username']
};

/**
 * Validates transaction delegate schema.
 * @param {transaction} transaction
 * @returns {err|transaction} Error message if fails validation | input parameter.
 * @throws {string} Failed to validate delegate schema.
 */
Delegate.prototype.objectNormalize = function (transaction) {
	var report = library.schema.validate(transaction.asset.delegate, Delegate.prototype.schema);

	if (!report) {
		throw 'Failed to validate delegate schema: ' + library.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return transaction;
};

/**
 * Creates delegate Object based on raw data.
 * @param {Object} raw - Contains d_username, t_senderPK, t_senderId.
 * @returns {null|Object} Null if no d_username, otherwise created delegate object.
 */
Delegate.prototype.dbRead = function (raw) {
	if (!raw.d_username) {
		return null;
	} else {
		var delegate = {
			username: raw.d_username,
			publicKey: raw.t_senderPublicKey,
			address: raw.t_senderId
		};

		return {delegate: delegate};
	}
};

Delegate.prototype.dbTable = 'delegates';

Delegate.prototype.dbFields = [
	'tx_id',
	'name',
	'pk',
	'address'
];

/**
 * Creates Object based on transaction data.
 * @param {transaction} transaction - Contains delegate username.
 * @returns {Object} {table:delegates, username and transaction id}.
 */
Delegate.prototype.dbSave = function (transaction) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			tx_id: transaction.id,
			name: transaction.asset.delegate.username,
			pk: Buffer.from(transaction.senderPublicKey, 'hex'),
			address: transaction.senderId
		}
	};
};

/**
 * Evaluates transaction signatures and sender multisignatures.
 * @param {transaction} transaction - signatures.
 * @param {account} sender
 * @return {boolean} logic based on transaction signatures and sender multisignatures.
 */
Delegate.prototype.ready = function (transaction, sender) {
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
module.exports = Delegate;
