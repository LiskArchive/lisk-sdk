/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var _ = require('lodash');
var async = require('async');
var constants = require('../helpers/constants.js');
var exceptions = require('../helpers/exceptions.js');
var Diff = require('../helpers/diff.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules;
var library;
var self;

// Constructor
/**
 * Main vote logic.
 * Allows validate and undo transactions, verify votes.
 * Initializes library.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires async
 * @requires lodash
 * @requires helpers/constants
 * @requires helpers/diff
 * @requires helpers/exceptions
 * @requires helpers/slots
 * @param {Object} logger - Description of the param
 * @param {ZSchema} schema - Description of the param
 * @todo Add descriptions for the params
 */
function Vote(logger, schema) {
	self = this;
	library = {
		logger: logger,
		schema: schema,
	};
}

// Public methods
/**
 * Binds module content to private object modules.
 *
 * @param {Delegates} delegates - Description of the param
 * @todo Add descriptions for the params
 */
Vote.prototype.bind = function(delegates) {
	modules = {
		delegates: delegates,
	};
};

/**
 * Obtains constant fee vote.
 *
 * @see {@link module:helpers/constants}
 * @returns {number} fee
 */
Vote.prototype.calculateFee = function() {
	return constants.fees.vote;
};

/**
 * Validates transaction votes fields and for each vote calls verifyVote.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback|function} returns error if invalid field | calls checkConfirmedDelegates
 * @todo Add descriptions for the params
 */
Vote.prototype.verify = function(transaction, sender, cb, tx) {
	if (transaction.recipientId !== transaction.senderId) {
		return setImmediate(cb, 'Invalid recipient');
	}

	if (!transaction.asset || !transaction.asset.votes) {
		return setImmediate(cb, 'Invalid transaction asset');
	}

	if (!Array.isArray(transaction.asset.votes)) {
		return setImmediate(cb, 'Invalid votes. Must be an array');
	}

	if (!transaction.asset.votes.length) {
		return setImmediate(cb, 'Invalid votes. Must not be empty');
	}

	if (
		transaction.asset.votes &&
		transaction.asset.votes.length > constants.maxVotesPerTransaction
	) {
		return setImmediate(
			cb,
			[
				'Voting limit exceeded. Maximum is',
				constants.maxVotesPerTransaction,
				'votes per transaction',
			].join(' ')
		);
	}

	async.eachSeries(
		transaction.asset.votes,
		(vote, eachSeriesCb) => {
			self.verifyVote(
				vote,
				err => {
					if (err) {
						return setImmediate(
							eachSeriesCb,
							[
								'Invalid vote at index',
								transaction.asset.votes.indexOf(vote),
								'-',
								err,
							].join(' ')
						);
					} else {
						return setImmediate(eachSeriesCb);
					}
				},
				tx
			);
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			} else {
				if (
					transaction.asset.votes.length >
					_.uniqBy(transaction.asset.votes, v => v.slice(1)).length
				) {
					return setImmediate(
						cb,
						'Multiple votes for same delegate are not allowed'
					);
				}

				return self.checkConfirmedDelegates(transaction, cb, tx);
			}
		}
	);
};

/**
 * Checks type, format and lenght from vote.
 *
 * @param {Object} vote - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} error message | cb
 * @todo Add descriptions for the params
 */
Vote.prototype.verifyVote = function(vote, cb) {
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

/**
 * Calls checkConfirmedDelegates() with senderPublicKeykey and asset votes.
 *
 * @param {transaction} transaction - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err(if transaction id is not in exceptions votes list)
 * @todo Add descriptions for the params
 */
Vote.prototype.checkConfirmedDelegates = function(transaction, cb, tx) {
	modules.delegates.checkConfirmedDelegates(
		transaction.senderPublicKey,
		transaction.asset.votes,
		err => {
			if (err && exceptions.votes.indexOf(transaction.id) > -1) {
				library.logger.debug(err);
				library.logger.debug(JSON.stringify(transaction));
				err = null;
			}

			return setImmediate(cb, err);
		},
		tx
	);
};

/**
 * Calls checkUnconfirmedDelegates() with senderPublicKeykey and asset votes.
 *
 * @param {Object} transaction - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb, err(if transaction id is not in exceptions votes list)
 * @todo Add descriptions for the params
 */
Vote.prototype.checkUnconfirmedDelegates = function(transaction, cb, tx) {
	modules.delegates.checkUnconfirmedDelegates(
		transaction.senderPublicKey,
		transaction.asset.votes,
		err => {
			if (err && exceptions.votes.indexOf(transaction.id) > -1) {
				library.logger.debug(err);
				library.logger.debug(JSON.stringify(transaction));
				err = null;
			}

			return setImmediate(cb, err);
		},
		tx
	);
};

/**
 * Description of the function.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Description of the param
 * @returns {setImmediateCallback} cb, null, transaction
 * @todo Add descriptions for the params
 */
Vote.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.votes information.
 *
 * @param {transaction} transaction - Description of the param
 * @throws {e} error
 * @returns {Array} Buffer
 * @todo Add descriptions for the params
 */
Vote.prototype.getBytes = function(transaction) {
	var buf;

	try {
		buf = transaction.asset.votes
			? Buffer.from(transaction.asset.votes.join(''), 'utf8')
			: null;
	} catch (e) {
		throw e;
	}

	return buf;
};

/**
 * Calls checkConfirmedDelegates based on transaction data and
 * merges account to sender address with votes as delegates.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @todo delete unnecessary var parent = this
 * @todo Add descriptions for the params
 */
Vote.prototype.apply = function(transaction, block, sender, cb, tx) {
	var parent = this;

	async.series(
		[
			function(seriesCb) {
				self.checkConfirmedDelegates(transaction, seriesCb, tx);
			},
			function() {
				parent.scope.account.merge(
					sender.address,
					{
						delegates: transaction.asset.votes,
						blockId: block.id,
						round: slots.calcRound(block.height),
					},
					err => setImmediate(cb, err),
					tx
				);
			},
		],
		cb
	);
};

/**
 * Calls Diff.reverse to change asset.votes signs and merges account to
 * sender address with inverted votes as delegates.
 *
 * @param {transaction} transaction - Description of the param
 * @param {block} block - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add descriptions for the params
 */
Vote.prototype.undo = function(transaction, block, sender, cb) {
	if (transaction.asset.votes === null) {
		return setImmediate(cb);
	}

	var votesInvert = Diff.reverse(transaction.asset.votes);

	this.scope.account.merge(
		sender.address,
		{
			delegates: votesInvert,
			blockId: block.id,
			round: slots.calcRound(block.height),
		},
		err => setImmediate(cb, err)
	);
};

/**
 * Calls checkUnconfirmedDelegates based on transaction data and
 * merges account to sender address with votes as unconfirmed delegates.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @todo delete unnecessary var parent = this
 * @todo Add descriptions for the params
 */
Vote.prototype.applyUnconfirmed = function(transaction, sender, cb, tx) {
	var parent = this;

	async.series(
		[
			function(seriesCb) {
				self.checkUnconfirmedDelegates(transaction, seriesCb, tx);
			},
			function(seriesCb) {
				parent.scope.account.merge(
					sender.address,
					{
						u_delegates: transaction.asset.votes,
					},
					err => setImmediate(seriesCb, err),
					tx
				);
			},
		],
		cb
	);
};

/**
 * Calls Diff.reverse to change asset.votes signs and merges account to
 * sender address with inverted votes as unconfirmed delegates.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add descriptions for the params
 */
Vote.prototype.undoUnconfirmed = function(transaction, sender, cb, tx) {
	if (transaction.asset.votes === null) {
		return setImmediate(cb);
	}

	var votesInvert = Diff.reverse(transaction.asset.votes);

	this.scope.account.merge(
		sender.address,
		{ u_delegates: votesInvert },
		err => setImmediate(cb, err),
		tx
	);
};

/**
 * @typedef {Object} votes
 * @property {String[]} votes - Unique items, max constant activeDelegates
 * @property {string} transactionId
 */
Vote.prototype.schema = {
	id: 'Vote',
	type: 'object',
	properties: {
		votes: {
			type: 'array',
			minItems: 1,
			maxItems: constants.maxVotesPerTransaction,
			uniqueItems: true,
		},
	},
	required: ['votes'],
};

/**
 * Validates asset schema.
 *
 * @param {transaction} transaction - Description of the param
 * @throws {string} Failed to validate vote schema
 * @returns {transaction}
 * @todo should pass transaction.asset.vote to validate?
 * @todo Add descriptions for the params
 */
Vote.prototype.objectNormalize = function(transaction) {
	var report = library.schema.validate(
		transaction.asset,
		Vote.prototype.schema
	);

	if (!report) {
		throw `Failed to validate vote schema: ${library.schema
			.getLastErrors()
			.map(err => err.message)
			.join(', ')}`;
	}

	return transaction;
};

/**
 * Creates votes object based on raw data.
 *
 * @param {Object} raw - Description of the param
 * @returns {null|votes} votes object
 * @todo Add descriptions for the params
 */
Vote.prototype.dbRead = function(raw) {
	if (!raw.v_votes) {
		return null;
	} else {
		var votes = raw.v_votes.split(',');

		return { votes: votes };
	}
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction - Description of the param
 * @param {account} sender - Description of the param
 * @returns {boolean} True if transaction signatures greather than sender multimin, or there are no sender multisignatures.
 * @todo Add descriptions for the params
 */
Vote.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};

// Export
module.exports = Vote;
