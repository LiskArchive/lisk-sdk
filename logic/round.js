'use strict';

var pgp = require('pg-promise');
var RoundChanges = require('../helpers/RoundChanges.js');
var sql = require('../sql/rounds.js');

// Constructor
function Round (scope, t) {
	this.scope = scope;
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

Round.prototype.updateMissedBlocks = function () {
	if (this.scope.roundOutsiders.length === 0) {
		return this.t;
	}

	return this.t.none(sql.updateMissedBlocks(this.scope.backwards), [this.scope.roundOutsiders]);
};

Round.prototype.getVotes = function () {
	return this.t.query(sql.getVotes, { round: this.scope.round });
};

Round.prototype.updateVotes = function () {
	var self = this;

	return self.getVotes(self.scope.round).then(function (votes) {
		var queries = votes.map(function (vote) {
			return pgp.as.format(sql.updateVotes, {
				address: self.scope.modules.accounts.generateAddressByPublicKey(vote.delegate),
				amount: Math.floor(vote.amount)
			});
		}).join('');

		if (queries.length > 0) {
			return self.t.none(queries);
		} else {
			return self.t;
		}
	});
};

Round.prototype.markBlockId = function () {
	if (this.scope.backwards) {
		return this.t.none(sql.updateBlockId, { oldId: this.scope.block.id, newId: '0' });
	} else {
		return this.t;
	}
};

Round.prototype.flushRound = function () {
	return this.t.none(sql.flush, { round: this.scope.round });
};

Round.prototype.truncateBlocks = function () {
	return this.t.none(sql.truncateBlocks, { height: this.scope.block.height });
};

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

// Export
module.exports = Round;
