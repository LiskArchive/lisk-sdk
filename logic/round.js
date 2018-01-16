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

var RoundChanges = require('../helpers/RoundChanges.js');

/**
 * Validates required scope properties.
 * @memberof module:rounds
 * @class
 * @classdesc Main Round logic.
 * @param {Object} scope
 * @param {Task} t
 * @constructor
 */
// Constructor
function Round (scope, t) {
	this.scope = {
		backwards: scope.backwards,
		round: scope.round,
		roundOutsiders: scope.roundOutsiders,
		roundDelegates: scope.roundDelegates,
		roundFees: scope.roundFees,
		roundRewards: scope.roundRewards,
		library: {
			db: scope.library.db,
			logger: scope.library.logger
		},
		modules: {
			accounts: scope.modules.accounts
		},
		block: {
			generatorPublicKey: scope.block.generatorPublicKey,
			id: scope.block.id,
			height: scope.block.height
		}
	};
	this.t = t;

	// List of required scope properties
	var requiredProperties = ['library', 'modules', 'block', 'round', 'backwards'];

	// Require extra scope properties when finishing round
	if (scope.finishRound) {
		requiredProperties = requiredProperties.concat(['roundFees', 'roundRewards', 'roundDelegates', 'roundOutsiders']);
	}

	// Iterate over requiredProperties, checking for undefined scope properties
	requiredProperties.forEach(function (property) {
		if (scope[property] === undefined) {
			throw 'Missing required scope property: ' + property;
		}
	});
}

// Public methods
/**
 * Returns result from call to mergeAccountAndGet.
 * @implements {modules.accounts.mergeAccountAndGet}
 * @return {function} Promise
 */
Round.prototype.mergeBlockGenerator = function () {
	return this.t.none(
		this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: this.scope.block.generatorPublicKey,
			producedblocks: (this.scope.backwards ? -1 : 1),
			blockId: this.scope.block.id,
			round: this.scope.round
		})
	);
};

/**
 * If outsiders content, calls sql updateMissedBlocks.
 * @return {}
 */
Round.prototype.updateMissedBlocks = function () {
	if (this.scope.roundOutsiders.length === 0) {
		return this.t;
	}

	return (this.t || this.scope.library.db).rounds.updateMissedBlocks(this.scope.backwards, this.scope.roundOutsiders);
};

/**
 * Calls sql getVotes from `mem_round` table.
 * @return {}
 * @todo Round must be a param option.
 */
Round.prototype.getVotes = function () {
	return (this.t || this.scope.library.db).rounds.getVotes(this.scope.round);
};

/**
 * Calls getVotes with round.
 * @implements {getVotes}
 * @implements {modules.accounts.generateAddressByPublicKey}
 * @return {function} Promise
 */
Round.prototype.updateVotes = function () {
	var self = this;

	return self.getVotes(self.scope.round).then(function (votes) {
		var queries = votes.map(function (vote) {
			return self.scope.library.db.rounds.updateVotes(self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate), Math.floor(vote.amount));
		});

		if (queries.length > 0) {
			return self.t.batch(queries);
		} else {
			return self.t;
		}
	});
};

/**
 * For backwards option calls sql updateBlockId with newID: 0.
 * @return {function} Promise
 */
Round.prototype.markBlockId = function () {
	if (this.scope.backwards) {
		return (this.t || this.scope.library.db).rounds.updateBlockId(this.scope.block.id, '0');
	} else {
		return this.t;
	}
};

/**
 * Calls sql flush:
 * - Deletes round from `mem_round` table.
 * @return {function} Promise
 */
Round.prototype.flushRound = function () {
	return (this.t || this.scope.library.db).rounds.flush(this.scope.round);
};

/**
 * Calls sql truncateBlocks:
 * - Deletes blocks greather than height from `blocks` table.
 * @return {function} Promise
 */
Round.prototype.truncateBlocks = function () {
	return (this.t || this.scope.library.db).rounds.truncateBlocks(this.scope.block.height);
};

/**
 * Calls sql restoreRoundSnapshot:
 * - Restores mem_round table snapshot.
 * - Performed only when rollback last block of round.
 * @return {function} Promise
 */
Round.prototype.restoreRoundSnapshot = function () {
	this.scope.library.logger.debug('Restoring mem_round snapshot...');
	return (this.t || this.scope.library.db).rounds.restoreRoundSnapshot();
};

/**
 * Calls sql restoreVotesSnapshot:
 * - Restores mem_accounts.votes snapshot.
 * - Performed only when rollback last block of round.
 * @return {function} Promise
 */
Round.prototype.restoreVotesSnapshot = function () {
	this.scope.library.logger.debug('Restoring mem_accounts.vote snapshot...');
	return (this.t || this.scope.library.db).rounds.restoreVotesSnapshot();
};

/**
 * For each delegate calls mergeAccountAndGet and creates an address array.
 * @implements {helpers.RoundChanges}
 * @implements {modules.accounts.mergeAccountAndGet}
 * @return {function} Promise with address array.
 */
Round.prototype.applyRound = function () {
	var roundChanges = new RoundChanges(this.scope);
	var queries = [];

	// Reverse delegates if going backwards
	var delegates = (this.scope.backwards) ? this.scope.roundDelegates.reverse() : this.scope.roundDelegates;

	// Apply round changes to each delegate
	for (var i = 0; i < this.scope.roundDelegates.length; i++) {
		var delegate = this.scope.roundDelegates[i];
		var changes = roundChanges.at(i);

		this.scope.library.logger.trace('Delegate changes', { delegate: delegate, changes: changes });

		queries.push(this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: delegate,
			balance: (this.scope.backwards ? -changes.balance : changes.balance),
			u_balance: (this.scope.backwards ? -changes.balance : changes.balance),
			blockId: this.scope.block.id,
			round: this.scope.round,
			fees: (this.scope.backwards ? -changes.fees : changes.fees),
			rewards: (this.scope.backwards ? -changes.rewards : changes.rewards)
		}));
	}

	// Decide which delegate receives fees remainder
	var remainderIndex = (this.scope.backwards) ? 0 : delegates.length - 1;
	var remainderDelegate = delegates[remainderIndex];

	// Get round changes for chosen delegate
	var changes = roundChanges.at(remainderIndex);

	// Apply fees remaining to chosen delegate
	if (changes.feesRemaining > 0) {
		var feesRemaining = (this.scope.backwards ? -changes.feesRemaining : changes.feesRemaining);

		this.scope.library.logger.trace('Fees remaining', { index: remainderIndex, delegate: remainderDelegate, fees: feesRemaining });

		queries.push(this.scope.modules.accounts.mergeAccountAndGet({
			publicKey: remainderDelegate,
			balance: feesRemaining,
			u_balance: feesRemaining,
			blockId: this.scope.block.id,
			round: this.scope.round,
			fees: feesRemaining
		}));
	}

	this.scope.library.logger.trace('Applying round', queries);

	if (queries.length > 0) {
		return this.t.none(queries.join(''));
	} else {
		return this.t;
	}
};

/**
 * Calls:
 * - updateVotes
 * - updateMissedBlocks
 * - flushRound
 * - applyRound
 * - updateVotes
 * - flushRound
 * @implements {updateVotes}
 * @implements {updateMissedBlocks}
 * @implements {flushRound}
 * @implements {applyRound}
 * @return {function} Call result.
 */
Round.prototype.land = function () {
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(function () {
			return this.t;
		}.bind(this));
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
 * @implements {updateVotes}
 * @implements {updateMissedBlocks}
 * @implements {flushRound}
 * @implements {applyRound}
 * @implements {restoreRoundSnapshot}
 * @implements {restoreVotesSnapshot}
 * @return {function} Call result.
 */
Round.prototype.backwardLand = function () {
	return this.updateVotes()
		.then(this.updateMissedBlocks.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.applyRound.bind(this))
		.then(this.updateVotes.bind(this))
		.then(this.flushRound.bind(this))
		.then(this.restoreRoundSnapshot.bind(this))
		.then(this.restoreVotesSnapshot.bind(this))
		.then(function () {
			return this.t;
		}.bind(this));
};

// Export
module.exports = Round;
