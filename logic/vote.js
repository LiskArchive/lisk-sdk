'use strict';

var constants = require('../helpers/constants.js');
var Diff = require('../helpers/diff.js');

// Private fields
var modules, library;

function Vote () {
	this.bind = function (scope) {
		modules = scope.modules;
		library = scope.library;
	};

	this.create = function (data, trs) {
		trs.recipientId = data.sender.address;
		trs.asset.votes = data.votes;

		return trs;
	};

	this.calculateFee = function (trs, sender) {
		return constants.fees.vote;
	};

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId !== trs.senderId) {
			return setImmediate(cb, 'Recipient is not identical to sender');
		}

		if (!trs.asset.votes || !trs.asset.votes.length) {
			return setImmediate(cb, 'No votes sent');
		}

		if (trs.asset.votes && trs.asset.votes.length > 33) {
			return setImmediate(cb, 'Voting limit exceeded. Maximum is 33 votes per transaction');
		}

		modules.delegates.checkDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
			if (err && constants.voteExceptions.indexOf(trs.id) > -1) {
				library.logger.debug(err);
				library.logger.debug(JSON.stringify(trs));
				err = null;
			}
			return setImmediate(cb, err, trs);
		});
	};

	this.process = function (trs, sender, cb) {
		return setImmediate(cb, null, trs);
	};

	this.getBytes = function (trs) {
		var buf;

		try {
			buf = trs.asset.votes ? new Buffer(trs.asset.votes.join(''), 'utf8') : null;
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	};

	this.apply = function (trs, block, sender, cb) {
		this.scope.account.merge(sender.address, {
			delegates: trs.asset.votes,
			blockId: block.id,
			round: modules.round.calc(block.height)
		}, function (err) {
			return cb(err);
		});
	};

	this.undo = function (trs, block, sender, cb) {
		if (trs.asset.votes === null) { return cb(); }

		var votesInvert = Diff.reverse(trs.asset.votes);

		this.scope.account.merge(sender.address, {
			delegates: votesInvert,
			blockId: block.id,
			round: modules.round.calc(block.height)
		}, function (err) {
			return cb(err);
		});
	};

	this.applyUnconfirmed = function (trs, sender, cb) {
		modules.delegates.checkUnconfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
			if (err) {
				if (constants.voteExceptions.indexOf(trs.id) > -1) {
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
				return cb(err);
			});
		}.bind(this));
	};

	this.undoUnconfirmed = function (trs, sender, cb) {
		if (trs.asset.votes === null) { return cb(); }

		var votesInvert = Diff.reverse(trs.asset.votes);

		this.scope.account.merge(sender.address, {u_delegates: votesInvert}, function (err) {
			return cb(err);
		});
	};

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset, {
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
		});

		if (!report) {
			throw new Error('Failed to normalize vote: ' + library.scheme.getLastError());
		}

		return trs;
	};

	this.dbRead = function (raw) {
		// console.log(raw.v_votes);

		if (!raw.v_votes) {
			return null;
		} else {
			var votes = raw.v_votes.split(',');

			return {votes: votes};
		}
	};

	this.dbTable = 'votes';

	this.dbFields = [
		'votes',
		'transactionId'
	];

	this.dbSave = function (trs) {
		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				votes: Array.isArray(trs.asset.votes) ? trs.asset.votes.join(',') : null,
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
module.exports = Vote;
