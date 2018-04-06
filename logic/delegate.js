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
 * Creates a delegate.
 * @param {Object} data - Entry information: username, publicKey.
 * @param {transaction} trs - Transaction to assign the delegate.
 * @returns {Object} trs with new data
 */
Delegate.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = 0;
	trs.asset.delegate = {
		username: data.username,
		publicKey: data.sender.publicKey
	};

	if (trs.asset.delegate.username) {
		trs.asset.delegate.username = trs.asset.delegate.username.toLowerCase().trim();
	}

	return trs;
};

/**
 * Obtains constant fee delegate.
 * @see {@link module:helpers/constants}
 * @returns {number} constants.fees.delegate
 * @todo delete unnecessary function parameters trs, sender.
 */
Delegate.prototype.calculateFee = function (trs, sender) {
	return constants.fees.delegate;
};

/**
 * Verifies fields from transaction and sender, calls modules.accounts.getAccount().
 * @implements module:accounts#Account~getAccount
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback|Object} returns error if invalid parameter | 
 * trs validated.
 */
Delegate.prototype.verify = function (trs, sender, cb) {
	if (trs.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (trs.amount !== 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (sender.isDelegate) {
		return setImmediate(cb, 'Account is already a delegate');
	}

	if (!trs.asset || !trs.asset.delegate) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!trs.asset.delegate.username) {
		return setImmediate(cb, 'Username is undefined');
	}

	if (trs.asset.delegate.username !== trs.asset.delegate.username.toLowerCase()) {
		return setImmediate(cb, 'Username must be lowercase');
	}

	var isAddress = /^[0-9]{1,21}[L|l]$/g;
	var allowSymbols = /^[a-z0-9!@$&_.]+$/g;

	var username = String(trs.asset.delegate.username).toLowerCase().trim();

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

	self.checkConfirmed(trs, function (err) {
		return setImmediate(cb, err, trs);
	});
};

/**
 * Returns transaction with setImmediate.
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Null error
 * @todo delete extra parameter sender.
 */
Delegate.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

/**
 * Validates delegate username and returns buffer.
 * @param {transaction} trs
 * @returns {null|string} Returns null if no delegate| buffer.
 * @throws {error} If buffer fails.
 */
Delegate.prototype.getBytes = function (trs) {
	if (!trs.asset.delegate.username) {
		return null;
	}

	var buf;

	try {
		buf = Buffer.from(trs.asset.delegate.username, 'utf8');
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Calls cb with error when account already exists
 * @param {transaction} trs
 * @param {string} username - username key to search for (username / u_username)
 * @param {string} isDelegate - isDelegate key to search for (isDelegate / u_isDelegate)
 * @param {function} cb
 */
Delegate.prototype.checkDuplicates = function (trs, username, isDelegate, cb) {
	async.parallel({
		duplicatedDelegate: function (eachCb) {
			var query = {};
			query[isDelegate] = 1;
			query.publicKey = trs.senderPublicKey;
			return modules.accounts.getAccount(query, [username], eachCb);
		},
		duplicatedUsername: function (eachCb) {
			var query = {};
			query[username] = trs.asset.delegate.username;
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
			return setImmediate(cb, 'Username ' + trs.asset.delegate.username + ' already exists');
		}
		return setImmediate(cb);
	});
};

/**
 * Checks if confirmed delegate is already registered
 * @param {transaction} trs
 * @param {function} cb
 */
Delegate.prototype.checkConfirmed = function (trs, cb) {
	self.checkDuplicates(trs, 'username', 'isDelegate', function (err) {
		if (err && exceptions.delegates.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}
		return setImmediate(cb, err, trs);
	});
};

/**
 * Checks if unconfirmed delegate is already registered
 * @param {transaction} trs
 * @param {function} cb
 */
Delegate.prototype.checkUnconfirmed = function (trs, cb) {
	self.checkDuplicates(trs, 'u_username', 'u_isDelegate', function (err) {
		if (err && exceptions.delegates.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}
		return setImmediate(cb, err, trs);
	});
};

/**
 * Checks trs delegate and calls modules.accounts.setAccountAndGet() with username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @todo delete extra parameter block.
 */
Delegate.prototype.apply = function (trs, block, sender, cb) {
	var data = {
		publicKey: trs.senderPublicKey,
		address: sender.address,
		isDelegate: 1,
		vote: 0,
		username: trs.asset.delegate.username
	};

	async.series([
		function (seriesCb) {
			self.checkConfirmed(trs, seriesCb);
		},
		function (seriesCb) {
			modules.accounts.setAccountAndGet(data, seriesCb);
		}
	], cb);
};

/**
 * Checks trs delegate and no nameexist and calls modules.accounts.setAccountAndGet() with u_username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @todo delete extra parameter block.
 */
Delegate.prototype.undo = function (trs, block, sender, cb) {
	var data = {
		address: sender.address,
		isDelegate: 0,
		vote: 0,
		username: null
	};


	modules.accounts.setAccountAndGet(data, cb);
};

/**
 * Checks trs delegate and calls modules.accounts.setAccountAndGet() with u_username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 */
Delegate.prototype.applyUnconfirmed = function (trs, sender, cb) {
	var data = {
		publicKey: trs.senderPublicKey,
		address: sender.address,
		u_isDelegate: 1,
		u_username: trs.asset.delegate.username
	};

	async.series([
		function (seriesCb) {
			self.checkUnconfirmed(trs, seriesCb);
		},
		function (seriesCb) {
			modules.accounts.setAccountAndGet(data, seriesCb);
		}
	], cb);
};

/**
 * Checks trs delegate and calls modules.accounts.setAccountAndGet() with 
 * username and u_username both null.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 */
Delegate.prototype.undoUnconfirmed = function (trs, sender, cb) {
	var data = {
		address: sender.address,
		u_isDelegate: 0,
		isDelegate: 0,
		u_username: null
	};

	modules.accounts.setAccountAndGet(data, cb);
};

Delegate.prototype.schema = {
	id: 'Delegate',
	type: 'object',
	properties: {
		publicKey: {
			type: 'string',
			format: 'publicKey'
		}
	},
	required: ['publicKey']
};

/**
 * Validates transaction delegate schema.
 * @param {transaction} trs
 * @returns {err|trs} Error message if fails validation | input parameter.
 * @throws {string} Failed to validate delegate schema.
 */
Delegate.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.delegate, Delegate.prototype.schema);

	if (!report) {
		throw 'Failed to validate delegate schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
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
	'username',
	'transactionId'
];

/**
 * Creates Object based on trs data.
 * @param {transaction} trs - Contains delegate username.
 * @returns {Object} {table:delegates, username and transaction id}.
 */
Delegate.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			username: trs.asset.delegate.username,
			transactionId: trs.id
		}
	};
};

/**
 * Evaluates transaction signatures and sender multisignatures.
 * @param {transaction} trs - signatures.
 * @param {account} sender
 * @return {Boolean} logic based on trs signatures and sender multisignatures.
 */
Delegate.prototype.ready = function (trs, sender) {
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
module.exports = Delegate;
