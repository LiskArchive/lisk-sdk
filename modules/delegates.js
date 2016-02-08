var crypto = require('crypto'),
	extend = require('extend'),
	ed = require('ed25519'),
	async = require('async'),
	shuffle = require('knuth-shuffle').knuthShuffle,
	Router = require('../helpers/router.js'),
	slots = require('../helpers/slots.js'),
	schedule = require('node-schedule'),
	util = require('util'),
	constants = require('../helpers/constants.js'),
	TransactionTypes = require('../helpers/transaction-types.js'),
	MilestoneBlocks = require("../helpers/milestoneBlocks.js"),
	errorCode = require('../helpers/errorCodes.js').error,
	sandboxHelper = require('../helpers/sandbox.js');

require('array.prototype.find'); // Old node fix

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;

private.keypairs = {};

function Delegate() {
	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = 0;
		trs.asset.delegate = {
			username: data.username || data.sender.username,
			publicKey: data.sender.publicKey
		};

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return 100 * constants.fixedPoint;
	}

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId) {
			return setImmediate(cb, errorCode("DELEGATES.INVALID_RECIPIENT", trs));
		}

		if (trs.amount != 0) {
			return setImmediate(cb, errorCode("DELEGATES.INVALID_AMOUNT", trs));
		}

		if (!sender.username) {
			if (!trs.asset.delegate.username) {
				return setImmediate(cb, errorCode("DELEGATES.EMPTY_TRANSACTION_ASSET", trs));
			}

			var allowSymbols = /^[a-z0-9!@$&_.]+$/g;
			if (!allowSymbols.test(trs.asset.delegate.username.toLowerCase())) {
				return setImmediate(cb, errorCode("DELEGATES.USERNAME_CHARS", trs));
			}

			var isAddress = /^[0-9]+c$/g;
			if (isAddress.test(trs.asset.delegate.username.toLowerCase())) {
				return setImmediate(cb, errorCode("DELEGATES.USERNAME_LIKE_ADDRESS", trs));
			}

			if (trs.asset.delegate.username.length < 1) {
				return setImmediate(cb, errorCode("DELEGATES.USERNAME_IS_TOO_SHORT", trs));
			}

			if (trs.asset.delegate.username.length > 20) {
				return setImmediate(cb, errorCode("DELEGATES.USERNAME_IS_TOO_LONG", trs));
			}
		} else {
			if (trs.asset.delegate.username && trs.asset.delegate.username != sender.username) {
				return cb(errorCode("USERNAMES.ALREADY_HAVE_USERNAME"));
			}
		}

		if (sender.isDelegate) {
			return cb(errorCode("DELEGATES.EXISTS_DELEGATE"));
		}

		if (sender.username) {
			return cb(null, trs);
		}

		modules.accounts.getAccount({
			username: trs.asset.delegate.username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb(errorCode("DELEGATES.EXISTS_USERNAME", trs));
			}

			cb(null, trs);
		});
	}

	this.process = function (trs, sender, cb) {
		setImmediate(cb, null, trs);
	}

	this.getBytes = function (trs) {
		if (!trs.asset.delegate.username) {
			return null;
		}
		try {
			var buf = new Buffer(trs.asset.delegate.username, 'utf8');
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	}

	this.apply = function (trs, block, sender, cb) {
		var data = {
			address: sender.address,
			u_isDelegate: 0,
			isDelegate: 1,
			vote: 0
		}

		if (!sender.nameexist && trs.asset.delegate.username) {
			data.u_username = null;
			data.username = trs.asset.delegate.username;
		}

		modules.accounts.setAccountAndGet(data, cb);
	}

	this.undo = function (trs, block, sender, cb) {
		var data = {
			address: sender.address,
			u_isDelegate: 1,
			isDelegate: 0,
			vote: 0
		}

		if (!sender.nameexist && trs.asset.delegate.username) {
			data.username = null;
			data.u_username = trs.asset.delegate.username;
		}

		modules.accounts.setAccountAndGet(data, cb);
	}

	this.applyUnconfirmed = function (trs, sender, cb) {
		if (sender.u_username && trs.asset.delegate.username && trs.asset.delegate.username != sender.u_username) {
			return cb(errorCode("USERNAMES.ALREADY_HAVE_USERNAME"));
		}

		if (sender.u_isDelegate) {
			return cb(errorCode("DELEGATES.EXISTS_DELEGATE"));
		}

		function done() {
			var data = {
				address: sender.address,
				u_isDelegate: 1,
				isDelegate: 0
			}

			if (!sender.nameexist && trs.asset.delegate.username) {
				data.username = null;
				data.u_username = trs.asset.delegate.username;
			}

			modules.accounts.setAccountAndGet(data, cb);
		}

		if (sender.username) {
			return done();
		}

		modules.accounts.getAccount({
			u_username: trs.asset.delegate.username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb(errorCode("DELEGATES.EXISTS_USERNAME"));
			}

			done();
		});
	}

	this.undoUnconfirmed = function (trs, sender, cb) {
		var data = {
			address: sender.address,
			u_isDelegate: 0,
			isDelegate: 0
		}

		if (!sender.nameexist && trs.asset.delegate.username) {
			data.username = null;
			data.u_username = null;
		}

		modules.accounts.setAccountAndGet(data, cb);
	}

	this.objectNormalize = function (trs) {
		var report = library.scheme.validate(trs.asset.delegate, {
			type: "object",
			properties: {
				publicKey: {
					type: "string",
					format: "publicKey"
				}
			},
			required: ["publicKey"]
		});

		if (!report) {
			throw Error("Can't verify delegate transaction, incorrect parameters: " + library.scheme.getLastError());
		}

		return trs;
	}

	this.dbRead = function (raw) {
		if (!raw.d_username) {
			return null;
		} else {
			var delegate = {
				username: raw.d_username,
				publicKey: raw.t_senderPublicKey,
				address: raw.t_senderId
			}

			return {delegate: delegate};
		}
	}

	this.dbSave = function (trs, cb) {
		library.dbLite.query("INSERT INTO delegates(username, transactionId) VALUES($username, $transactionId)", {
			username: trs.asset.delegate.username,
			transactionId: trs.id
		}, cb);
	}

	this.ready = function (trs, sender) {
		if (sender.multisignatures.length) {
			if (!trs.signatures) {
				return false;
			}
			return trs.signatures.length >= sender.multimin - 1;
		} else {
			return true;
		}
	}
}

// Constructor
function Delegates(cb, scope) {
	library = scope;
	self = this;
	self.__private = private;
	private.attachApi();

	library.logic.transaction.attachAssetType(TransactionTypes.DELEGATE, new Delegate());

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules && private.loaded) return next();
		res.status(500).send({success: false, error: errorCode('COMMON.LOADING')});
	});

	router.map(shared, {
		"get /voters": "getVoters",
		"get /get": "getDelegate",
		"get /": "getDelegates",
		"get /fee": "getFee",
		"get /forging/getForgedByAccount": "getForgedByAccount",
		"put /": "addDelegate"
	});

	if (process.env.DEBUG) {
		var tmpKepairs = {};

		router.get('/forging/disableAll', function (req, res) {
			if (Object.keys(tmpKepairs).length != 0) {
				return res.json({success: false});
			}

			tmpKepairs = private.keypairs;
			private.keypairs = {};
			return res.json({success: true});
		});

		router.get('/forging/enableAll', function (req, res) {
			if (Object.keys(tmpKepairs).length == 0) {
				return res.json({success: false});
			}

			private.keypairs = tmpKepairs;
			tmpKepairs = {};
			return res.json({success: true});
		});
	}

	router.post('/forging/enable', function (req, res) {
		var body = req.body;
		library.scheme.validate(body, {
			type: "object",
			properties: {
				secret: {
					type: "string",
					minLength: 1,
					maxLength: 100
				},
				publicKey: {
					type: "string",
					format: "publicKey"
				}
			},
			required: ["secret"]
		}, function (err) {
			if (err) {
				return res.json({success: false, error: err[0].message});
			}

			var ip = req.connection.remoteAddress;

			if (library.config.forging.access.whiteList.length > 0 && library.config.forging.access.whiteList.indexOf(ip) < 0) {
				return res.json({success: false, error: errorCode("COMMON.ACCESS_DENIED")});
			}

			var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

			if (body.publicKey) {
				if (keypair.publicKey.toString('hex') != body.publicKey) {
					return res.json({success: false, error: errorCode("COMMON.INVALID_SECRET_KEY")});
				}
			}

			if (private.keypairs[keypair.publicKey.toString('hex')]) {
				return res.json({success: false, error: errorCode("COMMON.FORGING_ALREADY_ENABLED")});
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return res.json({success: false, error: err.toString()});
				}
				if (account && account.isDelegate) {
					private.keypairs[keypair.publicKey.toString('hex')] = keypair;
					return res.json({success: true, address: account.address});
					library.logger.info("Forging enabled on account: " + account.address);
				} else {
					return res.json({success: false, error: errorCode("DELEGATES.DELEGATE_NOT_FOUND")});
				}
			});
		});
	});

	router.post('/forging/disable', function (req, res) {
		var body = req.body;
		library.scheme.validate(body, {
			type: "object",
			properties: {
				secret: {
					type: "string",
					minLength: 1,
					maxLength: 100
				},
				publicKey: {
					type: "string",
					format: "publicKey"
				}
			},
			required: ["secret"]
		}, function (err) {
			if (err) {
				return res.json({success: false, error: err[0].message});
			}

			var ip = req.connection.remoteAddress;

			if (library.config.forging.access.whiteList.length > 0 && library.config.forging.access.whiteList.indexOf(ip) < 0) {
				return res.json({success: false, error: errorCode("COMMON.ACCESS_DENIED")});
			}

			var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

			if (body.publicKey) {
				if (keypair.publicKey.toString('hex') != body.publicKey) {
					return res.json({success: false, error: errorCode("COMMON.INVALID_SECRET_KEY")});
				}
			}

			if (!private.keypairs[keypair.publicKey.toString('hex')]) {
				return res.json({success: false, error: errorCode("DELEGATES.FORGER_NOT_FOUND")});
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return res.json({success: false, error: err.toString()});
				}
				if (account && account.isDelegate) {
					delete private.keypairs[keypair.publicKey.toString('hex')];
					return res.json({success: true, address: account.address});
					library.logger.info("Forging disabled on account: " + account.address);
				} else {
					return res.json({success: false, error: errorCode("DELEGATES.FORGER_NOT_FOUND")});
				}
			});
		});
	});

	router.get('/forging/status', function (req, res) {
		var query = req.query;
		library.scheme.validate(query, {
			type: "object",
			properties: {
				publicKey: {
					type: "string",
					format: "publicKey"
				}
			},
			required: ["publicKey"]
		}, function (err) {
			if (err) {
				return res.json({success: false, error: err[0].message});
			}

			return res.json({success: true, enabled: !!private.keypairs[query.publicKey]});
		});
	});

	/*router.map(private, {
	 "post /forging/enable": "enableForging",
	 "post /forging/disable": "disableForging",
	 "get /forging/status": "statusForging"
	 });*/

	library.network.app.use('/api/delegates', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err.toString());
		res.status(500).send({success: false, error: err.toString()});
	});
}

private.getKeysSortByVote = function (cb) {
	modules.accounts.getAccounts({
		isDelegate: 1,
		sort: {"vote": -1, "publicKey": 1},
		limit: slots.delegates
	}, ["publicKey"], function (err, rows) {
		if (err) {
			cb(err)
		}
		cb(null, rows.map(function (el) {
			return el.publicKey
		}))
	});
}

private.getBlockSlotData = function (slot, height, cb) {
	self.generateDelegateList(height, function (err, activeDelegates) {
		if (err) {
			return cb(err);
		}
		var currentSlot = slot;
		var lastSlot = slots.getLastSlot(currentSlot);

		for (; currentSlot < lastSlot; currentSlot += 1) {
			var delegate_pos = currentSlot % slots.delegates;

			var delegate_id = activeDelegates[delegate_pos];

			if (delegate_id && private.keypairs[delegate_id]) {
				return cb(null, {time: slots.getSlotTime(currentSlot), keypair: private.keypairs[delegate_id]});
			}
		}
		cb(null, null);
	});
}

private.loop = function (cb) {
	if (!Object.keys(private.keypairs).length) {
		library.logger.debug('loop', 'exit: have no delegates');
		return setImmediate(cb);
	}

	if (!private.loaded || modules.loader.syncing() || !modules.round.loaded()) {
		// library.logger.log('loop', 'exit: syncing');
		return setImmediate(cb);
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.getLastBlock();

	if (currentSlot == slots.getSlotNumber(lastBlock.timestamp)) {
		// library.logger.log('loop', 'exit: lastBlock is in the same slot');
		return setImmediate(cb);
	}

	private.getBlockSlotData(currentSlot, lastBlock.height + 1, function (err, currentBlockData) {
		if (err || currentBlockData === null) {
			library.logger.log('loop', 'skip slot');
			return setImmediate(cb);
		}

		library.sequence.add(function (cb) {
			if (slots.getSlotNumber(currentBlockData.time) == slots.getSlotNumber()) {
				modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time, function (err) {
					library.logger.log('Round ' + modules.round.calc(modules.blocks.getLastBlock().height) + ' new block id: ' + modules.blocks.getLastBlock().id + ' height: ' + modules.blocks.getLastBlock().height + ' slot: ' + slots.getSlotNumber(currentBlockData.time) + ' reward: ' + modules.blocks.getLastBlock().reward)
					cb(err);
				});
			} else {
				// library.logger.log('loop', 'exit: ' + _activeDelegates[slots.getSlotNumber() % slots.delegates] + ' delegate slot');
				setImmediate(cb);
			}
		}, function (err) {
			if (err) {
				library.logger.error("Problem in block generation", err);
			}
			setImmediate(cb);
		});
	});
}

private.loadMyDelegates = function (cb) {
	var secrets = null;
	if (library.config.forging.secret) {
		secrets = util.isArray(library.config.forging.secret) ? library.config.forging.secret : [library.config.forging.secret];
	}

	async.eachSeries(secrets, function (secret, cb) {
		var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());

		modules.accounts.getAccount({
			publicKey: keypair.publicKey.toString('hex')
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (!account) {
				return cb("Account " + keypair.publicKey.toString('hex') + " not found");
			}

			if (account.isDelegate) {
				private.keypairs[keypair.publicKey.toString('hex')] = keypair;
				library.logger.info("Forging enabled on account: " + account.address);
			} else {
				library.logger.info("Forger with this public key not found " + keypair.publicKey.toString('hex'));
			}
			cb();
		});
	}, cb);
}

// Public methods
Delegates.prototype.generateDelegateList = function (height, cb) {
	private.getKeysSortByVote(function (err, truncDelegateList) {
		if (err) {
			return cb(err);
		}
		var seedSource = modules.round.calc(height).toString();

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

		cb(null, truncDelegateList);
	});

}

Delegates.prototype.checkDelegates = function (publicKey, votes, cb) {
	if (util.isArray(votes)) {
		modules.accounts.getAccount({publicKey: publicKey}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (!account) {
				return cb("Account not found");
			}

			async.eachSeries(votes, function (action, cb) {
				var math = action[0];

				if (math !== '+' && math !== '-') {
					return cb("Wrong math");
				}

				var publicKey = action.slice(1);

				try {
					new Buffer(publicKey, "hex");
				} catch (e) {
					return cb("wrong public key");
				}

				if (math == "+" && (account.delegates !== null && account.delegates.indexOf(publicKey) != -1)) {
					return cb("Can't verify votes, you already voted for this delegate");
				}
				if (math == "-" && (account.delegates === null || account.delegates.indexOf(publicKey) === -1)) {
					return cb("Can't verify votes, you had no votes for this delegate");
				}

				modules.accounts.getAccount({publicKey: publicKey, isDelegate: 1}, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account) {
						return cb("Your delegate not found");
					}

					cb();
				});
			}, cb)
		});
	} else {
		setImmediate(cb, "Provide array of votes");
	}
}

Delegates.prototype.checkUnconfirmedDelegates = function (publicKey, votes, cb) {
	if (util.isArray(votes)) {
		modules.accounts.getAccount({publicKey: publicKey}, function (err, account) {
			if (err) {
				return cb(err);
			}
			if (!account) {
				return cb("Account not found");
			}

			async.eachSeries(votes, function (action, cb) {
				var math = action[0];

				if (math !== '+' && math !== '-') {
					return cb("Wrong math");
				}

				var publicKey = action.slice(1);


				try {
					new Buffer(publicKey, "hex");
				} catch (e) {
					return cb("wrong public key");
				}

				if (math == "+" && (account.u_delegates !== null && account.u_delegates.indexOf(publicKey) != -1)) {
					return cb("Can't verify votes, you already voted for this delegate");
				}
				if (math == "-" && (account.u_delegates === null || account.u_delegates.indexOf(publicKey) === -1)) {
					return cb("Can't verify votes, you had no votes for this delegate");
				}

				modules.accounts.getAccount({publicKey: publicKey, isDelegate: 1}, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account) {
						return cb("Your delegate not found");
					}

					cb();
				});
			}, cb)
		});
	} else {
		return setImmediate(cb, "Provide array of votes");
	}
}

Delegates.prototype.fork = function (block, cause) {
	library.logger.info('fork', {
		delegate: block.generatorPublicKey,
		block: {id: block.id, timestamp: block.timestamp, height: block.height, previousBlock: block.previousBlock},
		cause: cause
	});
	library.dbLite.query("INSERT INTO forks_stat (delegatePublicKey, blockTimestamp, blockId, blockHeight, previousBlock, cause) " +
		"VALUES ($delegatePublicKey, $blockTimestamp, $blockId, $blockHeight, $previousBlock, $cause);", {
		delegatePublicKey: block.generatorPublicKey,
		blockTimestamp: block.timestamp,
		blockId: block.id,
		blockHeight: block.height,
		previousBlock: block.previousBlock,
		cause: cause
	});
}

Delegates.prototype.validateBlockSlot = function (block, cb) {
	self.generateDelegateList(block.height, function (err, activeDelegates) {
		if (err) {
			return cb(err);
		}
		var currentSlot = slots.getSlotNumber(block.timestamp);
		var delegate_id = activeDelegates[currentSlot % slots.delegates];
		var nextDelegate_id = activeDelegates[(currentSlot + 1) % slots.delegates];
		var previousDelegate_id = activeDelegates[(currentSlot - 1) % slots.delegates];

		if (delegate_id && block.generatorPublicKey == delegate_id) {
			return cb();
		}

		cb("Can't verify slot");
	});
}

Delegates.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Delegates.prototype.onBind = function (scope) {
	modules = scope;
}

Delegates.prototype.onBlockchainReady = function () {
	private.loaded = true;

	private.loadMyDelegates(function nextLoop(err) {
		if (err) {
			library.logger.error("Can`t load delegates", err);
		}

		private.loop(function () {
			setTimeout(nextLoop, 1000);
		});

	});
}

Delegates.prototype.cleanup = function (cb) {
	private.loaded = false;
	cb();
}

// Shared
shared.getDelegate = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			transactionId: {
				type: "string"
			},
			publicKey: {
				type: "string"
			},
			username: {
				type: "string"
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		modules.accounts.getAccounts({
			isDelegate: 1,
			sort: {"vote": -1, "publicKey": 1}
		}, ["username", "address", "publicKey", "vote", "missedblocks", "producedblocks", "virgin"], function (err, delegates) {
			if (err) {
				return cb(err.toString());
			}

			var limit = query.limit || 101,
				offset = query.offset || 0,
				orderField = query.orderBy,
				active = query.active;

			orderField = orderField ? orderField.split(':') : null;
			limit = limit > 101 ? 101 : limit;
			var orderBy = orderField ? orderField[0] : null;
			var sortMode = orderField && orderField.length == 2 ? orderField[1] : 'asc';
			var count = delegates.length;
			var length = Math.min(limit, count);
			var realLimit = Math.min(offset + limit, count);

			for (var i = 0; i < delegates.length; i++) {
				delegates[i].rate = i + 1;

				var percent = 100 - (delegates[i].missedblocks / ((delegates[i].producedblocks + delegates[i].missedblocks) / 100));
				percent = percent || 0;
				var outsider = i + 1 > slots.delegates && delegates[i].virgin;
				delegates[i].productivity = !outsider ? delegates[i].virgin ? 0 : parseFloat(Math.floor(percent * 100) / 100).toFixed(2) : null
			}

			var delegate = delegates.find(function (delegate) {
				if (query.transactionId) {
					// TODO: Store transactionId
				}
				if (query.publicKey) {
					return delegate.publicKey == query.publicKey;
				}
				if (query.username) {
					return delegate.username == query.username;
				}

				return false;
			});

			if (delegate) {
				cb(null, {delegate: delegate});
			} else {
				cb(errorCode("DELEGATES.DELEGATE_NOT_FOUND"));
			}
		});
	});
}

shared.getVoters = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			publicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ['publicKey']
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		library.dbLite.query("select GROUP_CONCAT(accountId) from mem_accounts2delegates where dependentId = $publicKey", {
			publicKey: query.publicKey
		}, ['accountId'], function (err, rows) {
			if (err) {
				library.logger.error(err);
				return cb("Internal sql error");
			}

			var addresses = rows[0].accountId.split(',');

			modules.accounts.getAccounts({
				address: {$in: addresses},
				sort: 'balance'
			}, ['address', 'balance'], function (err, rows) {
				if (err) {
					library.logger.error(err);
					return cb("Internal sql error");
				}

				return cb(null, {accounts: rows});
			});
		});
	});
}

shared.getDelegates = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: 'object',
		properties: {
			limit: {
				type: "integer",
				minimum: 0,
				maximum: 101
			},
			offset: {
				type: "integer",
				minimum: 0
			},
			orderBy: {
				type: "string"
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		modules.accounts.getAccounts({
			isDelegate: 1,
			// limit: query.limit > 101 ? 101 : query.limit,
			// offset: query.offset,
			sort: {"vote": -1, "publicKey": 1}
		}, ["username", "address", "publicKey", "vote", "missedblocks", "producedblocks", "virgin"], function (err, delegates) {
			if (err) {
				return cb(err.toString());
			}

			var limit = query.limit || 101,
				offset = query.offset || 0,
				orderField = query.orderBy,
				active = query.active;

			orderField = orderField ? orderField.split(':') : null;
			limit = limit > 101 ? 101 : limit;
			var orderBy = orderField ? orderField[0] : null;
			var sortMode = orderField && orderField.length == 2 ? orderField[1] : 'asc';
			var count = delegates.length;
			var length = Math.min(limit, count);
			var realLimit = Math.min(offset + limit, count);

			for (var i = 0; i < delegates.length; i++) {
				delegates[i].rate = i + 1;

				var percent = 100 - (delegates[i].missedblocks / ((delegates[i].producedblocks + delegates[i].missedblocks) / 100));
				percent = percent || 0;
				var outsider = i + 1 > slots.delegates && delegates[i].virgin;
				delegates[i].productivity = !outsider ? delegates[i].virgin ? 0 : parseFloat(Math.floor(percent * 100) / 100).toFixed(2) : null
			}

			delegates.sort(function compare(a, b) {
				if (sortMode == 'asc') {
					if (a[orderBy] < b[orderBy])
						return -1;
					if (a[orderBy] > b[orderBy])
						return 1;
				} else if (sortMode == 'desc') {
					if (a[orderBy] > b[orderBy])
						return -1;
					if (a[orderBy] < b[orderBy])
						return 1;
				}
				return 0;
			});

			var result = delegates.slice(offset, realLimit);

			cb(null, {delegates: result, totalCount: count});
		});
	});
}

shared.getFee = function (req, cb) {
	var query = req.body;
	var fee = null;

	fee = 100 * constants.fixedPoint;

	cb(null, {fee: fee})
}

shared.getForgedByAccount = function (req, cb) {
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			generatorPublicKey: {
				type: "string",
				format: "publicKey"
			}
		},
		required: ["generatorPublicKey"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		modules.accounts.getAccount({publicKey: query.generatorPublicKey}, ["fees", "rewards"], function (err, account) {
			if (err || !account) {
				return cb(err || "Account not found")
			}
			cb(null, {fees: account.fees, rewards: account.rewards, forged: account.fees + account.rewards});
		});
	});
}

private.enableForging = function (req, cb) {

}

private.disableForging = function (req, cb) {

}

private.statusForging = function (req, cb) {

}

shared.addDelegate = function (req, cb) {
	var body = req.body;
	library.scheme.validate(body, {
		type: "object",
		properties: {
			secret: {
				type: "string",
				minLength: 1,
				maxLength: 100
			},
			publicKey: {
				type: "string",
				format: "publicKey"
			},
			secondSecret: {
				type: "string",
				minLength: 1,
				maxLength: 100
			},
			username: {
				type: "string"
			}
		},
		required: ["secret"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var hash = crypto.createHash('sha256').update(body.secret, 'utf8').digest();
		var keypair = ed.MakeKeypair(hash);

		if (body.publicKey) {
			if (keypair.publicKey.toString('hex') != body.publicKey) {
				return cb(errorCode("COMMON.INVALID_SECRET_KEY"));
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}

					if (!account || !account.publicKey) {
						return cb("Multisignature account not found");
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb("This account don't have multisignature");
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb("This account don't added to multisignature");
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err.toString());
						}

						if (!requester || !requester.publicKey) {
							return cb(errorCode("COMMON.OPEN_ACCOUNT"));
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
						}

						if (requester.publicKey == account.publicKey) {
							return cb("Incorrect requester");
						}

						var secondKeypair = null;

						if (requester.secondSignature) {
							var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
							secondKeypair = ed.MakeKeypair(secondHash);
						}

						try {
							var transaction = library.logic.transaction.create({
								type: TransactionTypes.DELEGATE,
								username: body.username,
								sender: account,
								keypair: keypair,
								secondKeypair: secondKeypair,
								requester: keypair
							});
						} catch (e) {
							return cb(e.toString());
						}
						modules.transactions.receiveTransactions([transaction], cb);
					});
				});
			} else {
				modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
					if (err) {
						return cb(err.toString());
					}

					if (!account || !account.publicKey) {
						return cb(errorCode("COMMON.OPEN_ACCOUNT"));
					}

					if (account.secondSignature && !body.secondSecret) {
						return cb(errorCode("COMMON.SECOND_SECRET_KEY"));
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = ed.MakeKeypair(secondHash);
					}

					try {
						var transaction = library.logic.transaction.create({
							type: TransactionTypes.DELEGATE,
							username: body.username,
							sender: account,
							keypair: keypair,
							secondKeypair: secondKeypair
						});
					} catch (e) {
						return cb(e.toString());
					}
					modules.transactions.receiveTransactions([transaction], cb);
				});
			}
		}, function (err, transaction) {
			if (err) {
				return cb(err.toString());
			}

			cb(null, {transaction: transaction[0]});
		});
	});
}

// Export
module.exports = Delegates;
