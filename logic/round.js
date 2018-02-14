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

var Promise = require('bluebird');
var bignum = require('../helpers/bignum.js');
var RoundChanges = require('../helpers/round_changes.js');

/**
 * Validates required scope properties.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires bluebird
 * @requires helpers/round_changes
 * @param {Object} scope
 * @param {Task} t
 * @todo Add description for the params
 */
// Constructor
function Round(scope, t) {
	this.scope = {
		backwards: scope.backwards,
		round: scope.round,
		roundOutsiders: scope.roundOutsiders,
		roundDelegates: scope.roundDelegates,
		roundFees: scope.roundFees,
		roundRewards: scope.roundRewards,
		library: {
			db: scope.library.db,
			logger: scope.library.logger,
		},
		modules: {
			accounts: scope.modules.accounts,
		},
		block: {
			generatorPublicKey: scope.block.generatorPublicKey,
			id: scope.block.id,
			height: scope.block.height,
			timestamp: scope.block.timestamp,
		},
	};
	this.t = t;

	// List of required scope properties
	var requiredProperties = [
		'library',
		'modules',
		'block',
		'round',
		'backwards',
	];

	// Require extra scope properties when finishing round
	if (scope.finishRound) {
		requiredProperties = requiredProperties.concat([
			'roundFees',
			'roundRewards',
			'roundDelegates',
			'roundOutsiders',
		]);
	}

	// Iterate over requiredProperties, checking for undefined scope properties
	requiredProperties.forEach(property => {
		if (scope[property] === undefined) {
			throw `Missing required scope property: ${property}`;
		}
	});
}

// Public methods
/**
 * Returns result from call to mergeAccountAndGet.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.mergeBlockGenerator = function() {
	var self = this;

	return new Promise((resolve, reject) => {
		self.scope.modules.accounts.mergeAccountAndGet(
			{
				publicKey: self.scope.block.generatorPublicKey,
				producedblocks: self.scope.backwards ? -1 : 1,
				blockId: self.scope.block.id,
				round: self.scope.round,
			},
			(err, account) => {
				if (err) {
					return reject(err);
				}

				return resolve(account);
			},
			self.t
		);
	});
};

/**
 * If outsiders content, calls sql updateMissedBlocks.
 *
 * @todo Add @returns tag
 */
Round.prototype.updateMissedBlocks = function() {
	if (this.scope.roundOutsiders.length === 0) {
		return this.t;
	}

	return (this.t || this.scope.library.db).rounds.updateMissedBlocks(
		this.scope.backwards,
		this.scope.roundOutsiders
	);
};

/**
 * Calls sql getVotes from `mem_round` table.
 *
 * @todo Round must be a param option
 * @todo Add @returns tag
 */
Round.prototype.getVotes = function() {
	return (this.t || this.scope.library.db).rounds.getVotes(this.scope.round);
};

/**
 * Calls getVotes with round.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.updateVotes = function() {
	var self = this;

	return self.getVotes(self.scope.round).then(votes => {
		var queries = votes.map(vote =>
			self.t.rounds.updateVotes(
				self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate),
				Math.floor(vote.amount)
			)
		);

		if (queries.length > 0) {
			return self.t.batch(queries);
		}
		return self.t;
	});
};

/**
 * For backwards option calls sql updateBlockId with newID: 0.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.markBlockId = function() {
	if (this.scope.backwards) {
		return (this.t || this.scope.library.db).rounds.updateBlockId(
			this.scope.block.id,
			'0'
		);
	}
	return this.t;
};

/**
 * Calls sql flush:
 * - Deletes round from `mem_round` table.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.flushRound = function() {
	return (this.t || this.scope.library.db).rounds.flush(this.scope.round);
};

/**
 * Calls sql truncateBlocks:
 * - Deletes blocks greather than height from `blocks` table.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.truncateBlocks = function() {
	return (this.t || this.scope.library.db).rounds.truncateBlocks(
		this.scope.block.height
	);
};

/**
 * Calls sql restoreRoundSnapshot:
 * - Restores mem_round table snapshot.
 * - Performed only when rollback last block of round.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.restoreRoundSnapshot = function() {
	this.scope.library.logger.debug('Restoring mem_round snapshot...');
	return (this.t || this.scope.library.db).rounds.restoreRoundSnapshot();
};

/**
 * Calls sql restoreVotesSnapshot:
 * - Restores mem_accounts.votes snapshot.
 * - Performed only when rollback last block of round.
 *
 * @returns {function} Promise
 * @todo Check type and description of the return value
 */
Round.prototype.restoreVotesSnapshot = function() {
	this.scope.library.logger.debug('Restoring mem_accounts.vote snapshot...');
	return (this.t || this.scope.library.db).rounds.restoreVotesSnapshot();
};

/**
 * Calls sql deleteRoundRewards:
 * - Removes rewards for entire round from round_rewards table.
 * - Performed only when rollback last block of round.
 * @returns {function} Promise
 */
Round.prototype.deleteRoundRewards = function() {
	this.scope.library.logger.debug(
		`Deleting rewards for round ${this.scope.round}`
	);
	return (this.t || this.scope.library.db).rounds.deleteRoundRewards(
		this.scope.round
	);
};

/**
 * For each delegate calls mergeAccountAndGet and creates an address array.
 *
 * @returns {function} Promise with address array
 */
Round.prototype.applyRound = function() {
	var roundChanges = new RoundChanges(this.scope);
	var queries = [];
	var self = this;
	var changes;
	var delegates;
	var delegate;
	var p;
	const roundRewards = [];

	// Reverse delegates if going backwards
	delegates = self.scope.backwards
		? self.scope.roundDelegates.reverse()
		: self.scope.roundDelegates;

	// Reverse rewards if going backwards
	if (self.scope.backwards) {
		self.scope.roundRewards.reverse();
	}

	// Apply round changes to each delegate
	for (var i = 0; i < self.scope.roundDelegates.length; i++) {
		delegate = self.scope.roundDelegates[i];
		changes = roundChanges.at(i);

		this.scope.library.logger.trace('Delegate changes', {
			delegate,
			changes,
		});

		const accountData = {
			publicKey: delegate,
			balance: self.scope.backwards ? -changes.balance : changes.balance,
			u_balance: self.scope.backwards ? -changes.balance : changes.balance,
			blockId: self.scope.block.id,
			round: self.scope.round,
			fees: self.scope.backwards ? -changes.fees : changes.fees,
			rewards: self.scope.backwards ? -changes.rewards : changes.rewards,
		};

		p = new Promise((resolve, reject) => {
			self.scope.modules.accounts.mergeAccountAndGet(
				accountData,
				(err, account) => {
					if (err) {
						return reject(err);
					}
					return resolve(account);
				},
				self.t
			);
		});

		queries.push(p);

		// Aggregate round rewards data - when going forward
		if (!self.scope.backwards) {
			roundRewards.push({
				timestamp: self.scope.block.timestamp,
				fees: new bignum(changes.fees).toString(),
				reward: new bignum(changes.rewards).toString(),
				round: self.scope.round,
				publicKey: delegate,
			});
		}
	}

	// Decide which delegate receives fees remainder
	var remainderIndex = this.scope.backwards ? 0 : delegates.length - 1;
	var remainderDelegate = delegates[remainderIndex];

	// Get round changes for chosen delegate
	changes = roundChanges.at(remainderIndex);

	// Apply fees remaining to chosen delegate
	if (changes.feesRemaining > 0) {
		var feesRemaining = this.scope.backwards
			? -changes.feesRemaining
			: changes.feesRemaining;

		this.scope.library.logger.trace('Fees remaining', {
			index: remainderIndex,
			delegate: remainderDelegate,
			fees: feesRemaining,
		});

		p = new Promise((resolve, reject) => {
			self.scope.modules.accounts.mergeAccountAndGet(
				{
					publicKey: remainderDelegate,
					balance: feesRemaining,
					u_balance: feesRemaining,
					blockId: self.scope.block.id,
					round: self.scope.round,
					fees: feesRemaining,
				},
				(err, account) => {
					if (err) {
						return reject(err);
					}
					return resolve(account);
				},
				self.t
			);
		});

		// Aggregate round rewards data (remaining fees) - when going forward
		if (!self.scope.backwards) {
			roundRewards[roundRewards.length - 1].fees = new bignum(
				roundRewards[roundRewards.length - 1].fees
			)
				.plus(feesRemaining)
				.toString();
		}

		queries.push(p);
	}

	// Prepare queries for inserting round rewards
	roundRewards.forEach(item => {
		queries.push(
			self.t.rounds.insertRoundRewards(
				item.timestamp,
				item.fees,
				item.reward,
				item.round,
				item.publicKey
			)
		);
	});

	self.scope.library.logger.trace('Applying round', {
		queries_count: queries.length,
		rewards: roundRewards,
	});

	if (queries.length > 0) {
		return this.t.batch(queries);
	}
	return this.t;
};

/**
 * Calls:
 * - updateVotes
 * - updateMissedBlocks
 * - flushRound
 * - applyRound
 * - updateVotes
 * - flushRound
 *
 * @returns {function} Call result
 */
Round.prototype.land = function() {
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(() => this.t);
};

/**
 * Calls:
 * - updateVotes
 * - updateMissedBlocks
 * - flushRound
 * - applyRound
 * - updateVotes
 * - flushRound
 * - restoreRoundSnapshot
 * - restoreVotesSnapshot
 *
 * @returns {function} Call result
 */
Round.prototype.backwardLand = function() {
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.restoreRoundSnapshot.bind(this))
		.then(this.restoreVotesSnapshot.bind(this))
		.then(this.deleteRoundRewards.bind(this))
		.then(() => this.t);
};

// Export
module.exports = Round;
