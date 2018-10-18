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

const async = require('async');
// eslint-disable-next-line prefer-const
let Round = require('../logic/round.js');
const slots = require('../helpers/slots.js');

// Private fields
let modules;
let library;
let self;
const { ACTIVE_DELEGATES } = global.constants;
const __private = {};

__private.loaded = false;
__private.ticking = false;

/**
 * Main rounds methods. Initializes library with scope.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires helpers/slots
 * @requires logic/round
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 * @returns {setImmediateCallback} cb, null, self
 * @todo Apply node pattern for callbacks: callback always at the end
 */
class Rounds {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			db: scope.db,
			bus: scope.bus,
			network: scope.network,
		};
		self = this;

		setImmediate(cb, null, self);
	}
}

// Public methods
/**
 * @returns {boolean} __private.loaded
 * @todo Add description of the function
 */
Rounds.prototype.loaded = function() {
	return __private.loaded;
};

/**
 * @returns {boolean} __private.ticking
 * @todo Add description of the function
 */
Rounds.prototype.ticking = function() {
	return __private.ticking;
};

/**
 * Deletes from `mem_round` table records based on round.
 *
 * @param {number} round
 * @param {function} cb
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params and the return value
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
 *
 * @param {block} block - Current block
 * @param {block} previousBlock - Previous block
 * @param {function} done - Callback function
 * @param {function} tx - SQL transaction
 * @returns {function} Calling done with error if any
 */
Rounds.prototype.backwardTick = function(block, previousBlock, done, tx) {
	const round = slots.calcRound(block.height);
	const prevRound = slots.calcRound(previousBlock.height);
	const nextRound = slots.calcRound(block.height + 1);

	const scope = {
		library,
		modules,
		block,
		round,
		backwards: true,
	};

	// Establish if finishing round or not
	scope.finishRound =
		(prevRound === round && nextRound !== round) ||
		(block.height === 1 || block.height === 101);

	/**
	 * Description of backwardTick.
	 *
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the function
	 */
	function backwardTick(tx) {
		const round = new Round(scope, tx);

		library.logger.debug('Performing backward tick');
		library.logger.trace(scope);

		return round
			.mergeBlockGenerator()
			.then(() => (scope.finishRound ? round.backwardLand() : round));
	}

	async.series(
		[
			function(cb) {
				// Start round ticking
				__private.ticking = true;

				// Sum round if finishing round
				if (scope.finishRound) {
					return __private.sumRound(scope, cb, tx);
				}
				return setImmediate(cb);
			},
			function(cb) {
				// Get outsiders if finishing round
				if (scope.finishRound) {
					return __private.getOutsiders(scope, cb, tx);
				}
				return setImmediate(cb);
			},
			function(cb) {
				// Perform round tick
				tx
					.task(backwardTick)
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
 * Performs forward tick on round.
 *
 * @param {block} block - Current block
 * @param {function} done - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {function} Calling done with error if any
 */
Rounds.prototype.tick = function(block, done, tx) {
	const round = slots.calcRound(block.height);
	const nextRound = slots.calcRound(block.height + 1);

	const scope = {
		library,
		modules,
		block,
		round,
		backwards: false,
	};

	// Establish if finishing round or not
	scope.finishRound =
		round !== nextRound || (block.height === 1 || block.height === 101);

	/**
	 * Description of Tick.
	 *
	 * @class
	 * @todo Add @param tags
	 * @todo Add @returns tag
	 * @todo Add description of the class
	 */
	function Tick(t) {
		const promised = new Round(scope, t);

		library.logger.debug('Performing forward tick');
		library.logger.trace(scope);

		return promised
			.mergeBlockGenerator()
			.then(() => {
				if (scope.finishRound) {
					return promised.land().then(() => {
						library.bus.message('finishRound', round);
					});
				}
			})
			.then(() => {
				// Check if we are one block before last block of round, if yes - perform round snapshot
				if ((block.height + 1) % ACTIVE_DELEGATES === 0) {
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
					return __private.sumRound(scope, cb, tx);
				}
				return setImmediate(cb);
			},
			function(cb) {
				// Get outsiders if finishing round
				if (scope.finishRound) {
					return __private.getOutsiders(scope, cb, tx);
				}
				return setImmediate(cb);
			},
			// Perform round tick
			function(cb) {
				(tx || library.db)
					.task(Tick)
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

// Events
/**
 * Assigns modules to private constiable `modules`.
 *
 * @param {modules} scope - Loaded modules
 */
Rounds.prototype.onBind = function(scope) {
	modules = {
		blocks: scope.blocks,
		accounts: scope.accounts,
		delegates: scope.delegates,
	};
};

/**
 * Sets private constiable loaded to true.
 *
 * @listens module:loader~event:blockchainReady
 */
Rounds.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Emits a 'rounds/change' socket message.
 *
 * @param {number} round
 * @emits rounds/change
 * @todo Add description for the params
 */
Rounds.prototype.onFinishRound = function(round) {
	library.network.io.sockets.emit('rounds/change', { number: round });
};

/**
 * Sets private constiable `loaded` to false.
 *
 * @param {function} cb
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params
 */
Rounds.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

// Private methods
/**
 * Generates outsiders array and pushes to param scope constiable.
 * Obtains delegate list and for each delegate generate address.
 *
 * @private
 * @param {scope} scope
 * @param {function} cb
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params
 */
__private.getOutsiders = function(scope, cb, tx) {
	scope.roundOutsiders = [];

	if (scope.block.height === 1) {
		return setImmediate(cb);
	}
	modules.delegates.generateDelegateList(
		scope.round,
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
		},
		tx
	);
};

/**
 * Gets rows from `round_blocks` and calculates rewards.
 * Loads into scope constiable fees, rewards and delegates.
 *
 * @private
 * @param {number} round
 * @param {function} cb
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the params and the return value
 */
__private.sumRound = function(scope, cb, tx) {
	// When we need to sum round just after genesis block (height: 1)
	// - set data manually to 0, they will be distributed when actual round 1 is summed
	if (scope.block.height === 1) {
		library.logger.debug(`Summing round - ${scope.round} (genesis block)`);
		scope.roundFees = 0;
		scope.roundRewards = [0];
		scope.roundDelegates = [scope.block.generatorPublicKey];
		return setImmediate(cb);
	}

	library.logger.debug('Summing round', scope.round);

	(tx || library.db).rounds
		.summedRound(scope.round, ACTIVE_DELEGATES)
		.then(rows => {
			const rewards = [];

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
