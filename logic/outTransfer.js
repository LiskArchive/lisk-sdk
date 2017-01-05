'use strict';

var constants = require('../helpers/constants.js');
var sql = require('../sql/dapps.js');

// Private fields
var modules, library, __private = {};

__private.unconfirmedOutTansfers = {};

// Constructor
function OutTransfer () {}

// Public methods
OutTransfer.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

OutTransfer.prototype.create = function (data, trs) {
	trs.recipientId = data.recipientId;
	trs.amount = data.amount;

	trs.asset.outTransfer = {
		dappId: data.dappId,
		transactionId: data.transactionId
	};

	return trs;
};

OutTransfer.prototype.calculateFee = function (trs, sender) {
	return constants.fees.send;
};

OutTransfer.prototype.verify = function (trs, sender, cb) {
	if (!trs.recipientId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!trs.amount) {
		return setImmediate(cb, 'Invalid transaction amount');
	}

	if (!trs.asset || !trs.asset.outTransfer) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!/^[0-9]+$/.test(trs.asset.outTransfer.dappId)) {
		return setImmediate(cb, 'Invalid outTransfer dappId');
	}

	if (!/^[0-9]+$/.test(trs.asset.outTransfer.transactionId)) {
		return setImmediate(cb, 'Invalid outTransfer transactionId');
	}

	return setImmediate(cb, null, trs);
};

OutTransfer.prototype.process = function (trs, sender, cb) {
	library.db.one(sql.countByTransactionId, {
		id: trs.asset.outTransfer.dappId
	}).then(function (row) {
		if (row.count === 0) {
			return setImmediate(cb, 'Application not found: ' + trs.asset.outTransfer.dappId);
		}

		if (__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId]) {
			return setImmediate(cb, 'Transaction is already processed: ' + trs.asset.outTransfer.transactionId);
		}

		library.db.one(sql.countByOutTransactionId, {
			transactionId: trs.asset.outTransfer.transactionId
		}).then(function (row) {
			if (row.count > 0) {
				return setImmediate(cb, 'Transaction is already confirmed: ' + trs.asset.outTransfer.transactionId);
			} else {
				return setImmediate(cb, null, trs);
			}
		}).catch(function (err) {
			return setImmediate(cb, err);
		});
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

OutTransfer.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = new Buffer([]);
		var dappIdBuf = new Buffer(trs.asset.outTransfer.dappId, 'utf8');
		var transactionIdBuff = new Buffer(trs.asset.outTransfer.transactionId, 'utf8');
		buf = Buffer.concat([buf, dappIdBuf, transactionIdBuff]);
	} catch (e) {
		throw e;
	}

	return buf;
};

OutTransfer.prototype.apply = function (trs, block, sender, cb) {
	__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = false;

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

OutTransfer.prototype.undo = function (trs, block, sender, cb) {
	__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = true;

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

OutTransfer.prototype.applyUnconfirmed = function (trs, sender, cb) {
	__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = true;
	return setImmediate(cb);
};

OutTransfer.prototype.undoUnconfirmed = function (trs, sender, cb) {
	__private.unconfirmedOutTansfers[trs.asset.outTransfer.transactionId] = false;
	return setImmediate(cb);
};

OutTransfer.prototype.schema = {
	id: 'OutTransfer',
	object: true,
	properties: {
		dappId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		},
		transactionId: {
			type: 'string',
			format: 'id',
			minLength: 1,
			maxLength: 20
		}
	},
	required: ['dappId', 'transactionId']
};

OutTransfer.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.outTransfer, OutTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate outTransfer schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

OutTransfer.prototype.dbRead = function (raw) {
	if (!raw.ot_dappId) {
		return null;
	} else {
		var outTransfer = {
			dappId: raw.ot_dappId,
			transactionId: raw.ot_outTransactionId
		};

		return {outTransfer: outTransfer};
	}
};

OutTransfer.prototype.dbTable = 'outtransfer';

OutTransfer.prototype.dbFields = [
	'dappId',
	'outTransactionId',
	'transactionId'
];

OutTransfer.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			dappId: trs.asset.outTransfer.dappId,
			outTransactionId: trs.asset.outTransfer.transactionId,
			transactionId: trs.id
		}
	};
};

OutTransfer.prototype.afterSave = function (trs, cb) {
	modules.dapps.message(trs.asset.outTransfer.dappId, {
		topic: 'withdrawal',
		message: {
			transactionId: trs.id
		}
	}, function (err) {
		if (err) {
			library.logger.debug(err);
		}
		return setImmediate(cb);
	});
};

OutTransfer.prototype.ready = function (trs, sender) {
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
module.exports = OutTransfer;
