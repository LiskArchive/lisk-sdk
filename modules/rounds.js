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

var async = require('async');
var constants = require('../helpers/constants.js');
var Round = require('../logic/round.js');
var slots = require('../helpers/slots.js');

// Private fields
var modules;
var library;
var self;
var __private = {};

__private.loaded = false;
__private.ticking = false;

/**
 * Initializes library with scope.
 * @memberof module:rounds
 * @class
 * @classdesc Main rounds methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 * @todo Apply node pattern for callbacks: callback always at the end.
 */
// Constructor
function Rounds(cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		bus: scope.bus,
		network: scope.network,
		config: {
			loading: {
				snapshot: scope.config.loading.snapshot,
			},
		},
	};
	self = this;

	setImmediate(cb, null, self);
}

// Public methods
/**
 * @return {boolean} __private.loaded
 */
Rounds.prototype.loaded = function() {
	return __private.loaded;
};

/**
 * @return {boolean} __private.ticking
 */
Rounds.prototype.ticking = function() {
	return __private.ticking;
};

/**
 * Deletes from `mem_round` table records based on round.
 * @implements {library.db.rounds.flush}
 * @param {number} round
 * @param {function} cb
 * @return {setImmediateCallback}
 */
Rounds.prototype.flush = function(round, cb) {
	library.db.rounds
		.flush(round)
		.then(() => setImmediate(cb))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Rounds#flush error');
		});
};

/**
 * Performs backward tick on round.
 * @implements {slots.calcRound}
 * @implements {__private.getOutsiders}
 * @implements {Round.mergeBlockGenerator}
 * @implements {Round.markBlockId}
 * @implements {Round.land}
 * @implements {library.db.tx}
 * @param {block} block - Current block.
 * @param {block} previousBlock - Previous block.
 * @param {function} done - Callback function.
 * @return {function} Calling done with error if any.
 */
Rounds.prototype.backwardTick = function(block, previousBlock, done) {
	var round = slots.calcRound(block.height);
	var prevRound = slots.calcRound(previousBlock.height);
	var nextRound = slots.calcRound(block.height + 1);

	var scope = {
		library: library,
		modules: modules,
		block: block,
		round: round,
		backwards: true,
	};

	// Establish if finishing round or not
	scope.finishRound =
		(prevRound === round && nextRound !== round) ||
		(block.height === 1 || block.height === 101);

	function BackwardTick(t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing backward tick');
		library.logger.trace(scope);

		return promised.mergeBlockGenerator().then(() => {
			if (scope.finishRound) {
				return promised.backwardLand().then(() => promised.markBlockId());
			} else {
				return promised.markBlockId();
			}
		});
	}

	async.series(
		[
			function(cb) {
				// Start round ticking
				__private.ticking = true;

				// Sum round if finishing round
				if (scope.finishRound) {
					return __private.sumRound(scope, cb);
				} else {
					return setImmediate(cb);
				}
			},
			function(cb) {
				// Get outsiders if finishing round
				if (scope.finishRound) {
					return __private.getOutsiders(scope, cb);
				} else {
					return setImmediate(cb);
				}
			},
			function(cb) {
				// Perform round tick
				library.db
					.tx(BackwardTick)
					.then(() => setImmediate(cb))
					.catch(err => {
						library.logger.error(err.stack);
						return setImmediate(cb, err);
					});
			},
		],
		err => {
			// Stop round ticking
			__private.ticking = false;
			return done(err);
		}
	);
};

/**
 * Sets up round snapshotting.
 * @param {number} round - Target round.
 */
Rounds.prototype.setSnapshotRound = function(round) {
	library.config.loading.snapshot = round;
};

/**
 * Performs forward tick on round.
 * @implements {slots.calcRound}
 * @implements {Round.mergeBlockGenerator}
 * @implements {Round.land}
 * @implements {library.bus.message}
 * @implements {Round.truncateBlocks}
 * @implements {__private.getOutsiders}
 * @param {block} block - Current block.
 * @param {function} done - Callback function.
 * @return {function} Calling done with error if any.
 */
Rounds.prototype.tick = function(block, done) {
	var round = slots.calcRound(block.height);
	var nextRound = slots.calcRound(block.height + 1);

	var scope = {
		library: library,
		modules: modules,
		block: block,
		round: round,
		backwards: false,
	};

	// Establish if snapshotting round or not
	scope.snapshotRound =
		library.config.loading.snapshot > 0 &&
		library.config.loading.snapshot === round;

	// Establish if finishing round or not
	scope.finishRound =
		round !== nextRound || (block.height === 1 || block.height === 101);

	function Tick(t) {
		var promised = new Round(scope, t);

		library.logger.debug('Performing forward tick');
		library.logger.trace(scope);

		return promised
			.mergeBlockGenerator()
			.then(() => {
				if (scope.finishRound) {
					return promised.land().then(() => {
						library.bus.message('finishRound', round);
						if (scope.snapshotRound) {
							return promised.truncateBlocks().then(() => {
								scope.finishSnapshot = true;
							});
						}
					});
				}
			})
			.then(() => {
				// Check if we are one block before last block of round, if yes - perform round snapshot
				if ((block.height + 1) % slots.delegates === 0) {
					library.logger.debug('Performing round snapshot...');

					return t
						.batch([
							t.rounds.clearRoundSnapshot(),
							t.rounds.performRoundSnapshot(),
							t.rounds.clearVotesSnapshot(),
							t.rounds.performVotesSnapshot(),
						])
						.then(() => {
							library.logger.trace('Round snapshot done');
						})
						.catch(err => {
							library.logger.error('Round snapshot failed', err);
							throw err;
						});
				}
			});
	}

	async.series(
		[
			function(cb) {
				// Start round ticking
				__private.ticking = true;

				// Sum round if finishing round
				if (scope.finishRound) {
					return __private.sumRound(scope, cb);
				} else {
					return setImmediate(cb);
				}
			},
			function(cb) {
				// Get outsiders if finishing round
				if (scope.finishRound) {
					return __private.getOutsiders(scope, cb);
				} else {
					return setImmediate(cb);
				}
			},
			// Perform round tick
			function(cb) {
				library.db
					.tx(Tick)
					.then(() => setImmediate(cb))
					.catch(err => {
						library.logger.error(err.stack);
						return setImmediate(cb, err);
					});
			},
		],
		err => {
			// Stop round ticking
			__private.ticking = false;

			if (scope.finishSnapshot) {
				return done('Snapshot finished');
			} else {
				return done(err);
			}
		}
	);
};

// Events
/**
 * Assigns modules to private variable `modules`.
 * @param {modules} scope - Loaded modules.
 */
Rounds.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.blocks,
		accounts: scope.accounts,
		delegates: scope.delegates,
	};
};

/**
 * Sets private variable loaded to true,
 * @public
 * @method onBlockchainReady
 * @listens module:loader~event:blockchainReady
 */
Rounds.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Emits a 'rounds/change' socket message.
 * @implements {library.network.io.sockets.emit}
 * @param {number} round
 * @emits rounds/change
 */
Rounds.prototype.onFinishRound = function(round) {
	library.network.io.sockets.emit('rounds/change', { number: round });
};

/**
 * Sets private variable `loaded` to false.
 * @param {function} cb
 * @return {setImmediateCallback} cb
 */
Rounds.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Private methods
/**
 * Generates outsiders array and pushes to param scope variable.
 * Obtains delegate list and for each delegate generate address.
 * @private
 * @implements {modules.delegates.generateDelegateList}
 * @implements {modules.accounts.generateAddressByPublicKey}
 * @param {scope} scope
 * @param {function} cb
 * @return {setImmediateCallback}
 */
__private.getOutsiders = function(scope, cb) {
	scope.roundOutsiders = [];

	if (scope.block.height === 1) {
		return setImmediate(cb);
	}
	modules.delegates.generateDelegateList(
		scope.block.height,
		null,
		(err, roundDelegates) => {
			if (err) {
				return setImmediate(cb, err);
			}
			async.eachSeries(
				roundDelegates,
				(delegate, eachCb) => {
					if (scope.roundDelegates.indexOf(delegate) === -1) {
						scope.roundOutsiders.push(
							modules.accounts.generateAddressByPublicKey(delegate)
						);
					}
					return setImmediate(eachCb);
				},
				err => {
					library.logger.trace('Got outsiders', scope.roundOutsiders);
					return setImmediate(cb, err);
				}
			);
		}
	);
};

/**
 * Gets rows from `round_blocks` and calculates rewards.
 * Loads into scope variable fees, rewards and delegates.
 * @private
 * @implements {library.db.query}
 * @param {number} round
 * @param {function} cb
 * @return {setImmediateCallback}
 */
__private.sumRound = function(scope, cb) {
	library.logger.debug('Summing round', scope.round);

	library.db.rounds
		.summedRound(scope.round, constants.activeDelegates)
		.then(rows => {
			var rewards = [];

			rows[0].rewards.forEach(reward => {
				rewards.push(Math.floor(reward));
			});

			scope.roundFees = Math.floor(rows[0].fees);
			scope.roundRewards = rewards;
			scope.roundDelegates = rows[0].delegates;

			library.logger.trace('roundFees', scope.roundFees);
			library.logger.trace('roundRewards', scope.roundRewards);
			library.logger.trace('roundDelegates', scope.roundDelegates);

			return setImmediate(cb);
		})
		.catch(err => {
			library.logger.error('Failed to sum round', scope.round);
			library.logger.error(err.stack);
			return setImmediate(cb, err);
		});
};

// Export
module.exports = Rounds;
