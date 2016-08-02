var crypto = require("crypto");
var extend = require("extend");
var ed = require("ed25519");
var async = require("async");
var shuffle = require("knuth-shuffle").knuthShuffle;
var bignum = require("../helpers/bignum.js");
var Router = require("../helpers/router.js");
var slots = require("../helpers/slots.js");
var schedule = require("node-schedule");
var blockReward = require("../helpers/blockReward.js");
var constants = require("../helpers/constants.js");
var transactionTypes = require("../helpers/transactionTypes.js");
var MilestoneBlocks = require("../helpers/milestoneBlocks.js");
var OrderBy = require("../helpers/orderBy.js");
var sandboxHelper = require("../helpers/sandbox.js");
var sql = require("../sql/delegates.js");
var checkIpInList = require("../helpers/checkIpInList.js");
var _ = require("underscore");

// Private fields
var modules, library, self, private = {}, shared = {};

private.loaded = false;
private.forging = false;
private.blockReward = new blockReward();
private.keypairs = {};

function Delegate() {
	this.create = function (data, trs) {
		trs.recipientId = null;
		trs.amount = 0;
		trs.asset.delegate = {
			username: data.username,
			publicKey: data.sender.publicKey
		};

		// We want to be fail proof by giving a chance to register a clean lowercase username
		if (trs.asset.delegate.username) {
			trs.asset.delegate.username = trs.asset.delegate.username.toLowerCase().trim();
		}

		return trs;
	}

	this.calculateFee = function (trs, sender) {
		return constants.fees.delegate;
	}

	this.verify = function (trs, sender, cb) {
		if (trs.recipientId) {
			return setImmediate(cb, "Invalid recipient");
		}

		if (trs.amount != 0) {
			return setImmediate(cb, "Invalid transaction amount");
		}

		if (sender.isDelegate) {
			return cb("Account is already a delegate");
		}

		if (!trs.asset || !trs.asset.delegate) {
			return cb("Invalid transaction asset");
		}

		if (!trs.asset.delegate.username) {
			return cb("Username is undefined");
		}

		if (trs.asset.delegate.username !== trs.asset.delegate.username.toLowerCase()) {
 			return cb("Username should be lowercase");
 		}

		var isAddress = /^[0-9]{1,21}[L|l]$/g
		var allowSymbols = /^[a-z0-9!@$&_.]+$/g;

		var username = String(trs.asset.delegate.username).toLowerCase().trim();

		if (username == "") {
			return cb("Empty username");
		}

		if (username.length > 20) {
			return cb("Username is too long. Maximum is 20 characters");
		}

		if (isAddress.test(username)) {
			return cb("Username can not be a potential address");
		}

		if (!allowSymbols.test(username)) {
			return cb("Username can only contain alphanumeric characters with the exception of !@$&_.");
		}

		modules.accounts.getAccount({
			username: username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb("Username already exists");
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

		if (trs.asset.delegate.username) {
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
		if (sender.u_isDelegate) {
			return cb("Account is already a delegate");
		}

		function done() {
			var data = {
				address: sender.address,
				u_isDelegate: 1,
				isDelegate: 0
			}

			if (trs.asset.delegate.username) {
				data.username = null;
				data.u_username = trs.asset.delegate.username;
			}

			modules.accounts.setAccountAndGet(data, cb);
		}

		modules.accounts.getAccount({
			u_username: trs.asset.delegate.username
		}, function (err, account) {
			if (err) {
				return cb(err);
			}

			if (account) {
				return cb("Username already exists");
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

		if (trs.asset.delegate.username) {
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

	this.dbTable = "delegates";

	this.dbFields = [
		"username",
		"transactionId"
	];

	this.dbSave = function (trs) {
		return {
			table: this.dbTable,
			fields: this.dbFields,
			values: {
				username: trs.asset.delegate.username,
				transactionId: trs.id
			}
		};
	}

	this.ready = function (trs, sender) {
		if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
			if (!Array.isArray(trs.signatures)) {
				return false;
			}
			return trs.signatures.length >= sender.multimin;
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

	library.logic.transaction.attachAssetType(transactionTypes.DELEGATE, new Delegate());

	setImmediate(cb, null, self);
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules && private.loaded) return next();
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.map(shared, {
		"get /count": "count",
		"get /search": "search",
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

			var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

			if (!checkIpInList(library.config.forging.access.whiteList, ip)) {
				return res.json({success: false, error: "Access denied"});
			}

			var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

			if (body.publicKey) {
				if (keypair.publicKey.toString('hex') != body.publicKey) {
					return res.json({success: false, error: "Invalid passphrase"});
				}
			}

			if (private.keypairs[keypair.publicKey.toString('hex')]) {
				return res.json({success: false, error: "Forging is already enabled"});
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return res.json({success: false, error: err});
				}
				if (account && account.isDelegate) {
					private.keypairs[keypair.publicKey.toString('hex')] = keypair;
					library.logger.info("Forging enabled on account: " + account.address);
					return res.json({success: true, address: account.address});
				} else {
					return res.json({success: false, error: "Delegate not found"});
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

			var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

			if (!checkIpInList(library.config.forging.access.whiteList, ip)) {
				return res.json({success: false, error: "Access denied"});
			}

			var keypair = ed.MakeKeypair(crypto.createHash('sha256').update(body.secret, 'utf8').digest());

			if (body.publicKey) {
				if (keypair.publicKey.toString('hex') != body.publicKey) {
					return res.json({success: false, error: "Invalid passphrase"});
				}
			}

			if (!private.keypairs[keypair.publicKey.toString('hex')]) {
				return res.json({success: false, error: "Delegate not found"});
			}

			modules.accounts.getAccount({publicKey: keypair.publicKey.toString('hex')}, function (err, account) {
				if (err) {
					return res.json({success: false, error: err});
				}
				if (account && account.isDelegate) {
					delete private.keypairs[keypair.publicKey.toString('hex')];
					return res.json({success: true, address: account.address});
					library.logger.info("Forging disabled on account: " + account.address);
				} else {
					return res.json({success: false, error: "Delegate not found"});
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

	// router.map(private, {
	//   "post /forging/enable": "enableForging",
	//   "post /forging/disable": "disableForging",
	//   "get /forging/status": "statusForging"
	// });

	library.network.app.use('/api/delegates', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err);
		res.status(500).send({success: false, error: err});
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
		library.logger.debug('Loop:', 'no delegates');
		return setImmediate(cb);
	}

	if (!private.forging) {
		library.logger.debug('Loop:', 'forging disabled');
		return setImmediate(cb);
	}

	// When client is not loaded, is syncing or round is ticking
	// Do not try to forge new blocks as client is not ready
	if (!private.loaded || modules.loader.syncing() || !modules.round.loaded() || modules.round.ticking()) {
		library.logger.debug('Loop:', 'client not ready');
		return setImmediate(cb);
	}

	var currentSlot = slots.getSlotNumber();
	var lastBlock = modules.blocks.getLastBlock();

	if (currentSlot == slots.getSlotNumber(lastBlock.timestamp)) {
		library.logger.debug('Loop:', 'lastBlock is in the same slot');
		return setImmediate(cb);
	}

	private.getBlockSlotData(currentSlot, lastBlock.height + 1, function (err, currentBlockData) {
		if (err || currentBlockData === null) {
			library.logger.debug('Loop:', 'skipping slot');
			return setImmediate(cb);
		}

		library.sequence.add(function (cb) {
			if (slots.getSlotNumber(currentBlockData.time) == slots.getSlotNumber()) {
				modules.blocks.generateBlock(currentBlockData.keypair, currentBlockData.time, function (err) {
					modules.blocks.lastReceipt(new Date());
					library.logger.info('Forged new block id: ' + modules.blocks.getLastBlock().id + ' height: ' + modules.blocks.getLastBlock().height + ' round: ' + modules.round.calc(modules.blocks.getLastBlock().height) + ' slot: ' + slots.getSlotNumber(currentBlockData.time) + ' reward: ' + modules.blocks.getLastBlock().reward);
					return setImmediate(cb, err);
				});
			} else {
				// library.logger.debug('Loop:', _activeDelegates[slots.getSlotNumber() % slots.delegates] + ' delegate slot');
				return setImmediate(cb);
			}
		}, function (err) {
			if (err) {
				library.logger.error("Failed generate block within slot:", err);
			}
			return setImmediate(cb);
		});
	});
}

private.loadMyDelegates = function (cb) {
	var secrets = null;
	if (library.config.forging.secret) {
		secrets = Array.isArray(library.config.forging.secret) ? library.config.forging.secret : [library.config.forging.secret];
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
				library.logger.warn("Delegate with this public key not found: " + keypair.publicKey.toString('hex'));
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

Delegates.prototype.getDelegates = function (query, cb) {
	if (!query) {
		throw "Missing query argument";
	}
	modules.accounts.getAccounts({
		isDelegate: 1,
		sort: { "vote": -1, "publicKey": 1 }
	}, ["username", "address", "publicKey", "vote", "missedblocks", "producedblocks"], function (err, delegates) {
		if (err) {
			return cb(err);
		}

		var limit = query.limit || constants.activeDelegates,
		    offset = query.offset || 0,
		    active = query.active;

		limit = limit > constants.activeDelegates ? constants.activeDelegates : limit;

		var count = delegates.length;
		var length = Math.min(limit, count);
		var realLimit = Math.min(offset + limit, count);

		var lastBlock   = modules.blocks.getLastBlock(),
		    totalSupply = private.blockReward.calcSupply(lastBlock.height);

		for (var i = 0; i < delegates.length; i++) {
			delegates[i].rate = i + 1;
			delegates[i].approval = (delegates[i].vote / totalSupply) * 100;
			delegates[i].approval = Math.round(delegates[i].approval * 1e2) / 1e2;

			var percent = 100 - (delegates[i].missedblocks / ((delegates[i].producedblocks + delegates[i].missedblocks) / 100));
			percent = Math.abs(percent) || 0;

			var outsider = i + 1 > slots.delegates;
			delegates[i].productivity = (!outsider) ? Math.round(percent * 1e2) / 1e2 : 0;
		}

		var orderBy = OrderBy(query.orderBy, { quoteField: false });

		if (orderBy.error) {
			return cb(orderBy.error);
		}

		return cb(null, {
			delegates: delegates,
			sortField: orderBy.sortField,
			sortMethod: orderBy.sortMethod,
			count: count,
			offset: offset,
			limit: realLimit
		});
	});
}

Delegates.prototype.checkDelegates = function (publicKey, votes, cb) {
	if (!Array.isArray(votes)) {
		return setImmediate(cb, "Votes must be an array");
	}

	modules.accounts.getAccount({publicKey: publicKey}, function (err, account) {
		if (err) {
			return cb(err);
		}

		if (!account) {
			return cb("Account not found");
		}

		var existing_votes = Array.isArray(account.u_delegates) ? account.u_delegates.length : 0;
		var additions = 0, removals = 0;

		async.eachSeries(votes, function (action, cb) {
			var math = action[0];

			if (math !== '+' && math !== '-') {
				return cb("Invalid math operator");
			}

			if (math == '+') {
				additions += 1;
			} else if (math == '+') {
				removals += 1;
			}

			var publicKey = action.slice(1);

			try {
				new Buffer(publicKey, "hex");
			} catch (e) {
				library.logger.error(e.toString());
				return cb("Invalid public key");
			}

			if (math == "+" && (account.u_delegates !== null && account.u_delegates.indexOf(publicKey) != -1)) {
				return cb("Failed to add vote, account has already voted for this delegate");
			}

			if (math == "-" && (account.u_delegates === null || account.u_delegates.indexOf(publicKey) === -1)) {
				return cb("Failed to remove vote, account has not voted for this delegate");
			}

			modules.accounts.getAccount({ publicKey: publicKey, isDelegate: 1 }, function (err, account) {
				if (err) {
					return cb(err);
				}

				if (!account) {
					return cb("Delegate not found");
				}

				return cb();
			});
		}, function (err) {
			if (err) {
				return cb(err);
			}

			var total_votes = (existing_votes + additions) - removals;

			if (total_votes > constants.activeDelegates) {
				var exceeded = total_votes - constants.activeDelegates;

				return cb("Maximum number of " + constants.activeDelegates + " votes exceeded (" + exceeded + " too many).");
			} else {
				return cb();
			}
		});
	});
}

Delegates.prototype.checkUnconfirmedDelegates = function (publicKey, votes, cb) {
	if (Array.isArray(votes)) {
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
					return cb("Invalid math operator");
				}

				var publicKey = action.slice(1);


				try {
					new Buffer(publicKey, "hex");
				} catch (e) {
					library.logger.error(e.toString());
					return cb("Invalid public key");
				}

				if (math == "+" && (account.u_delegates !== null && account.u_delegates.indexOf(publicKey) != -1)) {
					return cb("Failed to add vote, account has already voted for this delegate");
				}
				if (math == "-" && (account.u_delegates === null || account.u_delegates.indexOf(publicKey) === -1)) {
					return cb("Failed to remove vote, account has not voted for this delegate");
				}

				modules.accounts.getAccount({ publicKey: publicKey, isDelegate: 1 }, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account) {
						return cb("Delegate not found");
					}

					cb();
				});
			}, cb)
		});
	} else {
		return setImmediate(cb, "Please provide an array of votes");
	}
}

Delegates.prototype.fork = function (block, cause) {
	library.logger.info('Fork', {
		delegate: block.generatorPublicKey,
		block: { id: block.id, timestamp: block.timestamp, height: block.height, previousBlock: block.previousBlock },
		cause: cause
	});

	self.disableForging("fork");

	library.db.none(sql.insertFork, {
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
		// var nextDelegate_id = activeDelegates[(currentSlot + 1) % slots.delegates];
		// var previousDelegate_id = activeDelegates[(currentSlot - 1) % slots.delegates];

		if (delegate_id && block.generatorPublicKey == delegate_id) {
			return cb();
		} else {
			library.logger.error("Expected generator: " + delegate_id + " Received generator: " + block.generatorPublicKey);
			return cb("Failed to verify slot: " + currentSlot);
		}
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
			library.logger.error("Failed to load delegates:", err.toString());
		}

		private.toggleForgingOnReceipt();

		private.loop(function () {
			setTimeout(nextLoop, 1000);
		});
	});
}

Delegates.prototype.cleanup = function (cb) {
	private.loaded = false;
	cb();
}

Delegates.prototype.enableForging = function () {
	if (!private.forging) {
		library.logger.debug("Enabling forging");
		private.forging = true;
	}

	return private.forging;
}

Delegates.prototype.disableForging = function (reason) {
	if (private.forging) {
		library.logger.debug("Disabling forging due to:", reason);
		private.forging = false;
	}

	return private.forging;
}

// Private
private.toggleForgingOnReceipt = function () {
	var lastReceipt = modules.blocks.lastReceipt();

	// Enforce local forging if configured
	if (!lastReceipt && library.config.forging.force) {
		lastReceipt = modules.blocks.lastReceipt(new Date());
	}

	if (lastReceipt) {
		var timeOut = 500; // 50 blocks
		var timeNow = new Date();
		var seconds = Math.floor((timeNow.getTime() - lastReceipt.getTime()) / 1000);

		library.logger.debug("Last block received: " + seconds + " seconds ago");

		if (seconds > timeOut) {
			return self.disableForging("timeout");
		} else {
			return self.enableForging();
		}
	}
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

		modules.delegates.getDelegates(query, function (err, result) {
			if (err) {
				return cb(err);
			}

			var delegate = _.find(result.delegates, function (delegate) {
				if (query.publicKey) {
					return delegate.publicKey == query.publicKey;
				} else if (query.username) {
					return delegate.username == query.username;
				}

				return false;
			});

			if (delegate) {
				return cb(null, {delegate: delegate});
			} else {
				return cb("Delegate not found");
			}
		});
	});
}

shared.search = function (req, cb) {
	var query = req.body;

	library.scheme.validate(query, {
		type: "object",
		properties: {
			q: {
				type: "string",
				minLength: 1,
				maxLength: 20
			},
			limit: {
				type: "integer",
				minimum: 1,
				maximum: 100
			}
		},
		required: ["q"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		var orderBy = OrderBy(
			query.orderBy, {
				sortFields: sql.sortFields,
				sortField: "username"
			}
		);

		if (orderBy.error) {
			return cb(orderBy.error);
		}

		library.db.query(sql.search({
			q: query.q,
			limit: query.limit || 100,
			sortField: orderBy.sortField,
			sortMethod: orderBy.sortMethod
		})).then(function (rows) {
			return cb(null, { delegates: rows });
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb("Database search failed");
		});
	});
}

shared.count = function (req, cb) {
	library.db.one(sql.count).then(function (row) {
		return cb(null, { count: row.count });
	}).catch(function (err) {
		library.logger.error(err.toString());
		return cb("Failed to count delegates");
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

		library.db.one(sql.getVoters, { publicKey: query.publicKey }).then(function (row) {
			var addresses = (row.accountIds) ? row.accountIds : [];

			modules.accounts.getAccounts({
				address: { $in: addresses },
				sort: 'balance'
			}, ['address', 'balance', 'username', 'publicKey'], function (err, rows) {
				if (err) {
					return cb(err);
				}

				return cb(null, { accounts: rows });
			});
		}).catch(function (err) {
			library.logger.error(err.toString());
			return cb("Failed to get voters for delegate: " + query.publicKey);
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
				maximum: constants.activeDelegates
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

		modules.delegates.getDelegates(query, function (err, result) {
			if (err) {
				return cb(err);
			}

			function compareNumber(a, b) {
				var sorta = parseFloat(a[result.sortField]);
				var sortb = parseFloat(b[result.sortField]);
				if (result.sortMethod == 'ASC') {
					return sorta - sortb;
				} else {
				 	return sortb - sorta;
				}
			};

			function compareString(a, b) {
				var sorta = a[result.sortField];
				var sortb = b[result.sortField];
				if (result.sortMethod == 'ASC') {
				  return sorta.localeCompare(sortb);
				} else {
				  return sortb.localeCompare(sorta);
				}
			};

			if (result.sortField) {
				if (["approval", "productivity", "rate", "vote", "missedblocks", "producedblocks"].indexOf(result.sortField) > -1) {
					result.delegates = result.delegates.sort(compareNumber);
				} else {
					result.delegates = result.delegates.sort(compareString);
				}
			}

			library.logger.debug(result.delegates);

			var delegates = result.delegates.slice(result.offset, result.limit);

			cb(null, {delegates: delegates, totalCount: result.count});
		});
	});
}

shared.getFee = function (req, cb) {
	var query = req.body;
	var fee = null;

	fee = constants.fees.delegate;

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
			var forged = bignum(account.fees).plus(bignum(account.rewards)).toString();
			cb(null, {fees: account.fees, rewards: account.rewards, forged: forged});
		});
	});
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
				return cb("Invalid passphrase");
			}
		}

		library.balancesSequence.add(function (cb) {
			if (body.multisigAccountPublicKey && body.multisigAccountPublicKey != keypair.publicKey.toString('hex')) {
				modules.accounts.getAccount({publicKey: body.multisigAccountPublicKey}, function (err, account) {
					if (err) {
						return cb(err);
					}

					if (!account || !account.publicKey) {
						return cb("Multisignature account not found");
					}

					if (!account.multisignatures || !account.multisignatures) {
						return cb("Account does not have multisignatures enabled");
					}

					if (account.multisignatures.indexOf(keypair.publicKey.toString('hex')) < 0) {
						return cb("Account does not belong to multisignature group");
					}

					modules.accounts.getAccount({publicKey: keypair.publicKey}, function (err, requester) {
						if (err) {
							return cb(err);
						}

						if (!requester || !requester.publicKey) {
							return cb("Invalid requester");
						}

						if (requester.secondSignature && !body.secondSecret) {
							return cb("Invalid second passphrase");
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
								type: transactionTypes.DELEGATE,
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
						return cb(err);
					}

					if (!account || !account.publicKey) {
						return cb("Account not found");
					}

					if (account.secondSignature && !body.secondSecret) {
						return cb("Invalid second passphrase");
					}

					var secondKeypair = null;

					if (account.secondSignature) {
						var secondHash = crypto.createHash('sha256').update(body.secondSecret, 'utf8').digest();
						secondKeypair = ed.MakeKeypair(secondHash);
					}

					try {
						var transaction = library.logic.transaction.create({
							type: transactionTypes.DELEGATE,
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
				return cb(err);
			}

			cb(null, {transaction: transaction[0]});
		});
	});
}

// Export
module.exports = Delegates;
