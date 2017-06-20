'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

/**
 * Initializes library.
 * @memberof module:delegates
 * @class
 * @classdesc Main delegate logic.
 * @param {ZSchema} schema
 */
function Delegate (schema) {
	library = {
		schema: schema,
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

	modules.accounts.getAccount({
		username: username
	}, function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (account) {
			return setImmediate(cb, 'Username already exists');
		}

		return setImmediate(cb, null, trs);
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
 * Checks trs delegate and calls modules.accounts.setAccountAndGet() with username.
 * @implements module:accounts#Accounts~setAccountAndGet
 * @param {transaction} trs
 * @param {account} sender
 * @param {function} cb - Callback function.
 * @todo delete extra parameter block.
 */
Delegate.prototype.apply = function (trs, block, sender, cb) {
	var data = {
		address: sender.address,
		u_isDelegate: 0,
		isDelegate: 1,
		vote: 0
	};

	if (trs.asset.delegate.username) {
		data.u_username = null;
		data.username = trs.asset.delegate.username;
	}

	modules.accounts.setAccountAndGet(data, cb);
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
		u_isDelegate: 1,
		isDelegate: 0,
		vote: 0
	};

	if (!sender.nameexist && trs.asset.delegate.username) {
		data.username = null;
		data.u_username = trs.asset.delegate.username;
	}

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
		address: sender.address,
		u_isDelegate: 1,
		isDelegate: 0
	};

	if (trs.asset.delegate.username) {
		data.username = null;
		data.u_username = trs.asset.delegate.username;
	}

	modules.accounts.setAccountAndGet(data, cb);
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
		isDelegate: 0
	};

	if (trs.asset.delegate.username) {
		data.username = null;
		data.u_username = null;
	}

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
