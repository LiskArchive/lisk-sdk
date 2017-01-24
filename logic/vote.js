'use strict';

var async = require('async');
var constants = require('../helpers/constants.js');
var exceptions = require('../helpers/exceptions.js');
var Diff = require('../helpers/diff.js');

// Private fields
var modules, library, self;

// Constructor
function Vote () {
	self = this;
}

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

	async.eachSeries(trs.asset.votes, function (vote, eachSeriesCb) {
		self.verifyVote(vote, function (err) {
			if (err) {
				return setImmediate(eachSeriesCb, ['Invalid vote at index', trs.asset.votes.indexOf(vote), '-', err].join(' '));
			} else {
				return setImmediate(eachSeriesCb);
			}
		});
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			return self.checkConfirmedDelegates(trs, cb);
		}
	});
};

Vote.prototype.verifyVote = function (vote, cb) {
	if (typeof vote !== 'string') {
		return setImmediate(cb, 'Invalid vote type');
	}

	if (!/[-+]{1}[0-9a-z]{64}/.test(vote)) {
		return setImmediate(cb, 'Invalid vote format');
	}

	if (vote.length !== 65) {
		return setImmediate(cb, 'Invalid vote length');
	}

	return setImmediate(cb);
};

Vote.prototype.checkConfirmedDelegates = function (trs, cb) {
	modules.delegates.checkConfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}

		return setImmediate(cb, err);
	});
};

Vote.prototype.checkUnconfirmedDelegates = function (trs, cb) {
	modules.delegates.checkUnconfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}

		return setImmediate(cb, err);
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
	var parent = this;

	async.series([
		function (seriesCb) {
			self.checkConfirmedDelegates(trs, seriesCb);
		},
		function (seriesCb) {
			parent.scope.account.merge(sender.address, {
				delegates: trs.asset.votes,
				blockId: block.id,
				round: modules.rounds.calc(block.height)
			}, function (err) {
				return setImmediate(cb, err);
			});
		}
	], cb);
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
	var parent = this;

	async.series([
		function (seriesCb) {
			self.checkUnconfirmedDelegates(trs, seriesCb);
		},
		function (seriesCb) {
			parent.scope.account.merge(sender.address, {
				u_delegates: trs.asset.votes
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		}
	], cb);
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
	var report = library.schema.validate(trs.asset, Vote.prototype.schema);

	if (!report) {
		throw 'Failed to validate vote schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
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
