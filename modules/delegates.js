'use strict';

var _ = require('lodash');
var async = require('async');
var bignum = require('../helpers/bignum.js');
var BlockReward = require('../logic/blockReward.js');
var checkIpInList = require('../helpers/checkIpInList.js');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var Delegate = require('../logic/delegate.js');
var extend = require('extend');
var OrderBy = require('../helpers/orderBy.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/delegates.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/delegates.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};
__private.loaded = false;
__private.blockReward = new BlockReward();
__private.keypairs = {};
__private.tmpKeypairs = {};

// Constructor
function Delegates (cb, scope) {
	library = scope;
	self = this;

	__private.assetTypes[transactionTypes.DELEGATE] = library.logic.transaction.attachAssetType(
		transactionTypes.DELEGATE, new Delegate()
	);

	setImmediate(cb, null, self);
}

// Private methods
__private.getKeysSortByVote = function (cb) {
	modules.accounts.getAccounts({
		isDelegate: 1,
		sort: {'vote': -1, 'publicKey': 1},
		limit: slots.delegates
	}, ['publicKey'], function (err, rows) {
		if (err) {
			return setImmediate(cb, err);
		}
		return setImmediate(cb, null, rows.map(function (el) {
			return el.publicKey;
		}));
	});
};

__private.getBlockSlotData = function (slot, height, cb) {
	self.generateDelegateList(height, function (err, activeDelegates) {
		if (err) {
			return setImmediate(cb, err);
		}

		var currentSlot = slot;
		var lastSlot = slots.getLastSlot(currentSlot);

		for (; currentSlot < lastSlot; currentSlot += 1) {
			var delegate_pos = currentSlot % slots.delegates;
			var delegate_id = activeDelegates[delegate_pos];

			if (delegate_id && __private.keypairs[delegate_id]) {
				return setImmediate(cb, null, {time: slots.getSlotTime(currentSlot), keypair: __private.keypairs[delegate_id]});
			}
		}

		return setImmediate(cb, null, null);
	});
};

__private.forge = function (cb) {
	if (!Object.keys(__private.keypairs).length) {
		library.logger.debug('No delegates enabled');
		return __private.loadDelegates(cb);
	}

	// When client is not loaded, is syncing or round is ticking
	// Do not try to forge new blocks as client is not ready
	if (!__private.loaded || modules.loader.syncing() || !modules.rounds.loaded() || modules.rounds.ticking()) {
		library.logger.debug('Client not ready to forge');
		return setImmediate(cb);
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.getLastBlock();

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
					if (modules.transport.poorConsensus()) {
						return setImmediate(seriesCb, ['Inadequate broadhash consensus', modules.transport.consensus(), '%'].join(' '));
					} else {
						return setImmediate(seriesCb);
					}
				}
			}, function (err) {
				if (err) {
					library.logger.warn(err);
					return setImmediate(cb, err);
				} else {
					return modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time, cb);
				}
			});
		}, function (err) {
			if (err) {
				library.logger.error('Failed to generate block within delegate slot', err);
			} else {
				modules.blocks.lastReceipt(new Date());

				library.logger.info([
					'Forged new block id:',
					modules.blocks.getLastBlock().id,
					'height:', modules.blocks.getLastBlock().height,
					'round:', modules.rounds.calc(modules.blocks.getLastBlock().height),
					'slot:', slots.getSlotNumber(currentBlockData.time),
					'reward:' + modules.blocks.getLastBlock().reward
				].join(' '));
			}

			return setImmediate(cb);
		});
	});
};

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
				new Buffer(publicKey, 'hex');
			} catch (e) {
				library.logger.error(e.stack);
				return setImmediate(cb, 'Invalid public key');
			}

			if (math === '+' && (delegates != null && delegates.indexOf(publicKey) !== -1)) {
				return setImmediate(cb, 'Failed to add vote, account has already voted for this delegate');
			}

			if (math === '-' && (delegates === null || delegates.indexOf(publicKey) === -1)) {
				return setImmediate(cb, 'Failed to remove vote, account has not voted for this delegate');
			}

			modules.accounts.getAccount({ publicKey: publicKey, isDelegate: 1 }, function (err, account) {
				if (err) {
					return setImmediate(cb, err);
				}

				if (!account) {
					return setImmediate(cb, 'Delegate not found');
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

__private.loadDelegates = function (cb) {
	var secrets;

	if (library.config.forging.secret) {
		if (Array.isArray(library.config.forging.secret)) {
			secrets = library.config.forging.secret;
		} else {
			secrets = [library.config.forging.secret];
		}
	}

	if (!secrets || !secrets.length) {
		return setImmediate(cb);
	} else {
		library.logger.info(['Loading', secrets.length, 'delegates from config'].join(' '));
	}

	async.eachSeries(secrets, function (secret, cb) {
		var keypair = library.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());

		modules.accounts.getAccount({
			publicKey: keypair.publicKey.toString('hex')
		}, function (err, account) {
			if (err) {
				return setImmediate(cb, err);
			}

			if (!account) {
				return setImmediate(cb, ['Account with public key:', keypair.publicKey.toString('hex'), 'not found'].join(' '));
			}

			if (account.isDelegate) {
				__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
				library.logger.info(['Forging enabled on account:', account.address].join(' '));
			} else {
				library.logger.warn(['Account with public key:', keypair.publicKey.toString('hex'), 'is not a delegate'].join(' '));
			}

			return setImmediate(cb);
		});
	}, cb);
};

// Public methods
Delegates.prototype.generateDelegateList = function (height, cb) {
	__private.getKeysSortByVote(function (err, truncDelegateList) {
		if (err) {
			return setImmediate(cb, err);
		}

		var seedSource = modules.rounds.calc(height).toString();
		var currentSeed = crypto.createHash('sha256').update(seedSource, 'utf8').digest();

		for (var i = 0, delCount = truncDelegateList.length; i < delCount; i++) {
			for (var x = 0; x < 4 && i < delCount; i++, x++) {
				var newIndex = currentSeed[x] % delCount;
				var b = truncDelegateList[newIndex];
				truncDelegateList[newIndex] = truncDelegateList[i];
				truncDelegateList[i] = b;
			}
			currentSeed = crypto.createHash('sha256').update(currentSeed).digest();
		}

		return setImmediate(cb, null, truncDelegateList);
	});
};

Delegates.prototype.getDelegates = function (query, cb) {
	if (!query) {
		throw 'Missing query argument';
	}
	modules.accounts.getAccounts({
		isDelegate: 1,
		sort: { 'vote': -1, 'publicKey': 1 }
	}, ['username', 'address', 'publicKey', 'vote', 'missedblocks', 'producedblocks'], function (err, delegates) {
		if (err) {
			return setImmediate(cb, err);
		}

		var limit = query.limit || constants.activeDelegates;
		var offset = query.offset || 0;
		var active = query.active;

		limit = limit > constants.activeDelegates ? constants.activeDelegates : limit;

		var count = delegates.length;
		var length = Math.min(limit, count);
		var realLimit = Math.min(offset + limit, count);

		var lastBlock   = modules.blocks.getLastBlock(),
		    totalSupply = __private.blockReward.calcSupply(lastBlock.height);

		for (var i = 0; i < delegates.length; i++) {
			// TODO: 'rate' property is deprecated and need to be removed after transitional period
			delegates[i].rate = i + 1;
			delegates[i].rank = i + 1;
			delegates[i].approval = (delegates[i].vote / totalSupply) * 100;
			delegates[i].approval = Math.round(delegates[i].approval * 1e2) / 1e2;

			var percent = 100 - (delegates[i].missedblocks / ((delegates[i].producedblocks + delegates[i].missedblocks) / 100));
			percent = Math.abs(percent) || 0;

			var outsider = i + 1 > slots.delegates;
			delegates[i].productivity = (!outsider) ? Math.round(percent * 1e2) / 1e2 : 0;
		}

		var orderBy = OrderBy(query.orderBy, {quoteField: false});

		if (orderBy.error) {
			return setImmediate(cb, orderBy.error);
		}

		return setImmediate(cb, null, {
			delegates: delegates,
			sortField: orderBy.sortField,
			sortMethod: orderBy.sortMethod,
			count: count,
			offset: offset,
			limit: realLimit
		});
	});
};

Delegates.prototype.checkConfirmedDelegates = function (publicKey, votes, cb) {
	return __private.checkDelegates(publicKey, votes, 'confirmed', cb);
};

Delegates.prototype.checkUnconfirmedDelegates = function (publicKey, votes, cb) {
	return __private.checkDelegates(publicKey, votes, 'unconfirmed', cb);
};

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

Delegates.prototype.validateBlockSlot = function (block, cb) {
	self.generateDelegateList(block.height, function (err, activeDelegates) {
		if (err) {
			return setImmediate(cb, err);
		}

		var currentSlot = slots.getSlotNumber(block.timestamp);
		var delegate_id = activeDelegates[currentSlot % slots.delegates];
		// var nextDelegate_id = activeDelegates[(currentSlot + 1) % slots.delegates];
		// var previousDelegate_id = activeDelegates[(currentSlot - 1) % slots.delegates];

		if (delegate_id && block.generatorPublicKey === delegate_id) {
			return setImmediate(cb);
		} else {
			library.logger.error('Expected generator: ' + delegate_id + ' Received generator: ' + block.generatorPublicKey);
			return setImmediate(cb, 'Failed to verify slot: ' + currentSlot);
		}
	});
};

Delegates.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
};

// Events
Delegates.prototype.onBind = function (scope) {
	modules = scope;

	__private.assetTypes[transactionTypes.DELEGATE].bind({
		modules: modules, library: library
	});
};

Delegates.prototype.onBlockchainReady = function () {
	__private.loaded = true;

	__private.loadDelegates(function nextForge (err) {
		if (err) {
			library.logger.error('Failed to load delegates', err);
		}

		async.series([
			__private.forge,
			modules.transactions.fillPool
		], function (err) {
			return setTimeout(nextForge, 1000);
		});
	});
};

Delegates.prototype.cleanup = function (cb) {
	__private.loaded = false;
	return setImmediate(cb);
};

Delegates.prototype.isLoaded = function () {
	return !!modules;
};

Delegates.prototype.internal = {
	forgingEnable: function (req, cb) {
		library.schema.validate(req.body, schema.enableForging, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			var keypair = library.ed.makeKeypair(crypto.createHash('sha256').update(req.body.secret, 'utf8').digest());

			if (req.body.publicKey) {
				if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
					return setImmediate(cb, 'Invalid passphrase');
				}
			}

			if (__private.keypairs[keypair.publicKey.toString('hex')]) {
				return setImmediate(cb, 'Forging is already enabled');
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return setImmediate(cb, err);
				}
				if (account && account.isDelegate) {
					__private.keypairs[keypair.publicKey.toString('hex')] = keypair;
					library.logger.info('Forging enabled on account: ' + account.address);
					return setImmediate(cb, null, {address: account.address});
				} else {
					return setImmediate(cb, 'Delegate not found');
				}
			});
		});
	},

	forgingDisable: function (req, cb) {
		library.schema.validate(req.body, schema.disableForging, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			var keypair = library.ed.makeKeypair(crypto.createHash('sha256').update(req.body.secret, 'utf8').digest());

			if (req.body.publicKey) {
				if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
					return setImmediate(cb, 'Invalid passphrase');
				}
			}

			if (!__private.keypairs[keypair.publicKey.toString('hex')]) {
				return setImmediate(cb, 'Delegate not found');
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return setImmediate(cb, err);
				}
				if (account && account.isDelegate) {
					delete __private.keypairs[keypair.publicKey.toString('hex')];
					library.logger.info('Forging disabled on account: ' + account.address);
					return setImmediate(cb, null, {address: account.address});
				} else {
					return setImmediate(cb, 'Delegate not found');
				}
			});
		});
	},

	forgingStatus: function (req, cb) {
		if (!checkIpInList(library.config.forging.access.whiteList, req.ip)) {
			return setImmediate(cb, 'Access denied');
		}

		library.schema.validate(req.body, schema.forgingStatus, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			if (req.body.publicKey) {
				return setImmediate(cb, null, {enabled: !!__private.keypairs[req.body.publicKey]});
			} else {
				var delegates_cnt = _.keys(__private.keypairs).length;
				return setImmediate(cb, null, {enabled: delegates_cnt > 0, delegates: _.keys(__private.keypairs)});
			}
		});
	},

	forgingEnableAll: function (req, cb) {
		if (Object.keys(__private.tmpKeypairs).length === 0) {
			return setImmediate(cb, 'No delegate keypairs defined');
		}

		__private.keypairs = __private.tmpKeypairs;
		__private.tmpKeypairs = {};
		return setImmediate(cb);
	},

	forgingDisableAll: function (req, cb) {
		if (Object.keys(__private.tmpKeypairs).length !== 0) {
			return setImmediate(cb, 'Delegate keypairs are defined');
		}

		__private.tmpKeypairs = __private.keypairs;
		__private.keypairs = {};
		return setImmediate(cb);
	}
};

// Shared API
Delegates.prototype.shared = {
	getDelegate: function (req, cb) {
		library.schema.validate(req.body, schema.getDelegate, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			modules.delegates.getDelegates(req.body, function (err, data) {
				if (err) {
					return setImmediate(cb, err);
				}

				var delegate = _.find(data.delegates, function (delegate) {
					if (req.body.publicKey) {
						return delegate.publicKey === req.body.publicKey;
					} else if (req.body.username) {
						return delegate.username === req.body.username;
					}

					return false;
				});

				if (delegate) {
					return setImmediate(cb, null, {delegate: delegate});
				} else {
					return setImmediate(cb, 'Delegate not found');
				}
			});
		});
	},

	getNextForgers: function (req, cb) {
		var currentBlock = modules.blocks.getLastBlock ();
		var limit = req.body.limit || 10;

		modules.delegates.generateDelegateList(currentBlock.height, function (err, activeDelegates) {
			if (err) {
				return setImmediate(cb, err);
			}

			var currentBlockSlot = slots.getSlotNumber(currentBlock.timestamp);
			var currentSlot = slots.getSlotNumber();
			var nextForgers = [];

			for (var i = 1; i <= slots.delegates && i <= limit; i++) {
				if (activeDelegates[(currentSlot + i) % slots.delegates]) {
					nextForgers.push (activeDelegates[(currentSlot + i) % slots.delegates]);
				}
			}

			return setImmediate(cb, null, {currentBlock: currentBlock.height, currentBlockSlot: currentBlockSlot, currentSlot: currentSlot, delegates: nextForgers});
		});
	},

	search: function (req, cb) {
		library.schema.validate(req.body, schema.search, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			var orderBy = OrderBy(
				req.body.orderBy, {
					sortFields: sql.sortFields,
					sortField: 'username'
				}
			);

			if (orderBy.error) {
				return setImmediate(cb, orderBy.error);
			}

			library.db.query(sql.search({
				q: req.body.q,
				limit: req.body.limit || 100,
				sortField: orderBy.sortField,
				sortMethod: orderBy.sortMethod
			})).then(function (rows) {
				return setImmediate(cb, null, {delegates: rows});
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Database search failed');
			});
		});
	},

	count: function (req, cb) {
		library.db.one(sql.count).then(function (row) {
			return setImmediate(cb, null, { count: row.count });
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Failed to count delegates');
		});
	},

	getVoters: function (req, cb) {
		library.schema.validate(req.body, schema.getVoters, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			library.db.one(sql.getVoters, { publicKey: req.body.publicKey }).then(function (row) {
				var addresses = (row.accountIds) ? row.accountIds : [];

				modules.accounts.getAccounts({
					address: { $in: addresses },
					sort: 'balance'
				}, ['address', 'balance', 'username', 'publicKey'], function (err, rows) {
					if (err) {
						return setImmediate(cb, err);
					} else {
						return setImmediate(cb, null, {accounts: rows});
					}
				});
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Failed to get voters for delegate: ' + req.body.publicKey);
			});
		});
	},

	getDelegates: function (req, cb) {
		library.schema.validate(req.body, schema.getDelegates, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			modules.delegates.getDelegates(req.body, function (err, data) {
				if (err) {
					return setImmediate(cb, err);
				}

				function compareNumber (a, b) {
					var sorta = parseFloat(a[data.sortField]);
					var sortb = parseFloat(b[data.sortField]);
					if (data.sortMethod === 'ASC') {
						return sorta - sortb;
					} else {
				 	return sortb - sorta;
					}
				}

				function compareString (a, b) {
					var sorta = a[data.sortField];
					var sortb = b[data.sortField];
					if (data.sortMethod === 'ASC') {
				  return sorta.localeCompare(sortb);
					} else {
				  return sortb.localeCompare(sorta);
					}
				}

				if (data.sortField) {
					// TODO: 'rate' property is deprecated and need to be removed after transitional period
					if (['approval', 'productivity', 'rate', 'rank', 'vote'].indexOf(data.sortField) > -1) {
						data.delegates = data.delegates.sort(compareNumber);
					} else if (['username', 'address', 'publicKey'].indexOf(data.sortField) > -1) {
						data.delegates = data.delegates.sort(compareString);
					} else {
						return setImmediate(cb, 'Invalid sort field');
					}
				}

				var delegates = data.delegates.slice(data.offset, data.limit);

				return setImmediate(cb, null, {delegates: delegates, totalCount: data.count});
			});
		});
	},

	getFee: function (req, cb) {
		return setImmediate(cb, null, {fee: constants.fees.delegate});
	},

	getForgedByAccount: function (req, cb) {
		library.schema.validate(req.body, schema.getForgedByAccount, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			if (req.body.start !== undefined || req.body.end !== undefined) {
				modules.blocks.aggregateBlocksReward({generatorPublicKey: req.body.generatorPublicKey, start: req.body.start, end: req.body.end}, function (err, reward) {
					if (err) {
						return setImmediate(cb, err);
					}

					var forged = new bignum(reward.fees).plus(new bignum(reward.rewards)).toString();
					return setImmediate(cb, null, {fees: reward.fees, rewards: reward.rewards, forged: forged, count: reward.count});
				});
			} else {
				modules.accounts.getAccount({publicKey: req.body.generatorPublicKey}, ['fees', 'rewards'], function (err, account) {
					if (err || !account) {
						return setImmediate(cb, err || 'Account not found');
					}

					var forged = new bignum(account.fees).plus(new bignum(account.rewards)).toString();
					return setImmediate(cb, null, {fees: account.fees, rewards: account.rewards, forged: forged});
				});
			}
		});
	},

	addDelegate: function (req, cb) {
		library.schema.validate(req.body, schema.addDelegate, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			var hash = crypto.createHash('sha256').update(req.body.secret, 'utf8').digest();
			var keypair = library.ed.makeKeypair(hash);

			if (req.body.publicKey) {
				if (keypair.publicKey.toString('hex') !== req.body.publicKey) {
					return setImmediate(cb, 'Invalid passphrase');
				}
			}

			library.balancesSequence.add(function (cb) {
				if (req.body.multisigAccountPublicKey && req.body.multisigAccountPublicKey !== keypair.publicKey.toString('hex')) {
					modules.accounts.getAccount({publicKey: req.body.multisigAccountPublicKey}, function (err, account) {
						if (err) {
							return setImmediate(cb, err);
						}

						if (!account || !account.publicKey) {
							return setImmediate(cb, 'Multisignature account not found');
						}

						if (!account.multisignatures || !account.multisignatures) {
							return setImmediate(cb, 'Account does not have multisignatures enabled');
						}

						if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
							return setImmediate(cb, 'Account does not belong to multisignature group');
						}

						modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
							if (err) {
								return setImmediate(cb, err);
							}

							if (!requester || !requester.publicKey) {
								return setImmediate(cb, 'Requester not found');
							}

							if (requester.secondSignature && !req.body.secondSecret) {
								return setImmediate(cb, 'Missing requester second passphrase');
							}

							if (requester.publicKey === account.publicKey) {
								return setImmediate(cb, 'Invalid requester public key');
							}

							var secondKeypair = null;

							if (requester.secondSignature) {
								var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
								secondKeypair = library.ed.makeKeypair(secondHash);
							}

							var transaction;

							try {
								transaction = library.logic.transaction.create({
									type: transactionTypes.DELEGATE,
									username: req.body.username,
									sender: account,
									keypair: keypair,
									secondKeypair: secondKeypair,
									requester: keypair
								});
							} catch (e) {
								return setImmediate(cb, e.toString());
							}
							modules.transactions.receiveTransactions([transaction], true, cb);
						});
					});
				} else {
					modules.accounts.setAccountAndGet({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
						if (err) {
							return setImmediate(cb, err);
						}

						if (!account || !account.publicKey) {
							return setImmediate(cb, 'Account not found');
						}

						if (account.secondSignature && !req.body.secondSecret) {
							return setImmediate(cb, 'Invalid second passphrase');
						}

						var secondKeypair = null;

						if (account.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(req.body.secondSecret, 'utf8').digest();
							secondKeypair = library.ed.makeKeypair(secondHash);
						}

						var transaction;

						try {
							transaction = library.logic.transaction.create({
								type: transactionTypes.DELEGATE,
								username: req.body.username,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair
							});
						} catch (e) {
							return setImmediate(cb, e.toString());
						}
						modules.transactions.receiveTransactions([transaction], true, cb);
					});
				}
			}, function (err, transaction) {
				if (err) {
					return setImmediate(cb, err);
				} else {
					return setImmediate(cb, null, {transaction: transaction[0]});
				}
			});
		});
	}
};

// Export
module.exports = Delegates;
