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

const _ = require('lodash');
const async = require('async');
const Diff = require('../helpers/diff.js');
const slots = require('../helpers/slots.js');
const Bignum = require('../helpers/bignum.js');

const exceptions = global.exceptions;
const { FEES, MAX_VOTES_PER_TRANSACTION } = global.constants;

let modules;
let library;
let self;

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
 * @requires helpers/diff
 * @requires helpers/slots
 * @param {Object} logger
 * @param {ZSchema} schema
 * @todo Add description for the params
 */
class Vote {
	constructor(logger, schema, account) {
		self = this;
		library = {
			logger,
			schema,
			account,
		};
	}

	/**
	 * Calls Diff.reverse to change asset.votes signs and merges account to
	 * sender address with inverted votes as delegates.
	 *
	 * @param {transaction} transaction
	 * @param {block} block
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	/* eslint-disable class-methods-use-this */
	undoConfirmed(transaction, block, sender, cb, tx) {
		if (transaction.asset.votes === null) {
			return setImmediate(cb);
		}

		const votesInvert = Diff.reverse(transaction.asset.votes);

		library.account.merge(
			sender.address,
			{
				delegates: votesInvert,
				round: slots.calcRound(block.height),
			},
			mergeErr => setImmediate(cb, mergeErr),
			tx
		);
	}

	/**
	 * Calls Diff.reverse to change asset.votes signs and merges account to
	 * sender address with inverted votes as unconfirmed delegates.
	 *
	 * @param {transaction} transaction
	 * @param {account} sender
	 * @param {function} cb - Callback function
	 * @returns {SetImmediate} error
	 * @todo Add description for the params
	 */
	/* eslint-disable class-methods-use-this */
	undoUnconfirmed(transaction, sender, cb, tx) {
		if (transaction.asset.votes === null) {
			return setImmediate(cb);
		}

		const votesInvert = Diff.reverse(transaction.asset.votes);

		library.account.merge(
			sender.address,
			{ u_delegates: votesInvert },
			mergeErr => setImmediate(cb, mergeErr),
			tx
		);
	}
}

// TODO: The below functions should be converted into static functions,
// however, this will lead to incompatibility with modules and tests implementation.
/**
 * Binds module content to private object modules.
 *
 * @param {Delegates} delegates
 * @todo Add description for the params
 */
Vote.prototype.bind = function(delegates) {
	modules = {
		delegates,
	};
};

/**
 * Obtains constant fee vote.
 *
 * @returns {Bignumber} Transaction fee
 */
Vote.prototype.calculateFee = function() {
	return new Bignum(FEES.VOTE);
};

/**
 * Validates transaction votes fields and for each vote calls verifyVote.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @returns {SetImmediate|checkConfirmedDelegates}
 * @todo Add description for the params
 */
Vote.prototype.verify = function(transaction, sender, cb, tx) {
	async.waterfall(
		[
			waterCb => {
				const amount = new Bignum(transaction.amount);
				if (amount.isGreaterThan(0)) {
					return setImmediate(waterCb, 'Invalid transaction amount');
				}

				if (transaction.recipientId !== transaction.senderId) {
					return setImmediate(waterCb, 'Invalid recipient');
				}

				if (!transaction.asset || !transaction.asset.votes) {
					return setImmediate(waterCb, 'Invalid transaction asset');
				}

				if (!Array.isArray(transaction.asset.votes)) {
					return setImmediate(waterCb, 'Invalid votes. Must be an array');
				}

				if (!transaction.asset.votes.length) {
					return setImmediate(waterCb, 'Invalid votes. Must not be empty');
				}

				if (
					transaction.asset.votes &&
					transaction.asset.votes.length > MAX_VOTES_PER_TRANSACTION
				) {
					return setImmediate(
						waterCb,
						[
							'Voting limit exceeded. Maximum is',
							MAX_VOTES_PER_TRANSACTION,
							'votes per transaction',
						].join(' ')
					);
				}
				return setImmediate(waterCb);
			},
			waterCb => {
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
								}
								return setImmediate(eachSeriesCb);
							},
							tx
						);
					},
					waterCb
				);
			},
		],
		waterErr => {
			if (waterErr) {
				if (exceptions.votes.includes(transaction.id)) {
					library.logger.warn(
						`vote.verify: Invalid transaction identified as exception "${
							transaction.id
						}"`
					);
					library.logger.error(waterErr);
					library.logger.debug(JSON.stringify(transaction));
				} else {
					return setImmediate(cb, waterErr);
				}
			}
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
	);
};

/**
 * Checks type, format and lenght from vote.
 *
 * @param {Object} vote
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error
 * @todo Add description for the params
 */
Vote.prototype.verifyVote = function(vote, cb) {
	if (typeof vote !== 'string') {
		return setImmediate(cb, 'Invalid vote type');
	}

	if (!/^[-+]{1}[0-9a-f]{64}$/.test(vote)) {
		return setImmediate(cb, 'Invalid vote format');
	}

	return setImmediate(cb);
};

/**
 * Calls checkConfirmedDelegates() with senderPublicKeykey and asset votes.
 *
 * @param {transaction} transaction
 * @param {function} cb - Callback function
 * @returns {SetImmediate} error - If transaction id is not in exceptions votes list
 * @todo Add description for the params
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
 * @param {Object} transaction
 * @param {function} cb
 * @returns {SetImmediate} error - If transaction id is not in exceptions votes list
 * @todo Add description for the params
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
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb
 * @returns {SetImmediate} null, transaction
 * @todo Add description for the params
 */
Vote.prototype.process = function(transaction, sender, cb) {
	return setImmediate(cb, null, transaction);
};

/**
 * Creates a buffer with asset.votes information.
 *
 * @param {transaction} transaction
 * @throws {Error}
 * @returns {Array} Buffer
 * @todo Add description for the params
 * @todo Check type and description of the return value
 */
Vote.prototype.getBytes = function(transaction) {
	try {
		return transaction.asset.votes
			? Buffer.from(transaction.asset.votes.join(''), 'utf8')
			: null;
	} catch (e) {
		throw e;
	}
};

/**
 * Calls checkConfirmedDelegates based on transaction data and
 * merges account to sender address with votes as delegates.
 *
 * @param {transaction} transaction
 * @param {block} block
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Vote.prototype.applyConfirmed = function(transaction, block, sender, cb, tx) {
	async.series(
		[
			function(seriesCb) {
				self.checkConfirmedDelegates(transaction, seriesCb, tx);
			},
			function() {
				library.account.merge(
					sender.address,
					{
						delegates: transaction.asset.votes,
						round: slots.calcRound(block.height),
					},
					mergeErr => setImmediate(cb, mergeErr),
					tx
				);
			},
		],
		cb
	);
};

/**
 * Calls checkUnconfirmedDelegates based on transaction data and
 * merges account to sender address with votes as unconfirmed delegates.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @param {function} cb - Callback function
 * @todo Add description for the params
 */
Vote.prototype.applyUnconfirmed = function(transaction, sender, cb, tx) {
	async.series(
		[
			function(seriesCb) {
				self.checkUnconfirmedDelegates(transaction, seriesCb, tx);
			},
			function(seriesCb) {
				library.account.merge(
					sender.address,
					{
						u_delegates: transaction.asset.votes,
					},
					mergeErr => setImmediate(seriesCb, mergeErr),
					tx
				);
			},
		],
		cb
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
			maxItems: MAX_VOTES_PER_TRANSACTION,
			uniqueItems: true,
		},
	},
	required: ['votes'],
};

/**
 * Validates asset schema.
 *
 * @param {transaction} transaction
 * @throws {string} If vote schema is invalid
 * @returns {transaction}
 * @todo Should pass transaction.asset.vote to validate?
 * @todo Add description for the params
 */
Vote.prototype.objectNormalize = function(transaction) {
	const report = library.schema.validate(
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
 * @param {Object} raw
 * @returns {null|votes}
 * @todo Add description for the params
 */
Vote.prototype.dbRead = function(raw) {
	if (!raw.v_votes) {
		return null;
	}
	const votes = raw.v_votes.split(',');

	return { votes };
};

/**
 * Checks if transaction has enough signatures to be confirmed.
 *
 * @param {transaction} transaction
 * @param {account} sender
 * @returns {boolean} true - If transaction signatures greather than sender multimin, or there are no sender multisignatures
 * @todo Add description for the params
 */
Vote.prototype.ready = function(transaction, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(transaction.signatures)) {
			return false;
		}
		return transaction.signatures.length >= sender.multimin;
	}
	return true;
};

module.exports = Vote;
