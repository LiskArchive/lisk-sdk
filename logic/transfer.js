'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

// Constructor
function Transfer () {}

// Public methods
Transfer.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

Transfer.prototype.create = function (data, trs) {
	trs.recipientId = data.recipientId;
	trs.amount = data.amount;

	return trs;
};

Transfer.prototype.calculateFee = function (trs, sender) {
	return constants.fees.send;
};

Transfer.prototype.verify = function (trs, sender, cb) {
	if (!trs.recipientId) {
		return setImmediate(cb, 'Missing recipient');
	}

	if (trs.amount <= 0) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	return setImmediate(cb, null, trs);
};

Transfer.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

Transfer.prototype.getBytes = function (trs) {
	return null;
};

Transfer.prototype.apply = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}

		modules.accounts.mergeAccountAndGet({
			address: trs.recipientId,
			balance: trs.amount,
			u_balance: trs.amount,
			blockId: block.id,
			round: modules.rounds.calc(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

Transfer.prototype.undo = function (trs, block, sender, cb) {
	modules.accounts.setAccountAndGet({address: trs.recipientId}, function (err, recipient) {
		if (err) {
			return setImmediate(cb, err);
		}

		modules.accounts.mergeAccountAndGet({
			address: trs.recipientId,
			balance: -trs.amount,
			u_balance: -trs.amount,
			blockId: block.id,
			round: modules.rounds.calc(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

Transfer.prototype.applyUnconfirmed = function (trs, sender, cb) {
	return setImmediate(cb);
};

Transfer.prototype.undoUnconfirmed = function (trs, sender, cb) {
	return setImmediate(cb);
};

Transfer.prototype.objectNormalize = function (trs) {
	delete trs.blockId;
	return trs;
};

Transfer.prototype.dbRead = function (raw) {
	return null;
};

Transfer.prototype.dbSave = function (trs) {
	return null;
};

Transfer.prototype.ready = function (trs, sender) {
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
module.exports = Transfer;
