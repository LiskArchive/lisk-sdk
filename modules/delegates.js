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
var apiCodes = require('../helpers/api_codes.js');
var ApiError = require('../helpers/api_error.js');
var BlockReward = require('../logic/block_reward.js');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobs_queue.js');
var crypto = require('crypto');
var Delegate = require('../logic/delegate.js');
var slots = require('../helpers/slots.js');
var transactionTypes = require('../helpers/transaction_types.js');

// Private fields
var modules;
var library;
var self;
var __private = {};

__private.assetTypes = {};
__private.loaded = false;
__private.keypairs = {};
__private.tmpKeypairs = {};

/**
 * Initializes library with scope content and generates a Delegate instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:delegates
 * @class
 * @classdesc Main delegates methods.
 * @param {scope} scope - App instance.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `self` as argument.
 */
// Constructor
function Delegates(cb, scope) {
	library = {
		logger: scope.logger,
		sequence: scope.sequence,
		ed: scope.ed,
		db: scope.db,
		network: scope.network,
		schema: scope.schema,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction,
		},
		config: {
			forging: {
				secret: scope.config.forging.secret,
				force: scope.config.forging.force,
				defaultKey: scope.config.forging.defaultKey,
				access: {
					whiteList: scope.config.forging.access.whiteList,
				},
			},
		},
	};
	self = this;
	__private.blockReward = new BlockReward();
	__private.assetTypes[
		transactionTypes.DELEGATE
	] = library.logic.transaction.attachAssetType(
		transactionTypes.DELEGATE,
		new Delegate(scope.logger, scope.schema)
	);

	setImmediate(cb, null, self);
}

/**
 * Gets delegate public keys sorted by vote descending.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.getKeysSortByVote = function(cb) {
	modules.accounts.getAccounts(
		{
			isDelegate: 1,
			sort: { vote: -1, publicKey: 1 },
			limit: slots.delegates,
		},
		['publicKey'],
		(err, rows) => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, rows.map(el => el.publicKey));
		}
	);
};

/**
 * Gets delegate public keys from previous round, sorted by vote descending.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.getDelegatesFromPreviousRound = function(cb) {
	library.db.rounds
		.getDelegatesSnapshot(slots.delegates)
		.then(rows => {
			var delegatesPublicKeys = [];
			rows.forEach(row => {
				delegatesPublicKeys.push(row.publicKey.toString('hex'));
			});
			return setImmediate(cb, null, delegatesPublicKeys);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'getDelegatesSnapshot database query failed');
		});
};

/**
 * Generates delegate list and checks if block generator publicKey matches delegate id.
 * @param {block} block
 * @param {function} source - Source function for get delegates
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error message | cb
 */
__private.validateBlockSlot = function(block, source, cb) {
	self.generateDelegateList(block.height, source, (err, activeDelegates) => {
		if (err) {
			return setImmediate(cb, err);
		}

		var currentSlot = slots.getSlotNumber(block.timestamp);
		var delegateId = activeDelegates[currentSlot % slots.delegates];

		if (delegateId && block.generatorPublicKey === delegateId) {
			return setImmediate(cb);
		} else {
			library.logger.error(
				`Expected generator: ${delegateId} Received generator: ${
					block.generatorPublicKey
				}`
			);
			return setImmediate(cb, `Failed to verify slot: ${currentSlot}`);
		}
	});
};

/**
 * Gets slot time and keypair.
 * @private
 * @param {number} slot
 * @param {number} height
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | cb | object {time, keypair}
 */
__private.getBlockSlotData = function(slot, height, cb) {
	self.generateDelegateList(height, null, (err, activeDelegates) => {
		if (err) {
			return setImmediate(cb, err);
		}

		var currentSlot = slot;
		var lastSlot = slots.getLastSlot(currentSlot);

		for (; currentSlot < lastSlot; currentSlot += 1) {
			var delegate_pos = currentSlot % slots.delegates;
			var delegate_id = activeDelegates[delegate_pos];

			if (delegate_id && __private.keypairs[delegate_id]) {
				return setImmediate(cb, null, {
					time: slots.getSlotTime(currentSlot),
					keypair: __private.keypairs[delegate_id],
				});
			}
		}

		return setImmediate(cb, null, null);
	});
};

/**
 * Gets peers, checks consensus and generates new block, once delegates
 * are enabled, client is ready to forge and is the correct slot.
 * @implements slots.calcRound
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.forge = function(cb) {
	if (!Object.keys(__private.keypairs).length) {
		library.logger.debug('No delegates enabled');
		return __private.loadDelegates(cb);
	}

	// When client is not loaded, is syncing or round is ticking
	// Do not try to forge new blocks as client is not ready
	if (
		!__private.loaded ||
		modules.loader.syncing() ||
		!modules.rounds.loaded() ||
		modules.rounds.ticking()
	) {
		library.logger.debug('Client not ready to forge');
		return setImmediate(cb);
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.lastBlock.get();

	if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
		library.logger.debug('Waiting for next delegate slot');
		return setImmediate(cb);
	}

	__private.getBlockSlotData(
		currentSlot,
		lastBlock.height + 1,
		(err, currentBlockData) => {
			if (err || currentBlockData === null) {
				library.logger.warn('Skipping delegate slot', err);
				return setImmediate(cb);
			}

			if (
				slots.getSlotNumber(currentBlockData.time) !== slots.getSlotNumber()
			) {
				library.logger.debug('Delegate slot', slots.getSlotNumber());
				return setImmediate(cb);
			}

			library.sequence.add(
				cb => {
					if (modules.transport.poorConsensus()) {
						return setImmediate(
							cb,
							[
								'Inadequate broadhash consensus',
								modules.peers.getLastConsensus(),
								'%',
							].join(' ')
						);
					}
					library.logger.info(
						[
							'Broadhash consensus now',
							modules.peers.getLastConsensus(),
							'%',
						].join(' ')
					);
					modules.blocks.process.generateBlock(
						currentBlockData.keypair,
						currentBlockData.time,
						cb
					);
				},
				err => {
					if (err) {
						library.logger.error(
							'Failed to generate block within delegate slot',
							err
						);
					} else {
						var forgedBlock = modules.blocks.lastBlock.get();
						modules.blocks.lastReceipt.update();

						library.logger.info(
							[
								'Forged new block id:',
								forgedBlock.id,
								'height:',
								forgedBlock.height,
								'round:',
								slots.calcRound(forgedBlock.height),
								'slot:',
								slots.getSlotNumber(currentBlockData.time),
								`reward:${forgedBlock.reward}`,
							].join(' ')
						);
					}

					return setImmediate(cb);
				}
			);
		}
	);
};

/**
 * Returns the decrypted secret by deciphering encrypted secret with the key provided using aes-256-cbc algorithm.
 * @private
 * @param {string} encryptedSecret
 * @param {string} key
 * @returns {string} decryptedSecret
 * @throws {error} If unable to decrypt using key.
 */
__private.decryptSecret = function(encryptedSecret, key) {
	var decipher = crypto.createDecipher('aes-256-cbc', key);
	var decryptedSecret = decipher.update(encryptedSecret, 'hex', 'utf8');
	decryptedSecret += decipher.final('utf8');
	return decryptedSecret;
};

/**
 * Checks each vote integrity and controls total votes don't exceed active delegates.
 * Calls modules.accounts.getAccount() to validate delegate account and votes accounts.
 * @private
 * @implements module:accounts#Account#getAccount
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {string} state - 'confirmed' to delegates, otherwise u_delegates.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb | error messages
 */
__private.checkDelegates = function(publicKey, votes, state, cb, tx) {
	if (!Array.isArray(votes)) {
		return setImmediate(cb, 'Votes must be an array');
	}

	modules.accounts.getAccount(
		{ publicKey: publicKey },
		(err, account) => {
			if (err) {
				return setImmediate(cb, err);
			}

			if (!account) {
				return setImmediate(cb, 'Account not found');
			}

			var delegates =
				state === 'confirmed' ? account.delegates : account.u_delegates;
			var existing_votes = Array.isArray(delegates) ? delegates.length : 0;
			var additions = 0;
			var removals = 0;

			async.eachSeries(
				votes,
				(action, cb) => {
					var math = action[0];

					if (math === '+') {
						additions += 1;
					} else if (math === '-') {
						removals += 1;
					} else {
						return setImmediate(cb, 'Invalid math operator');
					}

					var publicKey = action.slice(1);

					try {
						Buffer.from(publicKey, 'hex');
					} catch (e) {
						library.logger.error(e.stack);
						return setImmediate(cb, 'Invalid public key');
					}

					modules.accounts.getAccount(
						{ publicKey: publicKey, isDelegate: 1 },
						(err, account) => {
							if (err) {
								return setImmediate(cb, err);
							}

							if (!account) {
								return setImmediate(cb, 'Delegate not found');
							}

							if (
								math === '+' &&
								(delegates != null && delegates.indexOf(publicKey) !== -1)
							) {
								return setImmediate(
									cb,
									`Failed to add vote, delegate "${
										account.username
									}" already voted for`
								);
							}

							if (
								math === '-' &&
								(delegates === null || delegates.indexOf(publicKey) === -1)
							) {
								return setImmediate(
									cb,
									`Failed to remove vote, delegate "${
										account.username
									}" was not voted for`
								);
							}

							return setImmediate(cb);
						},
						tx
					);
				},
				err => {
					if (err) {
						return setImmediate(cb, err);
					}

					var total_votes = existing_votes + additions - removals;

					if (total_votes > constants.activeDelegates) {
						var exceeded = total_votes - constants.activeDelegates;

						return setImmediate(
							cb,
							`Maximum number of ${
								constants.activeDelegates
							} votes exceeded (${exceeded} too many)`
						);
					} else {
						return setImmediate(cb);
					}
				}
			);
		},
		tx
	);
};

/**
 * Loads delegates from config and stores in private `keypairs`.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.loadDelegates = function(cb) {
	var secretsList = library.config.forging.secret;

	if (
		!secretsList ||
		!secretsList.length ||
		!library.config.forging.force ||
		!library.config.forging.defaultKey
	) {
		return setImmediate(cb);
	} else {
		library.logger.info(
			[
				'Loading',
				secretsList.length,
				'delegates using encrypted secrets from config',
			].join(' ')
		);
	}

	async.eachSeries(
		secretsList,
		(encryptedItem, seriesCb) => {
			var secret;
			try {
				secret = __private.decryptSecret(
					encryptedItem.encryptedSecret,
					library.config.forging.defaultKey
				);
			} catch (e) {
				return setImmediate(
					seriesCb,
					[
						'Invalid encryptedSecret for publicKey:',
						encryptedItem.publicKey,
					].join(' ')
				);
			}

			var keypair = library.ed.makeKeypair(
				crypto
					.createHash('sha256')
					.update(secret, 'utf8')
					.digest()
			);

			if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
				return setImmediate(seriesCb, 'Public keys do not match');
			}

			modules.accounts.getAccount(
				{
					publicKey: keypair.publicKey.toString('hex'),
				},
				(err, account) => {
					if (err) {
						return setImmediate(seriesCb, err);
					}

					if (!account) {
						return setImmediate(
							seriesCb,
							[
								'Account with public key:',
								keypair.publicKey.toString('hex'),
								'not found',
							].join(' ')
						);
					}

					if (account.isDelegate) {
						__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
						library.logger.info(
							['Forging enabled on account:', account.address].join(' ')
						);
					} else {
						library.logger.warn(
							[
								'Account with public key:',
								keypair.publicKey.toString('hex'),
								'is not a delegate',
							].join(' ')
						);
					}

					return setImmediate(seriesCb);
				}
			);
		},
		cb
	);
};

// Public methods
/**
 * Updates the forging status of an account, valid actions are enable and disable.
 * @param {publicKey} publicKey - Public key of delegate.
 * @param {string} secretKey - Key used to decrypt encrypted passphrase.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
Delegates.prototype.toggleForgingStatus = function(publicKey, secretKey, cb) {
	var actionEnable = false;
	var actionDisable = false;

	var keypair;
	var encryptedList;
	var decryptedSecret;
	var encryptedItem;
	encryptedList = library.config.forging.secret;
	encryptedItem = _.find(encryptedList, item => item.publicKey === publicKey);

	if (encryptedItem) {
		try {
			decryptedSecret = __private.decryptSecret(
				encryptedItem.encryptedSecret,
				secretKey
			);
		} catch (e) {
			return setImmediate(cb, 'Invalid key and public key combination');
		}

		keypair = library.ed.makeKeypair(
			crypto
				.createHash('sha256')
				.update(decryptedSecret, 'utf8')
				.digest()
		);
	} else {
		return setImmediate(
			cb,
			['Delegate with publicKey:', publicKey, 'not found'].join(' ')
		);
	}

	if (keypair.publicKey.toString('hex') !== publicKey) {
		return setImmediate(cb, 'Invalid key and public key combination');
	}

	if (__private.keypairs[keypair.publicKey.toString('hex')]) {
		actionDisable = true;
	}

	if (!__private.keypairs[keypair.publicKey.toString('hex')]) {
		actionEnable = true;
	}

	modules.accounts.getAccount(
		{ publicKey: keypair.publicKey.toString('hex') },
		(err, account) => {
			if (err) {
				return setImmediate(cb, err);
			}

			if (account && account.isDelegate) {
				var forgingStatus;

				if (actionEnable) {
					__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
					forgingStatus = true;
					library.logger.info(`Forging enabled on account: ${account.address}`);
				}

				if (actionDisable) {
					delete __private.keypairs[keypair.publicKey.toString('hex')];
					forgingStatus = false;
					library.logger.info(
						`Forging disabled on account: ${account.address}`
					);
				}

				return setImmediate(cb, null, {
					publicKey: publicKey,
					forging: forgingStatus,
				});
			} else {
				return setImmediate(cb, 'Delegate not found');
			}
		}
	);
};

/**
 * Gets delegate list based on input function by vote and changes order.
 * @implements slots.calcRound
 * @param {number} height
 * @param {function} source - Source function for get delegates.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} err | truncated delegate list
 */
Delegates.prototype.generateDelegateList = function(height, source, cb) {
	// Set default function for getting delegates
	source = source || __private.getKeysSortByVote;

	source((err, truncDelegateList) => {
		if (err) {
			return setImmediate(cb, err);
		}

		var seedSource = slots.calcRound(height).toString();
		var currentSeed = crypto
			.createHash('sha256')
			.update(seedSource, 'utf8')
			.digest();

		for (var i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
			for (var x = 0; x < 4 && i < delCount; i++, x++) {
				var newIndex = currentSeed[x] % delCount;
				var b = truncDelegateList[newIndex];
				truncDelegateList[newIndex] = truncDelegateList[i];
				truncDelegateList[i] = b;
			}
			currentSeed = crypto
				.createHash('sha256')
				.update(currentSeed)
				.digest();
		}

		return setImmediate(cb, null, truncDelegateList);
	});
};

/**
 * Generates delegate list and checks if block generator public key matches delegate id.
 * @param {block} block
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error message | cb
 */
Delegates.prototype.validateBlockSlot = function(block, cb) {
	__private.validateBlockSlot(block, __private.getKeysSortByVote, cb);
};

/**
 * Generates delegate list and checks if block generator public key matches delegate id - against previous round.
 * @param {block} block
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error message | cb
 */
Delegates.prototype.validateBlockSlotAgainstPreviousRound = function(
	block,
	cb
) {
	__private.validateBlockSlot(
		block,
		__private.getDelegatesFromPreviousRound,
		cb
	);
};

/**
 * Gets a list of delegates:
 * - Calculating individual rate, rank, approval, productivity.
 * - Sorting based on query parameter.
 * @param {Object} query
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error| object with delegates ordered, offset, count, limit.
 * @todo Sort does not affect data? What is the impact?
 */
Delegates.prototype.getDelegates = function(query, cb) {
	if (!_.isObject(query)) {
		throw 'Invalid query argument, expected object';
	}
	if (query.search) {
		query.username = { $like: `%${query.search}%` };
		delete query.search;
	}
	query.isDelegate = 1;
	modules.accounts.getAccounts(
		query,
		[
			'username',
			'address',
			'publicKey',
			'vote',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'secondPublicKey',
			'rank',
			'approval',
			'productivity',
		],
		(err, delegates) => setImmediate(cb, err, delegates)
	);
};

/**
 * Gets a list forgers based on query parameters.
 * @implements modules.blocks.lastBlock.get
 * @param {Object} query - Query object.
 * @param {int} query.limit - Limit applied to results.
 * @param {int} query.offset - Offset value for results.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error| object
 */
Delegates.prototype.getForgers = function(query, cb) {
	query.limit = query.limit || 10;
	query.offset = query.offset || 0;

	var currentBlock = modules.blocks.lastBlock.get();
	var currentSlot = slots.getSlotNumber();
	var forgerKeys = [];

	self.generateDelegateList(
		currentBlock.height,
		null,
		(err, activeDelegates) => {
			if (err) {
				return setImmediate(cb, err);
			}

			for (
				var i = query.offset + 1;
				i <= slots.delegates && i <= query.limit + query.offset;
				i++
			) {
				if (activeDelegates[(currentSlot + i) % slots.delegates]) {
					forgerKeys.push(activeDelegates[(currentSlot + i) % slots.delegates]);
				}
			}

			library.db.delegates
				.getDelegatesByPublicKeys(forgerKeys)
				.then(rows => {
					rows.map(forger => {
						forger.nextSlot =
							activeDelegates.indexOf(forger.publicKey) + currentSlot + 1;

						return forger;
					});
					return setImmediate(cb, null, rows);
				})
				.catch(error => setImmediate(cb, error));
		}
	);
};

/**
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @return {function} Calls checkDelegates() with 'confirmed' state.
 */
Delegates.prototype.checkConfirmedDelegates = function(
	publicKey,
	votes,
	cb,
	tx
) {
	return __private.checkDelegates(publicKey, votes, 'confirmed', cb, tx);
};

/**
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @return {function} Calls checkDelegates() with 'unconfirmed' state.
 */
Delegates.prototype.checkUnconfirmedDelegates = function(
	publicKey,
	votes,
	cb,
	tx
) {
	return __private.checkDelegates(publicKey, votes, 'unconfirmed', cb, tx);
};

/**
 * Inserts a fork into 'forks_stat' table and emits a 'delegates/fork' socket signal with fork data: cause + block.
 * @param {block} block
 * @param {string} cause
 */
Delegates.prototype.fork = function(block, cause) {
	library.logger.info('Fork', {
		delegate: block.generatorPublicKey,
		block: {
			id: block.id,
			timestamp: block.timestamp,
			height: block.height,
			previousBlock: block.previousBlock,
		},
		cause: cause,
	});

	var fork = {
		delegatePublicKey: block.generatorPublicKey,
		blockTimestamp: block.timestamp,
		blockId: block.id,
		blockHeight: block.height,
		previousBlock: block.previousBlock,
		cause: cause,
	};

	library.db.delegates.insertFork(fork).then(() => {
		library.network.io.sockets.emit('delegates/fork', fork);
	});
};

/**
 * Get an object of key pairs for delegates enabled for forging.
 * @return {object} Of delegate key pairs.
 */
Delegates.prototype.getForgersKeyPairs = function() {
	return __private.keypairs;
};

// Events
/**
 * Calls Delegate.bind() with scope.
 * @implements module:delegates#Delegate~bind
 * @param {modules} scope - Loaded modules.
 */
Delegates.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		delegates: scope.delegates,
		loader: scope.loader,
		peers: scope.peers,
		rounds: scope.rounds,
		transactions: scope.transactions,
		transport: scope.transport,
	};

	__private.assetTypes[transactionTypes.DELEGATE].bind(scope.accounts);
};

/**
 * Loads delegates.
 * @implements module:transactions#Transactions~fillPool
 */
Delegates.prototype.onBlockchainReady = function() {
	__private.loaded = true;

	__private.loadDelegates(err => {
		function nextForge(cb) {
			if (err) {
				library.logger.error('Failed to load delegates', err);
			}

			async.series([__private.forge, modules.transactions.fillPool], () =>
				setImmediate(cb)
			);
		}

		jobsQueue.register('delegatesNextForge', nextForge, 1000);
	});
};

/**
 * Sets loaded to false.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Returns cb.
 */
Delegates.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Delegates.prototype.isLoaded = function() {
	return !!modules;
};

// Shared API
/**
 * @todo Implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Delegates.prototype.shared = {
	/**
	 * Search forgers based on the query parameters passed.
	 * @param {Object} filters - Filters applied to results.
	 * @param {int} filters.limit - Limit applied to results.
	 * @param {int} filters.offset - Offset value for results.
	 * @param {function} cb - Callback function.
	 * @returns {setImmediateCallbackObject}
	 */
	getForgers: function(filters, cb) {
		var lastBlock = modules.blocks.lastBlock.get();
		var lastBlockSlot = slots.getSlotNumber(lastBlock.timestamp);
		var currentSlot = slots.getSlotNumber();

		modules.delegates.getForgers(filters, (err, forgers) => {
			if (err) {
				return setImmediate(
					cb,
					new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR)
				);
			}

			return setImmediate(cb, null, {
				data: forgers,
				meta: {
					lastBlock: lastBlock.height,
					lastBlockSlot: lastBlockSlot,
					currentSlot: currentSlot,
				},
			});
		});
	},

	/**
	 * Search accounts based on the query parameters passed.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.address - Account address.
	 * @param {string} filters.publicKey - Public key associated to account.
	 * @param {string} filters.secondPublicKey - Second public key associated to account.
	 * @param {string} filters.username - Username associated to account.
	 * @param {string} filters.sort - Field to sort results by.
	 * @param {string} filters.search - Field to sort results by.
	 * @param {string} filters.rank - Field to sort results by.
	 * @param {int} filters.limit - Limit applied to results.
	 * @param {int} filters.offset - Offset value for results.
	 * @param {function} cb - Callback function.
	 * @returns {setImmediateCallbackObject}
	 */
	getDelegates: function(filters, cb) {
		modules.delegates.getDelegates(filters, (err, delegates) => {
			if (err) {
				return setImmediate(
					cb,
					new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR)
				);
			}
			return setImmediate(cb, null, delegates);
		});
	},
};

// Export
module.exports = Delegates;
