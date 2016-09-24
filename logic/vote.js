'use strict';

var constants = require('../helpers/constants.js');
var exceptions = require('../helpers/exceptions.js');
var Diff = require('../helpers/diff.js');

// Private fields
var modules, library;

// Constructor
function Vote () {}

// Public methods
Vote.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

Vote.prototype.create = function (data, trs) {
	trs.recipientId = data.sender.address;
	trs.asset.votes = data.votes;

	return trs;
};

Vote.prototype.calculateFee = function (trs, sender) {
	return constants.fees.vote;
};

Vote.prototype.verify = function (trs, sender, cb) {
	if (trs.recipientId !== trs.senderId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!trs.asset || !trs.asset.votes) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!Array.isArray(trs.asset.votes)) {
		return setImmediate(cb, 'Invalid votes. Must be an array');
	}

	if (!trs.asset.votes.length) {
		return setImmediate(cb, 'Invalid votes. Must not be empty');
	}

	if (trs.asset.votes && trs.asset.votes.length > 33) {
		return setImmediate(cb, 'Voting limit exceeded. Maximum is 33 votes per transaction');
	}

	modules.delegates.checkDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}
		return setImmediate(cb, err, trs);
	});
};

Vote.prototype.process = function (trs, sender, cb) {
	return setImmediate(cb, null, trs);
};

Vote.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = trs.asset.votes ? new Buffer(trs.asset.votes.join(''), 'utf8') : null;
	} catch (e) {
		throw e;
	}

	return buf;
};

Vote.prototype.apply = function (trs, block, sender, cb) {
	this.scope.account.merge(sender.address, {
		delegates: trs.asset.votes,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (err) {
		return setImmediate(cb, err);
	});
};

Vote.prototype.undo = function (trs, block, sender, cb) {
	if (trs.asset.votes === null) { return setImmediate(cb); }

	var votesInvert = Diff.reverse(trs.asset.votes);

	this.scope.account.merge(sender.address, {
		delegates: votesInvert,
		blockId: block.id,
		round: modules.rounds.calc(block.height)
	}, function (err) {
		return setImmediate(cb, err);
	});
};

Vote.prototype.applyUnconfirmed = function (trs, sender, cb) {
	modules.delegates.checkUnconfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err) {
			if (exceptions.votes.indexOf(trs.id) > -1) {
				library.logger.debug(err);
				library.logger.debug(JSON.stringify(trs));
				err = null;
			} else {
				return setImmediate(cb, err);
			}
		}

		this.scope.account.merge(sender.address, {
			u_delegates: trs.asset.votes
		}, function (err) {
			return setImmediate(cb, err);
		});
	}.bind(this));
};

Vote.prototype.undoUnconfirmed = function (trs, sender, cb) {
	if (trs.asset.votes === null) { return setImmediate(cb); }

	var votesInvert = Diff.reverse(trs.asset.votes);

	this.scope.account.merge(sender.address, {u_delegates: votesInvert}, function (err) {
		return setImmediate(cb, err);
	});
};

Vote.prototype.schema = {
	id: 'Vote',
	type: 'object',
	properties: {
		votes: {
			type: 'array',
			minLength: 1,
			maxLength: constants.activeDelegates,
			uniqueItems: true
		}
	},
	required: ['votes']
};

Vote.prototype.objectNormalize = function (trs) {
	var report = library.scheme.validate(trs.asset, Vote.prototype.schema);

	if (!report) {
		throw 'Failed to normalize vote: ' + library.scheme.getLastError();
	}

	return trs;
};

Vote.prototype.dbRead = function (raw) {
	// console.log(raw.v_votes);

	if (!raw.v_votes) {
		return null;
	} else {
		var votes = raw.v_votes.split(',');

		return {votes: votes};
	}
};

Vote.prototype.dbTable = 'votes';

Vote.prototype.dbFields = [
	'votes',
	'transactionId'
];

Vote.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			votes: Array.isArray(trs.asset.votes) ? trs.asset.votes.join(',') : null,
			transactionId: trs.id
		}
	};
};

Vote.prototype.ready = function (trs, sender) {
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
module.exports = Vote;
