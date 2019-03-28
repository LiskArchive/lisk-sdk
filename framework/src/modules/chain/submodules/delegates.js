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

const crypto = require('crypto');
const _ = require('lodash');
const async = require('async');
const { promisify } = require('util');
const {
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
} = require('@liskhq/lisk-cryptography');
const BlockReward = require('../logic/block_reward');
const jobsQueue = require('../helpers/jobs_queue');
const Delegate = require('../logic/delegate');
const slots = require('../helpers/slots');

// Private fields
let modules;
let library;
let self;

const { ACTIVE_DELEGATES, TRANSACTION_TYPES } = global.constants;
const exceptions = global.exceptions;
const __private = {};

__private.assetTypes = {};
__private.loaded = false;
__private.keypairs = {};
__private.tmpKeypairs = {};
__private.forgeInterval = 1000;
__private.delegatesListCache = {};

/**
 * Main delegates methods. Initializes library with scope content and generates a Delegate instance.
 * Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires crypto
 * @requires lodash
 * @requires helpers/jobs_queue
 * @requires helpers/slots
 * @requires logic/block_reward
 * @requires logic/delegate
 * @param {scope} scope - App instance
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, self
 */
class Delegates {
	constructor(cb, scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
			sequence: scope.sequence,
			ed: scope.ed,
			storage: scope.components.storage,
			network: scope.network,
			schema: scope.schema,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
			},
			config: {
				forging: {
					delegates: scope.config.forging.delegates,
					force: scope.config.forging.force,
					defaultPassword: scope.config.forging.defaultPassword,
					access: {
						whiteList: scope.config.forging.access.whiteList,
					},
				},
			},
		};
		self = this;
		__private.blockReward = new BlockReward();
		__private.assetTypes[
			TRANSACTION_TYPES.DELEGATE
		] = library.logic.transaction.attachAssetType(
			TRANSACTION_TYPES.DELEGATE,
			new Delegate({
				schema: scope.schema,
			})
		);

		setImmediate(cb, null, self);
	}
}

/**
 * Caches delegate list for last 2 rounds.
 *
 * @private
 * @param {number} round - Round Number
 * @param {array} delegatesList - Delegate list
 */
__private.updateDelegateListCache = function(round, delegatesList) {
	library.logger.debug('Updating delegate list cache for round', round);
	__private.delegatesListCache[round] = delegatesList;
	// We want to cache delegates for only last 2 rounds and get rid of old ones
	__private.delegatesListCache = Object.keys(__private.delegatesListCache)
		// sort round numbers in ascending order so we can have most recent 2 rounds at the end of the list.
		.sort((a, b) => a - b)
		// delete all round cache except last two rounds.
		.slice(-2)
		.reduce((acc, current) => {
			acc[current] = __private.delegatesListCache[current];
			return acc;
		}, {});
};

/**
 * Invalidates the cached delegate list.
 *
 */
Delegates.prototype.clearDelegateListCache = function() {
	library.logger.debug('Clearing delegate list cache.');
	// We want to clear the cache.
	__private.delegatesListCache = {};
};

/**
 * Gets delegate public keys sorted by vote descending.
 *
 * @private
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
__private.getKeysSortByVote = function(cb, tx) {
	modules.accounts.getAccounts(
		{
			isDelegate: true,
			sort: ['vote:desc', 'publicKey:asc'],
			limit: ACTIVE_DELEGATES,
		},
		['publicKey'],
		(err, rows) => {
			if (err) {
				return setImmediate(cb, err);
			}
			return setImmediate(cb, null, rows.map(el => el.publicKey));
		},
		tx
	);
};

/**
 * Gets delegate public keys from previous round, sorted by vote descending.
 *
 * @private
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
__private.getDelegatesFromPreviousRound = function(cb, tx) {
	library.storage.entities.Round.getDelegatesSnapshot(ACTIVE_DELEGATES, tx)
		.then(rows => {
			const delegatesPublicKeys = rows.map(({ publicKey }) => publicKey);
			return setImmediate(cb, null, delegatesPublicKeys);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'getDelegatesSnapshot database query failed');
		});
};

/**
 * Generates delegate list and checks if block generator publicKey matches delegate id.
 *
 * @param {block} block
 * @param {function} source - Source function for get delegates
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.validateBlockSlot = function(block, source, cb) {
	const round = slots.calcRound(block.height);
	self.generateDelegateList(round, source, (err, activeDelegates) => {
		if (err) {
			return setImmediate(cb, err);
		}

		const currentSlot = slots.getSlotNumber(block.timestamp);
		const delegateId = activeDelegates[currentSlot % ACTIVE_DELEGATES];

		if (delegateId && block.generatorPublicKey === delegateId) {
			return setImmediate(cb);
		}
		library.logger.error(
			`Expected generator: ${delegateId} Received generator: ${
				block.generatorPublicKey
			}`
		);
		return setImmediate(cb, `Failed to verify slot: ${currentSlot}`);
	});
};

/**
 * Gets the assigned delegate to current slot and returns its keypair if present.
 *
 * @private
 * @param {number} slot
 * @param {number} round
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, {time, keypair}
 * @todo Add description for the params
 */
__private.getDelegateKeypairForCurrentSlot = function(currentSlot, round, cb) {
	self.generateDelegateList(
		round,
		null,
		(generateDelegateListErr, activeDelegates) => {
			if (generateDelegateListErr) {
				return setImmediate(cb, generateDelegateListErr);
			}

			const currentSlotIndex = currentSlot % ACTIVE_DELEGATES;
			const currentSlotDelegate = activeDelegates[currentSlotIndex];

			if (currentSlotDelegate && __private.keypairs[currentSlotDelegate]) {
				return setImmediate(cb, null, __private.keypairs[currentSlotDelegate]);
			}

			return setImmediate(cb, null, null);
		}
	);
};

/**
 * Gets peers, checks consensus and generates new block, once delegates
 * are enabled, client is ready to forge and is the correct slot.
 *
 * @private
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
__private.forge = function(cb) {
	if (!Object.keys(__private.keypairs).length) {
		library.logger.debug('No delegates enabled');
		return setImmediate(cb);
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

	const currentSlot = slots.getSlotNumber();
	const lastBlock = modules.blocks.lastBlock.get();

	if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
		library.logger.debug('Block already forged for the current slot');
		return setImmediate(cb);
	}

	// We calculate round using height + 1, because we want the delegate keypair for next block to be forged
	const round = slots.calcRound(lastBlock.height + 1);

	return __private.getDelegateKeypairForCurrentSlot(
		currentSlot,
		round,
		(getDelegateKeypairForCurrentSlotError, delegateKeypair) => {
			if (getDelegateKeypairForCurrentSlotError) {
				library.logger.error(
					'Skipping delegate slot',
					getDelegateKeypairForCurrentSlotError
				);
				return setImmediate(cb);
			}

			if (delegateKeypair === null) {
				library.logger.debug('Waiting for delegate slot', {
					currentSlot: slots.getSlotNumber(),
				});
				return setImmediate(cb);
			}

			if (modules.transport.poorConsensus()) {
				const consensusErr = `Inadequate broadhash consensus before forging a block: ${modules.peers.getLastConsensus()} %`;
				library.logger.error(
					'Failed to generate block within delegate slot',
					consensusErr
				);
				return setImmediate(cb);
			}

			library.logger.info(
				`Broadhash consensus before forging a block: ${modules.peers.getLastConsensus()} %`
			);

			return modules.blocks.process.generateBlock(
				delegateKeypair,
				slots.getSlotTime(currentSlot),
				blockGenerationErr => {
					if (blockGenerationErr) {
						library.logger.error(
							'Failed to generate block within delegate slot',
							blockGenerationErr
						);

						return setImmediate(cb);
					}

					const forgedBlock = modules.blocks.lastBlock.get();
					modules.blocks.lastReceipt.update();

					library.logger.info(
						`Forged new block id: ${forgedBlock.id} height: ${
							forgedBlock.height
						} round: ${slots.calcRound(
							forgedBlock.height
						)} slot: ${slots.getSlotNumber(forgedBlock.timestamp)} reward: ${
							forgedBlock.reward
						}`
					);

					return setImmediate(cb);
				}
			);
		}
	);
};

/**
 * Returns the decrypted passphrase by deciphering encrypted passphrase with the password provided using aes-256-gcm algorithm.
 *
 * @private
 * @param {string} encryptedPassphrase
 * @param {string} password
 * @throws {error} If unable to decrypt using password.
 * @returns {string} Decrypted passphrase
 * @todo Add description for the params
 */
__private.decryptPassphrase = function(encryptedPassphrase, password) {
	return decryptPassphraseWithPassword(
		parseEncryptedPassphrase(encryptedPassphrase),
		password
	);
};

/**
 * Checks each vote integrity and controls total votes don't exceed active delegates.
 * Calls modules.accounts.getAccount() to validate delegate account and votes accounts.
 *
 * @private
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {string} state - 'confirmed' to delegates, otherwise u_delegates
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.checkDelegates = function(senderPublicKey, votes, state, cb, tx) {
	if (!Array.isArray(votes)) {
		return setImmediate(cb, 'Votes must be an array');
	}

	let votesWithAction;

	try {
		// TODO: Use Hashmap to improve performance further.
		votesWithAction = votes.map(vote => {
			const action = vote[0];

			if (action !== '+' && action !== '-') {
				throw 'Invalid math operator';
			}
			const votePublicKey = vote.slice(1);

			return {
				action,
				publicKey: votePublicKey,
			};
		});
	} catch (e) {
		library.logger.error(e.stack);
		return setImmediate(cb, e);
	}

	return async.waterfall(
		[
			// get all  public keys of delegates sender has voted for. Confirmed or unconfirmed based on state parameter.
			function getExistingVotedPublicKeys(waterfallCb) {
				modules.accounts.getAccount(
					{ publicKey: senderPublicKey },
					(err, account) => {
						if (err) {
							return setImmediate(waterfallCb, err);
						}

						if (!account) {
							return setImmediate(waterfallCb, 'Account not found');
						}

						const delegates =
							state === 'confirmed'
								? account.votedDelegatesPublicKeys
								: account.u_votedDelegatesPublicKeys;
						const existingVotedPublicKeys = Array.isArray(delegates)
							? delegates
							: [];

						return setImmediate(waterfallCb, null, existingVotedPublicKeys);
					},
					tx
				);
			},
			// Validate votes in the transaction by checking that sender is not voting for an account already, and also that sender is not unvoting an account it did not vote before.
			function validateVotes(existingVotedPublicKeys, waterfallCb) {
				modules.accounts.getAccounts(
					{
						publicKey_in: votesWithAction.map(({ publicKey }) => publicKey),
						isDelegate: true,
						sort: 'address:desc',
					},
					(err, votesAccounts) => {
						if (err) {
							return setImmediate(waterfallCb, err);
						}

						if (
							!votesAccounts ||
							votesAccounts.length < votesWithAction.length
						) {
							library.logger.error(
								'Delegates with addresses not found',
								_.differenceWith(
									votesWithAction,
									votesAccounts,
									(
										{ publicKey: publicKeyFromTransaction },
										{ publicKey: publicKeyFromAccount }
									) => publicKeyFromTransaction === publicKeyFromAccount
								).map(({ publicKey }) => publicKey)
							);
							return setImmediate(waterfallCb, 'Delegate not found');
						}
						const upvoteAccounts = votesAccounts.filter(voteAccount =>
							votesWithAction.find(
								({ action, publicKey }) =>
									action === '+' && publicKey === voteAccount.publicKey
							)
						);
						const downvoteAccounts = votesAccounts.filter(voteAccount =>
							votesWithAction.find(
								({ action, publicKey }) =>
									action === '-' && publicKey === voteAccount.publicKey
							)
						);

						const invalidUpvoteAccounts = _.intersectionWith(
							upvoteAccounts,
							existingVotedPublicKeys,
							({ publicKey: upvoteAccountPublicKey }, existingVotedPublicKey) =>
								upvoteAccountPublicKey === existingVotedPublicKey
						);

						if (invalidUpvoteAccounts.length > 0) {
							return setImmediate(
								waterfallCb,
								`Failed to add vote, delegate "${
									invalidUpvoteAccounts[0].username
								}" already voted for`
							);
						}

						const invalidDownvoteAccounts = _.differenceWith(
							downvoteAccounts,
							existingVotedPublicKeys,
							(
								{ publicKey: downvoteAccountPubicKey },
								existingVotedPublicKey
							) => downvoteAccountPubicKey === existingVotedPublicKey
						);
						if (invalidDownvoteAccounts.length > 0) {
							return setImmediate(
								waterfallCb,
								`Failed to remove vote, delegate "${
									invalidDownvoteAccounts[0].username
								}" was not voted for`
							);
						}

						const existingVotes = existingVotedPublicKeys.length;
						const upvotes = upvoteAccounts.length;
						const downvotes = downvoteAccounts.length;
						const totalVotes = existingVotes + upvotes - downvotes;

						if (totalVotes > ACTIVE_DELEGATES) {
							const exceeded = totalVotes - ACTIVE_DELEGATES;

							return setImmediate(
								waterfallCb,
								`Maximum number of ${ACTIVE_DELEGATES} votes exceeded (${exceeded} too many)`
							);
						}
						return setImmediate(waterfallCb);
					},
					tx
				);
			},
		],
		cb
	);
};

/**
 * Loads delegates from config and stores in private `keypairs`.
 *
 * @private
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
__private.loadDelegates = function(cb) {
	const encryptedList = library.config.forging.delegates;

	if (
		!encryptedList ||
		!encryptedList.length ||
		!library.config.forging.force ||
		!library.config.forging.defaultPassword
	) {
		return setImmediate(cb);
	}
	library.logger.info(
		`Loading ${
			encryptedList.length
		} delegates using encrypted passphrases from config`
	);

	return async.eachSeries(
		encryptedList,
		(encryptedItem, seriesCb) => {
			let passphrase;
			try {
				passphrase = __private.decryptPassphrase(
					encryptedItem.encryptedPassphrase,
					library.config.forging.defaultPassword
				);
			} catch (error) {
				return setImmediate(
					seriesCb,
					`Invalid encryptedPassphrase for publicKey: ${
						encryptedItem.publicKey
					}. ${error.message}`
				);
			}

			const keypair = library.ed.makeKeypair(
				crypto
					.createHash('sha256')
					.update(passphrase, 'utf8')
					.digest()
			);

			if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
				return setImmediate(
					seriesCb,
					`Invalid encryptedPassphrase for publicKey: ${
						encryptedItem.publicKey
					}. Public keys do not match`
				);
			}

			return modules.accounts.getAccount(
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
							`Account with public key: ${keypair.publicKey.toString(
								'hex'
							)} not found`
						);
					}
					if (account.isDelegate) {
						__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
						library.logger.info(
							`Forging enabled on account: ${account.address}`
						);
					} else {
						library.logger.warn(
							`Account with public key: ${keypair.publicKey.toString(
								'hex'
							)} is not a delegate`
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
 *
 * @param {publicKey} publicKey - Public key of delegate
 * @param {string} password - Password used to decrypt encrypted passphrase
 * @param {boolean} forging - Forging status of a delegate to update
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 * @todo Add description for the return value
 */
Delegates.prototype.updateForgingStatus = async function(
	publicKey,
	password,
	forging
) {
	const encryptedList = library.config.forging.delegates;
	const encryptedItem = encryptedList.find(
		item => item.publicKey === publicKey
	);

	let keypair;
	let passphrase;

	if (encryptedItem) {
		try {
			passphrase = __private.decryptPassphrase(
				encryptedItem.encryptedPassphrase,
				password
			);
		} catch (e) {
			throw new Error('Invalid password and public key combination');
		}

		keypair = library.ed.makeKeypair(
			crypto
				.createHash('sha256')
				.update(passphrase, 'utf8')
				.digest()
		);
	} else {
		throw new Error(`Delegate with publicKey: ${publicKey} not found`);
	}

	if (keypair.publicKey.toString('hex') !== publicKey) {
		throw new Error('Invalid password and public key combination');
	}

	const account = await promisify(modules.accounts.getAccount)({
		publicKey: keypair.publicKey.toString('hex'),
	});

	if (account && account.isDelegate) {
		if (forging) {
			__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
			library.logger.info(`Forging enabled on account: ${account.address}`);
		} else {
			delete __private.keypairs[keypair.publicKey.toString('hex')];
			library.logger.info(`Forging disabled on account: ${account.address}`);
		}

		return {
			publicKey,
			forging,
		};
	}
	throw new Error('Delegate not found');
};

/**
 * Gets delegate list based on input function by vote and changes order.
 *
 * @param {number} round
 * @param {function} source - Source function for get delegates
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @returns {setImmediateCallback} cb, err, truncated delegate list
 * @todo Add description for the params
 */
Delegates.prototype.generateDelegateList = function(round, source, cb, tx) {
	// Set default function for getting delegates
	source = source || __private.getKeysSortByVote;

	if (__private.delegatesListCache[round]) {
		library.logger.debug('Using delegate list from the cache for round', round);
		return setImmediate(cb, null, __private.delegatesListCache[round]);
	}

	return source((err, truncDelegateList) => {
		if (err) {
			return setImmediate(cb, err);
		}

		const seedSource = round.toString();
		let currentSeed = crypto
			.createHash('sha256')
			.update(seedSource, 'utf8')
			.digest();

		for (let i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
			for (let x = 0; x < 4 && i < delCount; i++, x++) {
				const newIndex = currentSeed[x] % delCount;
				const b = truncDelegateList[newIndex];
				truncDelegateList[newIndex] = truncDelegateList[i];
				truncDelegateList[i] = b;
			}
			currentSeed = crypto
				.createHash('sha256')
				.update(currentSeed)
				.digest();
		}

		// If the round is not an exception, cache the round.
		if (!exceptions.ignoreDelegateListCacheForRounds.includes(round)) {
			__private.updateDelegateListCache(round, truncDelegateList);
		}
		return setImmediate(cb, null, truncDelegateList);
	}, tx);
};

/**
 * Generates delegate list and checks if block generator public key matches delegate id.
 *
 * @param {block} block
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
Delegates.prototype.validateBlockSlot = function(block, cb) {
	__private.validateBlockSlot(block, __private.getKeysSortByVote, cb);
};

/**
 * Generates delegate list and checks if block generator public key matches delegate id - against previous round.
 *
 * @param {block} block
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
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
 * - Calculating individual rank, approval, productivity.
 * - Sorting based on query parameter.
 *
 * @param {Object} query
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err, object with ordered delegates, offset, count, limit
 * @todo Sort does not affect data? What is the impact?
 */
Delegates.prototype.getDelegates = function(query, cb) {
	if (!_.isObject(query)) {
		throw 'Invalid query argument, expected object';
	}
	if (query.search) {
		query.username_like = `%${query.search}%`;
		delete query.search;
	}
	query.isDelegate = true;
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
 * Description of checkConfirmedDelegates.
 *
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @returns {function} Calls checkDelegates() with 'confirmed' state
 * @todo Add description for the params
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
 * Description of checkUnconfirmedDelegates.
 *
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @returns {function} Calls checkDelegates() with 'unconfirmed' state
 * @todo Add description for the params
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
 *
 * @param {block} block
 * @param {string} cause
 * @todo Add description for the params
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
		cause,
	});

	const fork = {
		delegatePublicKey: block.generatorPublicKey,
		blockTimestamp: block.timestamp,
		blockId: block.id,
		blockHeight: block.height,
		previousBlockId: block.previousBlock,
		cause,
	};

	library.storage.entities.Account.insertFork(fork).then(() => {
		library.channel.publish('chain:delegates:fork', fork);
	});
};

/**
 * Get an object of key pairs for delegates enabled for forging.
 *
 * @returns {object} Of delegate key pairs
 */
Delegates.prototype.getForgersKeyPairs = function() {
	return __private.keypairs;
};

// Events
/**
 * Calls Delegate.bind() with scope.
 *
 * @param {modules} scope - Loaded modules
 */
Delegates.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.modules.accounts,
		blocks: scope.modules.blocks,
		delegates: scope.modules.delegates,
		loader: scope.modules.loader,
		peers: scope.modules.peers,
		rounds: scope.modules.rounds,
		transactions: scope.modules.transactions,
		transport: scope.modules.transport,
	};

	__private.assetTypes[TRANSACTION_TYPES.DELEGATE].bind(scope.modules.accounts);
};

/**
 * Forge the next block and then fill the transaction pool.
 * Registered by jobs queue every __private.forgeInterval.
 *
 * @private
 * @param {function} cb - Callback function
 */
__private.nextForge = function(cb) {
	async.series([modules.transactions.fillPool, __private.forge], cb);
};

/**
 * Loads delegates.
 */
Delegates.prototype.onBlockchainReady = function() {
	__private.loaded = true;

	__private.loadDelegates(err => {
		if (err) {
			library.logger.error('Failed to load delegates', err);
		}

		jobsQueue.register(
			'delegatesNextForge',
			cb => {
				library.sequence.add(sequenceCb => {
					__private.nextForge(sequenceCb);
				}, cb);
			},
			__private.forgeInterval
		);
	});
};

/**
 * Sets loaded to false.
 *
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb
 */
Delegates.prototype.cleanup = function(cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded
 */
Delegates.prototype.isLoaded = function() {
	return !!modules;
};

// Export
module.exports = Delegates;
