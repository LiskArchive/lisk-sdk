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

const Bignumber = require('bignumber.js');
const async = require('async');
// eslint-disable-next-line prefer-const
const {
	CACHE_KEYS_DELEGATES,
} = require('../../../../../framework/src/components/cache');
const Round = require('../logic/round');
const slots = require('../helpers/slots');

// Private fields
let components;
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
			channel: scope.channel,
			logger: scope.components.logger,
			bus: scope.bus,
			storage: scope.components.storage,
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
	function backwardTick(backwardTickTx) {
		const newRound = new Round(scope, backwardTickTx);

		library.logger.debug('Performing backward tick');
		library.logger.trace(scope);
		return newRound
			.mergeBlockGenerator()
			.then(() => (scope.finishRound ? newRound.backwardLand() : newRound));
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
				library.storage.adapter
					.task('rounds:backwardTick', backwardTick, tx)
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
			if (err) {
				return done(err);
			}

			/**
			 * If we delete first block of the round,
			 * that means we go to last block of the previous round
			 * That's why we need to clear the cache to recalculate
			 * delegate list.
			 * */
			if (scope.finishRound) {
				modules.delegates.clearDelegateListCache();
			}

			return done();
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
				return true;
			})
			.then(() => {
				// Check if we are one block before last block of round, if yes - perform round snapshot
				if ((block.height + 1) % ACTIVE_DELEGATES === 0) {
					library.logger.debug('Performing round snapshot...');

					return t
						.batch([
							library.storage.entities.Round.clearRoundSnapshot(t),
							library.storage.entities.Round.performRoundSnapshot(t),
							library.storage.entities.Round.clearVotesSnapshot(t),
							library.storage.entities.Round.performVotesSnapshot(t),
						])
						.then(() => {
							library.logger.trace('Round snapshot done');
						})
						.catch(err => {
							library.logger.error('Round snapshot failed', err);
							throw err;
						});
				}
				return true;
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
				library.storage.adapter
					.task('rounds:tick', Tick, tx)
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
 * Create round information record into mem_rounds.
 *
 * @param {string} address - Address of the account
 * @param {Number} round - Associated round number
 * @param {Number} amount - Amount updated on account
 * @param {Object} [tx] - Database transaction
 * @returns {Promise}
 */
Rounds.prototype.createRoundInformationWithAmount = function(
	address,
	round,
	amount,
	tx
) {
	return library.storage.entities.Account.getOne(
		{ address },
		{ extended: true },
		tx
	).then(account => {
		if (!account.votedDelegatesPublicKeys) return true;

		const roundData = account.votedDelegatesPublicKeys.map(
			delegatePublicKey => ({
				address,
				amount,
				round,
				delegatePublicKey,
			})
		);

		return library.storage.entities.Round.create(roundData, {}, tx);
	});
};

/**
 * Create round information record into mem_rounds.
 *
 * @param {string} address - Address of the account
 * @param {Number} round - Associated round number
 * @param {string} delegatePublicKey - Associated delegate id
 * @param {string} mode - Possible values of '+' or '-' represents behaviour of adding or removing delegate
 * @param {Object} [tx] - Databaes transaction
 * @returns {Promise}
 */
Rounds.prototype.createRoundInformationWithDelegate = function(
	address,
	round,
	delegatePublicKey,
	mode,
	tx
) {
	const balanceFactor = mode === '-' ? -1 : 1;
	return library.storage.entities.Account.getOne({ address }, {}, tx).then(
		account => {
			const balance = new Bignumber(account.balance)
				.multipliedBy(balanceFactor)
				.toString();

			const roundData = {
				address,
				delegatePublicKey,
				round,
				amount: balance,
			};
			return library.storage.entities.Round.create(roundData, {}, tx);
		}
	);
};

// Events
/**
 * Assigns modules to private constant `modules`.
 *
 * @param {modules} scope - Loaded modules
 */
Rounds.prototype.onBind = function(scope) {
	components = {
		cache: scope.components ? scope.components.cache : undefined,
	};

	modules = {
		blocks: scope.modules.blocks,
		accounts: scope.modules.accounts,
		delegates: scope.modules.delegates,
	};
};

/**
 * Sets private constant loaded to true.
 *
 * @listens module:loader~event:blockchainReady
 */
Rounds.prototype.onBlockchainReady = function() {
	__private.loaded = true;
};

/**
 * Clear all cache entries related to delegate and emits a 'rounds/change' socket message.
 *
 * @param {number} round
 * @emits rounds/change
 * @todo Add description for the params
 */
Rounds.prototype.onFinishRound = async function(round) {
	if (components && components.cache && components.cache.isReady()) {
		library.logger.debug(
			['Cache - onFinishRound', '| Status:', components.cache.isReady()].join(
				' '
			)
		);
		const pattern = CACHE_KEYS_DELEGATES;
		try {
			await components.cache.removeByPattern(pattern);
			library.logger.debug(
				[
					'Cache - Keys with pattern:',
					pattern,
					'cleared from cache on new Round',
				].join(' ')
			);
		} catch (removeByPatternErr) {
			library.logger.error(
				[
					'Cache - Error clearing keys with pattern:',
					pattern,
					'when round finish',
				].join(' ')
			);
		}
	}

	return library.channel.publish('chain:rounds:change', { number: round });
};

/**
 * Sets private constant `loaded` to false.
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
 * Generates outsiders array and pushes to param scope constant.
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
	return modules.delegates.generateDelegateList(
		scope.round,
		null,
		(err, roundDelegates) => {
			if (err) {
				return setImmediate(cb, err);
			}
			return async.eachSeries(
				roundDelegates,
				(delegate, eachCb) => {
					if (scope.roundDelegates.indexOf(delegate) === -1) {
						scope.roundOutsiders.push(
							modules.accounts.generateAddressByPublicKey(delegate)
						);
					}
					return setImmediate(eachCb);
				},
				eachSeriesErr => {
					library.logger.trace('Got outsiders', scope.roundOutsiders);
					return setImmediate(cb, eachSeriesErr);
				}
			);
		},
		tx
	);
};

/**
 * Gets rows from `round_blocks` and calculates rewards.
 * Loads into scope constant fees, rewards and delegates.
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

	return library.storage.entities.Round.summedRound(
		scope.round,
		ACTIVE_DELEGATES,
		tx
	)
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
