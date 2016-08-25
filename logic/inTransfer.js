'use strict';

var constants = require('../helpers/constants.js');
var sql = require('../sql/dapps.js');

// Private fields
var modules, library, shared;

function InTransfer () {
	this.bind = function (scope) {
		modules = scope.modules;
		library = scope.library;
		shared = scope.shared;
	};

	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = data.amount;

		trs.asset.inTransfer = {
			dappId: data.dappId
		};

		return trs;
	};

	this.calculateFee = function (trs, sender) {
		return constants.fees.send;
	};

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId) {
			return setImmediate(cb, 'Invalid recipient');
		}

		if (!trs.amount) {
			return setImmediate(cb, 'Invalid transaction amount');
		}

		library.db.one(sql.countByTransactionId, {
			id: trs.asset.inTransfer.dappId
		}).then(function (row) {
			var count = row.count;

			if (count === 0) {
				return setImmediate(cb, 'Application not found: ' + trs.asset.inTransfer.dappId);
			} else {
				return setImmediate(cb);
			}
		}).catch(function () {
			return setImmediate(cb, 'Application not found: ' + trs.asset.inTransfer.dappId);
		});
	};

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	};

	this.getBytes = function (trs) {
		var buf;

		try {
			buf = new Buffer([]);
			var nameBuf = new Buffer(trs.asset.inTransfer.dappId, 'utf8');
			buf = Buffer.concat([buf, nameBuf]);
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	};

	this.apply = function (trs, block, sender, cb) {
		shared.getGenesis({dappid: trs.asset.inTransfer.dappId}, function (err, res) {
			if (err) {
				return cb(err);
			}
			modules.accounts.mergeAccountAndGet({
				address: res.authorId,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				cb(err);
			});
		});
	};

	this.undo = function (trs, block, sender, cb) {
		shared.getGenesis({dappid: trs.asset.inTransfer.dappId}, function (err, res) {
			if (err) {
				return cb(err);
			}
			modules.accounts.mergeAccountAndGet({
				address: res.authorId,
				balance: -trs.amount,
				u_balance: -trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				cb(err);
			});
		});
	};

	this.applyUnconfirmed = function (trs, sender, cb) {
		setImmediate(cb);
	};

	this.undoUnconfirmed = function (trs, sender, cb) {
		setImmediate(cb);
	};

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.inTransfer, {
			object: true,
			properties: {
				dappId: {
					type: 'string',
					minLength: 1
				},
			},
			required: ['dappId']
		});

		if (!report) {
			throw Error('Unable to verify dapp transaction, invalid parameters: ' + library.scheme.getLastError());
		}

		return trs;
	};

	this.dbRead = function (raw) {
		if (!raw.in_dappId) {
			return null;
		} else {
			var inTransfer = {
				dappId: raw.in_dappId
			};

			return {inTransfer: inTransfer};
		}
	};

	this.dbTable = 'intransfer';

	this.dbFields = [
		'dappId',
		'transactionId'
	];

	this.dbSave = function (trs) {
		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				dappId: trs.asset.inTransfer.dappId,
				transactionId: trs.id
			}
		};
	};

	this.afterSave = function (trs, cb) {
		return cb();
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
module.exports = InTransfer;
