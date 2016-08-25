'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

function Transfer () {
	this.bind = function (scope) {
		modules = scope.modules;
		library = scope.library;
	};

	this.create = function (data, trs) {
		trs.recipientId = data.recipientId;
		trs.amount = data.amount;

		return trs;
	};

	this.calculateFee = function (trs, sender) {
		return constants.fees.send;
	};

	this.verify = function (trs, sender, cb) {
		var isAddress = /^[0-9]{1,21}[L|l]$/g;
		if (!trs.recipientId || !isAddress.test(trs.recipientId)) {
			return cb('Invalid recipient');
		}

		if (trs.amount <= 0) {
			return cb('Invalid transaction amount');
		}

		return cb(null, trs);
	};

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	};

	this.getBytes = function (trs) {
		return null;
	};

	this.apply = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
			if (err) {
				return cb(err);
			}

			modules.accounts.mergeAccountAndGet({
				address: trs.recipientId,
				balance: trs.amount,
				u_balance: trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				return cb(err);
			});
		});
	};

	this.undo = function (trs, block, sender, cb) {
		modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
			if (err) {
				return cb(err);
			}

			modules.accounts.mergeAccountAndGet({
				address: trs.recipientId,
				balance: -trs.amount,
				u_balance: -trs.amount,
				blockId: block.id,
				round: modules.round.calc(block.height)
			}, function (err) {
				return cb(err);
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
		delete trs.blockId;
		return trs;
	};

	this.dbRead = function (raw) {
		return null;
	};

	this.dbSave = function (trs) {
		return null;
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
module.exports = Transfer;
