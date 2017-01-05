'use strict';

var constants = require('../helpers/constants.js');
var sql = require('../sql/dapps.js');

// Private fields
var modules, library, shared;

// Constructor
function InTransfer () {}

// Public methods
InTransfer.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
	shared = scope.shared;
};

InTransfer.prototype.create = function (data, trs) {
	trs.recipientId = null;
	trs.amount = data.amount;

	trs.asset.inTransfer = {
		dappId: data.dappId
	};

	return trs;
};

InTransfer.prototype.calculateFee = function (trs, sender) {
	return constants.fees.send;
};

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

InTransfer.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

InTransfer.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = new Buffer([]);
		var nameBuf = new Buffer(trs.asset.inTransfer.dappId, 'utf8');
		buf = Buffer.concat([buf, nameBuf]);
	} catch (e) {
		throw e;
	}

	return buf;
};

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
			round: modules.rounds.calc(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

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
			round: modules.rounds.calc(block.height)
		}, function (err) {
			return setImmediate(cb, err);
		});
	});
};

InTransfer.prototype.applyUnconfirmed = function (trs, sender, cb) {
	return setImmediate(cb);
};

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

InTransfer.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset.inTransfer, InTransfer.prototype.schema);

	if (!report) {
		throw 'Failed to validate inTransfer schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

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

InTransfer.prototype.afterSave = function (trs, cb) {
	return setImmediate(cb);
};

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
