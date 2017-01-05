'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

// Constructor
function Delegate () {}

// Public methods
Delegate.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

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

Delegate.prototype.calculateFee = function (trs, sender) {
	return constants.fees.delegate;
};

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

Delegate.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

Delegate.prototype.getBytes = function (trs) {
	if (!trs.asset.delegate.username) {
		return null;
	}

	var buf;

	try {
		buf = new Buffer(trs.asset.delegate.username, 'utf8');
	} catch (e) {
		throw e;
	}

	return buf;
};

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

Delegate.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.delegate, Delegate.prototype.schema);

	if (!report) {
		throw 'Failed to validate delegate schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

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
