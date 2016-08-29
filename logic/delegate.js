'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

function Delegate () {
	this.bind = function (scope) {
		modules = scope.modules;
		library = scope.library;
	};

	this.create = function (data, trs) {
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

	this.calculateFee = function (trs, sender) {
		return constants.fees.delegate;
	};

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId) {
			return setImmediate(cb, 'Invalid recipient');
		}

		if (trs.amount !== 0) {
			return setImmediate(cb, 'Invalid transaction amount');
		}

		if (sender.isDelegate) {
			return cb('Account is already a delegate');
		}

		if (!trs.asset || !trs.asset.delegate) {
			return cb('Invalid transaction asset');
		}

		if (!trs.asset.delegate.username) {
			return cb('Username is undefined');
		}

		if (trs.asset.delegate.username !== trs.asset.delegate.username.toLowerCase()) {
 			return cb('Username should be lowercase');
 		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		var allowSymbols = /^[a-z0-9!@$&_.]+$/g;

		var username = String(trs.asset.delegate.username).toLowerCase().trim();

		if (username === '') {
			return cb('Empty username');
		}

		if (username.length > 20) {
			return cb('Username is too long. Maximum is 20 characters');
		}

		if (isAddress.test(username)) {
			return cb('Username can not be a potential address');
		}

		if (!allowSymbols.test(username)) {
			return cb('Username can only contain alphanumeric characters with the exception of !@$&_.');
		}

		modules.accounts.getAccount({
			username: username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb('Username already exists');
			}

			return cb(null, trs);
		});
	};

	this.process = function (trs, sender, cb) {
		return setImmediate(cb, null, trs);
	};

	this.getBytes = function (trs) {
		if (!trs.asset.delegate.username) {
			return null;
		}

		var buf;

		try {
			buf = new Buffer(trs.asset.delegate.username, 'utf8');
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	};

	this.apply = function (trs, block, sender, cb) {
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

	this.undo = function (trs, block, sender, cb) {
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

	this.applyUnconfirmed = function (trs, sender, cb) {
		if (sender.u_isDelegate) {
			return cb('Account is already a delegate');
		}

		function done () {
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
		}

		modules.accounts.getAccount({
			u_username: trs.asset.delegate.username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb('Username already exists');
			}

			done();
		});
	};

	this.undoUnconfirmed = function (trs, sender, cb) {
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

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.delegate, {
			type: 'object',
			properties: {
				publicKey: {
					type: 'string',
					format: 'publicKey'
				}
			},
			required: ['publicKey']
		});

		if (!report) {
			throw Error('Failed to normalize delegate: ' + library.scheme.getLastError());
		}

		return trs;
	};

	this.dbRead = function (raw) {
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

	this.dbTable = 'delegates';

	this.dbFields = [
		'username',
		'transactionId'
	];

	this.dbSave = function (trs) {
		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				username: trs.asset.delegate.username,
				transactionId: trs.id
			}
		};
	};

	this.ready = function (trs, sender) {
		if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
			if (!Array.isArray(trs.signatures)) {
				return false;
			}
			return trs.signatures.length >= sender.multimin;
		} else {
			return true;
		}
	};
}

// Export
module.exports = Delegate;
