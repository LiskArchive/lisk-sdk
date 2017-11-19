'use strict';

var _ = require('lodash');
var async = require('async');
var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var bignum = require('../helpers/bignum.js');
var BlockReward = require('../logic/blockReward.js');
var checkIpInList = require('../helpers/checkIpInList.js');
var constants = require('../helpers/constants.js');
var jobsQueue = require('../helpers/jobsQueue.js');
var crypto = require('crypto');
var Delegate = require('../logic/delegate.js');
var extend = require('extend');
var sortBy = require('../helpers/sort_by.js').sortBy;
var schema = require('../schema/delegates.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/delegates.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.loaded = false;
__private.keypairs = {};
__private.tmpKeypairs = {};
__private.delegatesList = [];

/**
 * Initializes library with scope content and generates a Delegate instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:delegates
 * @class
 * @classdesc Main delegates methods.
 * @param {scope} scope - App instance.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
// Constructor
function Delegates (cb, scope) {
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
	__private.assetTypes[transactionTypes.DELEGATE] = library.logic.transaction.attachAssetType(
		transactionTypes.DELEGATE,
		new Delegate(
			scope.schema
		)
	);

	setImmediate(cb, null, self);
}

/**
 * Gets slot time and keypair.
 * @private
 * @param {number} slot
 * @param {number} height
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error | cb | object {time, keypair}.
 */
__private.getBlockSlotData = function (slot, height, cb) {
	var currentSlot = slot;
	var lastSlot = slots.getLastSlot(currentSlot);

	for (; currentSlot < lastSlot; currentSlot += 1) {
		var delegate_pos = currentSlot % slots.delegates;
		var delegate_id = __private.delegatesList[delegate_pos];

		if (delegate_id && __private.keypairs[delegate_id]) {
			return setImmediate(cb, null, {time: slots.getSlotTime(currentSlot), keypair: __private.keypairs[delegate_id]});
		}
	}

	return setImmediate(cb, null, null);
};

/**
 * Gets peers, checks consensus and generates new block, once delegates
 * are enabled, client is ready to forge and is the correct slot.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.forge = function (cb) {
	if (!Object.keys(__private.keypairs).length) {
		library.logger.debug('No delegates enabled');
		return __private.loadDelegates(cb);
	}

	// When client is not loaded, is syncing or round is ticking
	// Do not try to forge new blocks as client is not ready
	if (!__private.loaded || modules.loader.syncing()) {
		library.logger.debug('Client not ready to forge');
		return setImmediate(cb);
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.lastBlock.get();

	if (currentSlot === slots.getSlotNumber(lastBlock.timestamp)) {
		library.logger.debug('Waiting for next delegate slot');
		return setImmediate(cb);
	}

	__private.getBlockSlotData(currentSlot, lastBlock.height + 1, function (err, currentBlockData) {
		if (err || currentBlockData === null) {
			library.logger.warn('Skipping delegate slot', err);
			return setImmediate(cb);
		}

		if (slots.getSlotNumber(currentBlockData.time) !== slots.getSlotNumber()) {
			library.logger.debug('Delegate slot', slots.getSlotNumber());
			return setImmediate(cb);
		}

		library.sequence.add(function (cb) {
			async.series({
				getPeers: function (seriesCb) {
					return modules.transport.getPeers({limit: constants.maxPeers}, seriesCb);
				},
				checkBroadhash: function (seriesCb) {
					var consensus = modules.peers.getConsensus();
					if (modules.transport.poorConsensus(consensus)) {
						return setImmediate(seriesCb, ['Inadequate broadhash consensus', consensus, '%'].join(' '));
					} else {
						return setImmediate(seriesCb);
					}
				}
			}, function (err) {
				if (err) {
					library.logger.warn(err);
					return setImmediate(cb, err);
				} else {
					return modules.blocks.process.generateBlock(currentBlockData.keypair, currentBlockData.time, cb);
				}
			});
		}, function (err) {
			if (err) {
				library.logger.error('Failed to generate block within delegate slot', err);
			} else {
				var forgedBlock = modules.blocks.lastBlock.get();
				modules.blocks.lastReceipt.update();

				library.logger.info([
					'Forged new block id:', forgedBlock.id,
					'height:', forgedBlock.height,
					'round:', slots.calcRound(forgedBlock.height),
					'slot:', slots.getSlotNumber(currentBlockData.time),
					'reward:' + forgedBlock.reward
				].join(' '));
			}

			return setImmediate(cb);
		});
	});
};

/**
 * Returns the decrypted secret by deciphering encrypted secret with the key provided
 * using aes-256-cbc algorithm.
 * @private
 * @param {string} encryptedSecret
 * @param {string} key
 * @returns {string} decryptedSecret
 * @throws {error} if unable to decrypt using key
 */
__private.decryptSecret = function (encryptedSecret, key) {
	var decipher = crypto.createDecipher('aes-256-cbc', key);
	var decryptedSecret =	decipher.update(encryptedSecret, 'hex', 'utf8');
	decryptedSecret += decipher.final('utf8');
	return decryptedSecret;
};

/**
 * Updates the forging status of an account, valid actions are enable and disable.
 * @private
 * @param {publicKey} publicKey - PublicKey
 * @param {string} secretKey - key used to decrypt encrypted passphrase
 * @param {function} cb
 * @returns {setImmediateCallback}
 */
__private.toggleForgingStatus = function (publicKey, secretKey, cb) {
	var actionEnable = false;
	var actionDisable = false;

	var keypair;
	var encryptedList, decryptedSecret, encryptedItem;
	encryptedList = library.config.forging.secret;
	encryptedItem = _.find(encryptedList, function (item) {
		return item.publicKey === publicKey;
	});

	if (!!encryptedItem) {
		try {
			decryptedSecret = __private.decryptSecret(encryptedItem.encryptedSecret, secretKey);
		} catch (e) {
			return setImmediate(cb, 'Invalid key and public key combination');
		}

		keypair = library.ed.makeKeypair(crypto.createHash('sha256').update(decryptedSecret, 'utf8').digest());
	} else {
		return setImmediate(cb, ['Delegate with publicKey:', publicKey, 'not found'].join(' '));
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

	modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (account && account.isDelegate) {
			var forgingStatus;

			if (actionEnable) {
				__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
				forgingStatus = true;
				library.logger.info('Forging enabled on account: ' + account.address);
			}

			if (actionDisable) {
				delete __private.keypairs[keypair.publicKey.toString('hex')];
				forgingStatus = false;
				library.logger.info('Forging disabled on account: ' + account.address);
			}

			return setImmediate(cb, null, {
				publicKey: publicKey,
				forging: forgingStatus
			});
		} else {
			return setImmediate(cb, 'Delegate not found');
		}
	});
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

__private.checkDelegates = function (publicKey, votes, state, cb) {
	if (!Array.isArray(votes)) {
		return setImmediate(cb, 'Votes must be an array');
	}

	modules.accounts.getAccount({publicKey: publicKey}, function (err, account) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (!account) {
			return setImmediate(cb, 'Account not found');
		}

		var delegates = (state === 'confirmed') ? account.delegates : account.u_delegates;
		var existing_votes = Array.isArray(delegates) ? delegates.length : 0;
		var additions = 0, removals = 0;

		async.eachSeries(votes, function (action, cb) {
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

			modules.accounts.getAccount({ publicKey: publicKey, isDelegate: 1 }, function (err, account) {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!account) {
					return setImmediate(cb, 'Delegate not found');
				}

				if (math === '+' && (delegates != null && delegates.indexOf(publicKey) !== -1)) {
					return setImmediate(cb, 'Failed to add vote, delegate "' + account.username + '" already voted for');
				}

				if (math === '-' && (delegates === null || delegates.indexOf(publicKey) === -1)) {
					return setImmediate(cb, 'Failed to remove vote, delegate "' + account.username + '" was not voted for');
				}

				return setImmediate(cb);
			});
		}, function (err) {
			if (err) {
				return setImmediate(cb, err);
			}

			var total_votes = (existing_votes + additions) - removals;

			if (total_votes > constants.activeDelegates) {
				var exceeded = total_votes - constants.activeDelegates;

				return setImmediate(cb, 'Maximum number of ' + constants.activeDelegates + ' votes exceeded (' + exceeded + ' too many)');
			} else {
				return setImmediate(cb);
			}
		});
	});
};

/**
 * Loads delegates from config and stores in private `keypairs`.
 * @private
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback}
 */
__private.loadDelegates = function (cb) {

	var secretsList = library.config.forging.secret;

	if (!secretsList || !secretsList.length || !library.config.forging.force || !library.config.forging.defaultKey) {
		return setImmediate(cb);
	} else {
		library.logger.info(['Loading', secretsList.length, 'delegates using encrypted secrets from config'].join(' '));
	}

	async.eachSeries(secretsList, function (encryptedItem, seriesCb) {
		var secret;
		try {
			secret = __private.decryptSecret(encryptedItem.encryptedSecret, library.config.forging.defaultKey);
		} catch (e) {
			return setImmediate(seriesCb, ['Invalid encryptedSecret for publicKey:', encryptedItem.publicKey].join(' '));
		}

		var keypair = library.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());

		if (keypair.publicKey.toString('hex') !== encryptedItem.publicKey) {
			return setImmediate(seriesCb, 'Public keys do not match');
		}

		modules.accounts.getAccount({
			publicKey: keypair.publicKey.toString('hex')
		}, function (err, account) {
			if (err) {
				return setImmediate(seriesCb, err);
			}

			if (!account) {
				return setImmediate(seriesCb, ['Account with public key:', keypair.publicKey.toString('hex'), 'not found'].join(' '));
			}

			if (account.isDelegate) {
				__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
				library.logger.info(['Forging enabled on account:', account.address].join(' '));
			} else {
				library.logger.warn(['Account with public key:', keypair.publicKey.toString('hex'), 'is not a delegate'].join(' '));
			}

			return setImmediate(seriesCb);
		});
	}, cb);
};

// Public methods

/**
 * Get delegates list for current round.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} err
 */
Delegates.prototype.generateDelegateList = function (cb) {
	library.db.query(sql.delegateList).then(function (result) {
		__private.delegatesList = result[0].list;
		return setImmediate(cb);
	}).catch(function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Gets delegates and for each one calculates rate, rank, approval, productivity.
 * sorts delegates as per criteria.
 * @param {Object} query
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error| object with delegates ordered, offset, count, limit.
 * @todo sort does not affects data? What is the impact?.
 */
Delegates.prototype.getDelegates = function (query, cb) {
	if (!_.isObject(query)) {
		throw 'Invalid query argument, expected object';
	}
	if (query.search) {
		query.username = {$like: '%' + query.search + '%'};
		delete query.search;
	}
	query.isDelegate = 1;
	modules.accounts.getAccounts(query, [
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
		'productivity'
	], function (err, delegates) {
		return setImmediate(cb, err, delegates);
	});
};

/**
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @return {function} Calls checkDelegates() with 'confirmed' state.
 */
Delegates.prototype.checkConfirmedDelegates = function (publicKey, votes, cb) {
	return __private.checkDelegates(publicKey, votes, 'confirmed', cb);
};

/**
 * @param {publicKey} publicKey
 * @param {Array} votes
 * @param {function} cb
 * @return {function} Calls checkDelegates() with 'unconfirmed' state.
 */
Delegates.prototype.checkUnconfirmedDelegates = function (publicKey, votes, cb) {
	return __private.checkDelegates(publicKey, votes, 'unconfirmed', cb);
};

/**
 * Inserts a fork into 'forks_stat' table and emits a 'delegates/fork' socket signal
 * with fork data: cause + block.
 * @param {block} block
 * @param {string} cause
 */
Delegates.prototype.fork = function (block, cause) {
	library.logger.info('Fork', {
		delegate: block.generatorPublicKey,
		block: { id: block.id, timestamp: block.timestamp, height: block.height, previousBlock: block.previousBlock },
		cause: cause
	});

	var fork = {
		delegatePublicKey: block.generatorPublicKey,
		blockTimestamp: block.timestamp,
		blockId: block.id,
		blockHeight: block.height,
		previousBlock: block.previousBlock,
		cause: cause
	};

	library.db.none(sql.insertFork, fork).then(function () {
		library.network.io.sockets.emit('delegates/fork', fork);
	});
};

/**
 * Generates delegate list and checks if block generator public Key
 * matches delegate id.
 * @param {block} block
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} error message | cb
 */
Delegates.prototype.validateBlockSlot = function (block, cb) {
	var currentSlot = slots.getSlotNumber(block.timestamp);
	var delegate_id = __private.delegatesList[currentSlot % slots.delegates];

	if (delegate_id && block.generatorPublicKey === delegate_id) {
		return setImmediate(cb);
	} else {
		library.logger.error('Expected generator: ' + delegate_id + ' Received generator: ' + block.generatorPublicKey);
		return setImmediate(cb, 'Failed to verify slot: ' + currentSlot);
	}
};

// Events
/**
 * Calls Delegate.bind() with scope.
 * @implements module:delegates#Delegate~bind
 * @param {modules} scope - Loaded modules.
 */
Delegates.prototype.onBind = function (scope) {
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		delegates: scope.delegates,
		loader: scope.loader,
		peers: scope.peers,
		transactions: scope.transactions,
		transport: scope.transport
	};

	__private.assetTypes[transactionTypes.DELEGATE].bind(
		scope.accounts
	);
};

/**
 * Triggered on receiving notification from postgres, indicating round has changed.
 *
 * @public
 * @method onRoundChanged
 * @listens module:pg-notify~event:roundChanged
 * @param {Object} data Data received from postgres
 * @param {Object} data.round Current round
 * @param {Object} data.list Delegates list used for slot calculations
 */
Delegates.prototype.onRoundChanged = function (data) {
	__private.delegatesList = data.list;
	library.network.io.sockets.emit('rounds/change', {number: data.round});
	library.logger.info('Round changed, current round', data.round);
};

/**
 * Loads delegates.
 * @implements module:transactions#Transactions~fillPool
 */
Delegates.prototype.onBlockchainReady = function () {
	__private.loaded = true;

	async.waterfall([
		__private.loadDelegates,
		self.generateDelegateList
	], function (err) {
		function nextForge (cb) {
			if (err) {
				library.logger.error('Failed to load delegates', err);
			}

			async.waterfall([
				__private.forge,
				modules.transactions.fillPool
			], function () {
				return setImmediate(cb);
			});
		}

		jobsQueue.register('delegatesNextForge', nextForge, 1000);
	});
};

/**
 * Sets loaded to false.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Returns cb.
 */
Delegates.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
Delegates.prototype.isLoaded = function () {
	return !!modules;
};

// Internal API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Delegates.prototype.internal = {
	forgingStatus: function (req, cb) {
		if (!checkIpInList(library.config.forging.access.whiteList, req.ip)) {
			return setImmediate(cb, new ApiError('Access denied', apiCodes.FORBIDDEN));
		}

		library.schema.validate(req.body, schema.forgingStatus, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.INTERNAL_SERVER_ERROR));
			}

			if (req.body.publicKey) {
				return setImmediate(cb, null, {enabled: !!__private.keypairs[req.body.publicKey]});
			} else {
				var delegates_cnt = _.keys(__private.keypairs).length;
				return setImmediate(cb, null, {enabled: delegates_cnt > 0, delegates: _.keys(__private.keypairs)});
			}
		});
	},
	forgingToggle: function (req, cb) {
		if (!checkIpInList(library.config.forging.access.whiteList, req.ip)) {
			return setImmediate(cb, new ApiError('Access denied', apiCodes.FORBIDDEN));
		}

		library.schema.validate(req.body, schema.toggleForging, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.INTERNAL_SERVER_ERROR));
			}

			__private.toggleForgingStatus(req.body.publicKey, req.body.key, function (err, res) {
				if (err) {
					return setImmediate(cb, new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
				}
				return setImmediate(cb, null, res);
			});
		});
	}
};

// Shared API
/**
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
Delegates.prototype.shared = {

	getForgers: function (req, cb) {
		var currentBlock = modules.blocks.lastBlock.get();
		var limit = req.body.limit || 10;

		var currentBlockSlot = slots.getSlotNumber(currentBlock.timestamp);
		var currentSlot = slots.getSlotNumber();
		var nextForgers = [];

		for (var i = 1; i <= slots.delegates && i <= limit; i++) {
			if (__private.delegatesList[(currentSlot + i) % slots.delegates]) {
				nextForgers.push(__private.delegatesList[(currentSlot + i) % slots.delegates]);
			}
		}

		return setImmediate(cb, null, {currentBlock: currentBlock.height, currentBlockSlot: currentBlockSlot, currentSlot: currentSlot, delegates: nextForgers});
	},

	getDelegates: function (req, cb) {
		library.schema.validate(req.body, schema.getDelegates, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.BAD_REQUEST));
			}
			modules.delegates.getDelegates(req.body, function (err, delegates) {
				if (err) {
					return setImmediate(cb, new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
				}
				return setImmediate(cb, null, {delegates: delegates, count: delegates.length});
			});
		});
	}
};

// Export
module.exports = Delegates;
