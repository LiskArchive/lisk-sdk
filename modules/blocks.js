var crypto = require('crypto'),
	ed = require('ed25519'),
	ip = require('ip'),
	ByteBuffer = require("bytebuffer"),
	constants = require("../helpers/constants.js"),
	genesisblock = null,
	blockReward = require("../helpers/blockReward.js"),
	constants = require('../helpers/constants.js'),
	Inserts = require('../helpers/inserts.js'),
	Router = require('../helpers/router.js'),
	slots = require('../helpers/slots.js'),
	util = require('util'),
	async = require('async'),
	TransactionTypes = require('../helpers/transaction-types.js'),
	sandboxHelper = require('../helpers/sandbox.js'),
	_ = require('underscore');

require('array.prototype.findindex'); // Old node fix

// Private fields
var modules, library, self, private = {}, shared = {};

private.lastBlock = {};
private.blockReward = new blockReward();

// @formatter:off
private.blocksDataFields = {
	'b_id': String,
	'b_version': String,
	'b_timestamp': Number,
	'b_height': Number,
	'b_previousBlock': String,
	'b_numberOfTransactions': String,
	'b_totalAmount': String,
	'b_totalFee': String,
	'b_reward': String,
	'b_payloadLength': String,
	'b_payloadHash': String,
	'b_generatorPublicKey': String,
	'b_blockSignature': String,
	't_id': String,
	't_type': Number,
	't_timestamp': Number,
	't_senderPublicKey': String,
	't_senderId': String,
	't_recipientId': String,
	't_amount': String,
	't_fee': String,
	't_signature': String,
	't_signSignature': String,
	's_publicKey': String,
	'd_username': String,
	'v_votes': String,
	'm_min': Number,
	'm_lifetime': Number,
	'm_keysgroup': String,
	'dapp_name': String,
	'dapp_description': String,
	'dapp_tags': String,
	'dapp_type': Number,
	'dapp_link': String,
	'dapp_category': Number,
	'dapp_icon': String,
	'in_dappId': String,
	'ot_dappId': String,
	'ot_outTransactionId': String,
	't_requesterPublicKey': String,
	't_signatures': String
};
// @formatter:on

private.loaded = false;
private.isActive = false;

// Constructor
function Blocks(cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;
	self.__private = private;
	private.attachApi();

	private.saveGenesisBlock(function (err) {
		setImmediate(cb, err, self);
	});
}

// Private methods
private.attachApi = function () {
	var router = new Router();

	router.use(function (req, res, next) {
		if (modules) return next();
		res.status(500).send({success: false, error: "Blockchain is loading"});
	});

	router.map(shared, {
		"get /get": "getBlock",
		"get /": "getBlocks",
		"get /getHeight": "getHeight",
		"get /getFee": "getFee",
		"get /getMilestone": "getMilestone",
		"get /getReward": "getReward",
		"get /getSupply": "getSupply",
		"get /getStatus": "getStatus"
	});

	router.use(function (req, res, next) {
		res.status(500).send({success: false, error: "API endpoint not found"});
	});

	library.network.app.use('/api/blocks', router);
	library.network.app.use(function (err, req, res, next) {
		if (!err) return next();
		library.logger.error(req.url, err.toString());
		res.status(500).send({success: false, error: err.toString()});
	});
}

private.saveGenesisBlock = function (cb) {
	library.db.query("SELECT \"id\" FROM blocks WHERE \"id\" = ${id}", { id: genesisblock.block.id }).then(function (rows) {
		var blockId = rows.length && rows[0].id;

		if (!blockId) {
			private.saveBlock(genesisblock.block, function (err) {
				if (err) {
				}

				return cb(err);
			});
		} else {
			return cb();
		}
	}).catch(function (err) {
		return cb("Blocks#saveGenesisBlock error");
	});
}

private.deleteBlock = function (blockId, cb) {
	library.db.none("DELETE FROM blocks WHERE \"id\" = ${id}", { id: blockId }).then(function () {
		return cb();
	}).catch(function (err) {
		return cb("Blocks#deleteBlock error");
	});
}

private.list = function (filter, cb) {
	var sortFields = ['b."id"', 'b."timestamp"', 'b."height"', 'b."previousBlock"', 'b."totalAmount"', 'b."totalFee"', 'b."reward"', 'b."numberOfTransactions"', 'b."generatorPublicKey"'];
	var params = {}, fields = [], sortMethod = '', sortBy = '';

	if (filter.generatorPublicKey) {
		fields.push("ENCODE(\"generatorPublicKey\", 'hex') = ${generatorPublicKey}")
		params.generatorPublicKey = filter.generatorPublicKey;
	}

	if (filter.numberOfTransactions) {
		fields.push('"numberOfTransactions" = ${numberOfTransactions}');
		params.numberOfTransactions = filter.numberOfTransactions;
	}

	if (filter.previousBlock) {
		fields.push('"previousBlock" = ${previousBlock}');
		params.previousBlock = filter.previousBlock;
	}

	if (filter.height === 0 || filter.height > 0) {
		fields.push('"height" = ${height}');
		params.height = filter.height;
	}

	if (filter.totalAmount >= 0) {
		fields.push('"totalAmount" = ${totalAmount}');
		params.totalAmount = filter.totalAmount;
	}

	if (filter.totalFee >= 0) {
		fields.push('"totalFee" = ${totalFee}');
		params.totalFee = filter.totalFee;
	}

	if (filter.reward >= 0) {
		fields.push('"reward" = ${reward}');
		params.reward = filter.reward;
	}

	if (filter.orderBy) {
		var sort = filter.orderBy.split(':');
		sortBy = sort[0].replace(/[^\w\s]/gi, '');
		sortBy = "b." + "\"" + sortBy + "\"";
		if (sort.length == 2) {
			sortMethod = sort[1] == 'desc' ? 'DESC' : 'ASC'
		} else {
			sortMethod = 'DESC';
		}
	}

	if (sortBy) {
		if (sortFields.indexOf(sortBy) < 0) {
			return cb("Invalid sort field");
		}
	}

	if (!filter.limit) {
		filter.limit = 100;
	}

	if (!filter.offset) {
		filter.offset = 0;
	}

	params.limit = filter.limit;
	params.offset = filter.offset;

	if (filter.limit > 100) {
		return cb("Invalid limit. Maximum is 100");
	}

	library.db.query("SELECT COUNT(b.\"id\")::int " +
		"FROM blocks b " +
		(fields.length ? "WHERE " + fields.join(" AND ") : ""), params).then(function (rows) {
		var count = rows[0].count;

		library.db.query("SELECT b.\"id\" AS \"b_id\", b.\"version\" AS \"b_version\", b.\"timestamp\" AS \"b_timestamp\", b.\"height\" AS \"b_height\", b.\"previousBlock\" AS \"b_previousBlock\", b.\"numberOfTransactions\" AS \"b_numberOfTransactions\", b.\"totalAmount\" AS \"b_totalAmount\", b.\"totalFee\" AS \"b_totalFee\", b.\"reward\" AS \"b_reward\", b.\"payloadLength\" AS \"b_payloadLength\", ENCODE(b.\"payloadHash\", 'hex') AS \"b_payloadHash\", ENCODE(b.\"generatorPublicKey\", 'hex') AS \"b_generatorPublicKey\", ENCODE(b.\"blockSignature\", 'hex') AS \"b_blockSignature\", (SELECT MAX(\"height\") + 1 FROM blocks) - b.\"height\" AS \"b_confirmations\" " +
			"FROM blocks b " +
			(fields.length ? "WHERE " + fields.join(" AND ") : "") + " " +
			(filter.orderBy ? "ORDER BY " + sortBy + " " + sortMethod : "") + " LIMIT ${limit} OFFSET ${offset} ", params).then(function (rows) {

				var blocks = [];
				for (var i = 0; i < rows.length; i++) {
					blocks.push(library.logic.block.dbRead(rows[i]));
				}

				var data = {
					blocks: blocks,
					count: count
				}

				cb(null, data);
		}).catch(function (err) {
			return cb("Blocks#list error");
		});
	}).catch(function (err) {
		return cb("Blocks#list error");
	});
}

private.getById = function (id, cb) {
	library.db.query("SELECT b.\"id\" AS \"b_id\", b.\"version\" AS \"b_version\", b.\"timestamp\" AS \"b_timestamp\", b.\"height\" AS \"b_height\", b.\"previousBlock\" AS \"b_previousBlock\", b.\"numberOfTransactions\" AS \"b_numberOfTransactions\", b.\"totalAmount\" AS \"b_totalAmount\", b.\"totalFee\" AS \"b_totalFee\", b.\"reward\" AS \"b_reward\", b.\"payloadLength\" AS \"b_payloadLength\", ENCODE(b.\"payloadHash\", 'hex') AS \"b_payloadHash\", ENCODE(b.\"generatorPublicKey\", 'hex') AS \"b_generatorPublicKey\", ENCODE(b.\"blockSignature\", 'hex') AS \"b_blockSignature\", (SELECT MAX(\"height\") + 1 FROM blocks) - b.\"height\" AS \"b_confirmations\" " +
		"FROM blocks b " +
		'WHERE b."id" = ${id}', { id: id }).then(function (rows) {
			if (!rows.length) {
				return cb("Block not found");
			}

			var block = library.logic.block.dbRead(rows[0]);
			cb(null, block);
		}).catch(function (err) {
			return cb("Blocks#getById error");
		});
}

private.saveBlock = function (block, cb) {
	library.db.tx(function (t) {
		var promise = library.logic.block.dbSave(block);
		var inserts = new Inserts(promise, promise.values);

		var promises = [
			t.none(inserts.template(), promise.values)
		];

		t = private.promiseTransactions(t, block, promises);
		t.batch(promises);
	}).then(function () {
		return private.afterSave(block, cb);
	}).catch(function (err) {
		return cb("Blocks#saveBlock error");
	});
}

private.promiseTransactions = function (t, block, blockPromises) {
	if (_.isEmpty(block.transactions)) {
		return t;
	}

	var promises = [];

	var transactionIterator = function (transaction) {
		transaction.blockId = block.id;
		promises = promises.concat(
			library.logic.transaction.dbSave(transaction)
		);
	};

	var promiseGrouper = function (promise) {
		if (promise && promise.table) {
			return promise.table;
		} else {
			throw new Error("Invalid promise");
		}
	};

	var typeIterator = function (type) {
		var values = [];

		_.each(type, function (promise) {
			if (promise && promise.values) {
				values = values.concat(promise.values);
			} else {
				throw new Error("Invalid promise");
			}
		});

		var inserts = new Inserts(type[0], values, true);
		t.none(inserts.template(), inserts);
	}

	_.each(block.transactions, transactionIterator);
	_.each(_.groupBy(promises, promiseGrouper), typeIterator);

	return t;
}

private.afterSave = function (block, cb) {
	async.eachSeries(block.transactions, function (transaction, cb) {
		return library.logic.transaction.afterSave(transaction, cb);
	}, function (err) {
		return cb(err);
	});
}

private.popLastBlock = function (oldLastBlock, cb) {
	library.balancesSequence.add(function (cb) {
		self.loadBlocksPart({ id: oldLastBlock.previousBlock }, function (err, previousBlock) {
			if (err || !previousBlock.length) {
				return cb(err || 'previousBlock is null');
			}
			previousBlock = previousBlock[0];

			async.eachSeries(oldLastBlock.transactions.reverse(), function (transaction, cb) {
				async.series([
					function (cb) {
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return cb(err);
							}
							modules.transactions.undo(transaction, oldLastBlock, sender, cb);
						});
					}, function (cb) {
						modules.transactions.undoUnconfirmed(transaction, cb);
					}, function (cb) {
						modules.transactions.pushHiddenTransaction(transaction);
						setImmediate(cb);
					}
				], cb);
			}, function (err) {
				modules.round.backwardTick(oldLastBlock, previousBlock, function () {
					private.deleteBlock(oldLastBlock.id, function (err) {
						if (err) {
							return cb(err);
						}

						cb(null, previousBlock);
					});
				});
			});
		});
	}, cb);
}

private.getIdSequence = function (height, cb) {
	library.db.one("SELECT s.\"height\" AS \"firstHeight\", STRING_AGG(s.\"id\", ',') AS \"ids\" FROM ( " +
		"SELECT \"id\", MAX(\"height\") AS \"height\" " +
		"FROM blocks " +
		"GROUP BY (\"id\", CAST(\"height\" / 101 AS INTEGER) + (CASE WHEN \"height\" % 101 > 0 THEN 1 ELSE 0 END)) HAVING \"height\" <= ${height} " +
		"UNION " +
		"SELECT \"id\", 1 AS \"height\" " +
		"FROM blocks WHERE \"height\" = 1 " +
		"ORDER BY \"height\" DESC " +
		"LIMIT ${limit} " +
		') s GROUP BY s.\"height\" LIMIT 1', {
		height: height,
		limit: 1000,
		delegates: slots.delegates
	}).then(function (row) {
		if (!row) {
			cb("Can't get sequence before: " + height);
			return;
		}

		cb(null, row);
	}).catch(function (err) {
		return cb("Blocks#getIdSequence error");
	});
}

private.readDbRows = function (rows) {
	var blocks = {};
	var order = [];
	for (var i = 0, length = rows.length; i < length; i++) {
		var __block = library.logic.block.dbRead(rows[i]);
		if (__block) {
			if (!blocks[__block.id]) {
				if (__block.id == genesisblock.block.id) {
					__block.generationSignature = (new Array(65)).join('0');
				}

				order.push(__block.id);
				blocks[__block.id] = __block;
			}

			var __transaction = library.logic.transaction.dbRead(rows[i]);
			blocks[__block.id].transactions = blocks[__block.id].transactions || {};
			if (__transaction) {
				if (!blocks[__block.id].transactions[__transaction.id]) {
					blocks[__block.id].transactions[__transaction.id] = __transaction;
				}
			}
		}
	}

	blocks = order.map(function (v) {
		blocks[v].transactions = Object.keys(blocks[v].transactions).map(function (t) {
			return blocks[v].transactions[t];
		});
		return blocks[v];
	});

	return blocks;
}

private.applyTransaction = function (block, transaction, sender, cb) {
	modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
		if (err) {
			return setImmediate(cb, {
				message: err,
				transaction: transaction,
				block: block
			});
		}

		modules.transactions.apply(transaction, block, sender, function (err) {
			if (err) {
				return setImmediate(cb, {
					message: "Can't apply transaction: " + transaction.id,
					transaction: transaction,
					block: block
				});
			}
			setImmediate(cb);
		});
	});
}

// Public methods
Blocks.prototype.getCommonBlock = function (peer, height, cb) {
	var commonBlock = null;
	var lastBlockHeight = height;
	var count = 0;

	async.whilst(
		function () {
			return !commonBlock && count < 30 && lastBlockHeight > 1;
		},
		function (next) {
			count++;
			private.getIdSequence(lastBlockHeight, function (err, data) {
				if (err) {
					return next(err)
				}
				var max = lastBlockHeight;
				lastBlockHeight = data.firstHeight;
				modules.transport.getFromPeer(peer, {
					api: "/blocks/common?ids=" + data.ids + '&max=' + max + '&min=' + lastBlockHeight,
					method: "GET"
				}, function (err, data) {
					if (err || data.body.error) {
						return next(err || data.body.error.toString());
					}

					if (!data.body.common) {
						return next();
					}

					library.db.query("SELECT COUNT(*)::int FROM blocks WHERE \"id\" = ${id} " + (data.body.common.previousBlock ? "AND \"previousBlock\" = ${previousBlock}" : "") + " AND \"height\" = ${height}", {
						id: data.body.common.id,
						previousBlock: data.body.common.previousBlock,
						height: data.body.common.height
					}).then(function (rows) {
						if (!rows.length) {
							return next("Can't compare blocks");
						}

						if (rows[0].count) {
							commonBlock = data.body.common;
						}
						next();
					}).catch(function (err) {
						return next("Blocks#getCommonBlock error");
					});
				});
			});
		},
		function (err) {
			setImmediate(cb, err, commonBlock);
		}
	)
}

Blocks.prototype.count = function (cb) {
	library.db.query("SELECT COUNT(\"id\")::int FROM blocks").then(function (rows) {
		var res = rows.length ? rows[0].count : 0;

		return cb(null, res);
	}).catch(function (err) {
		return cb("Blocks#count error");
	});
}

Blocks.prototype.loadBlocksData = function (filter, options, cb) {
	if (arguments.length < 3) {
		cb = options;
		options = {};
	}

	options = options || {};

	if (filter.lastId && filter.id) {
		return cb("Invalid filter");
	}

	var params = {limit: filter.limit || 1};
	filter.lastId && (params['lastId'] = filter.lastId);
	filter.id && !filter.lastId && (params['id'] = filter.id);

	var fields = private.blocksDataFields;

	library.dbSequence.add(function (cb) {
		library.db.query("SELECT \"height\" FROM blocks WHERE \"id\" = ${lastId}", { lastId: filter.lastId || null }).then(function (rows) {

			var height = rows.length ? rows[0].height : 0;
			var realLimit = height + (parseInt(filter.limit) || 1);
			params.limit = realLimit;
			params.height = height;

			var limitPart = "";

			if (!filter.id && !filter.lastId) {
				limitPart = "WHERE b.\"height\" < ${limit} ";
			}

			library.db.query("SELECT " +
				"b.\"id\" AS \"b_id\", b.\"version\" AS \"b_version\", b.\"timestamp\" AS \"b_timestamp\", b.\"height\" AS \"b_height\", b.\"previousBlock\" AS \"b_previousBlock\", b.\"numberOfTransactions\" AS \"b_numberOfTransactions\", b.\"totalAmount\" AS \"b_totalAmount\", b.\"totalFee\" AS \"b_totalFee\", b.\"reward\" AS \"b_reward\", b.\"payloadLength\" AS \"b_payloadLength\", ENCODE(b.\"payloadHash\", 'hex') AS \"b_payloadHash\", ENCODE(b.\"generatorPublicKey\", 'hex') AS \"b_generatorPublicKey\", ENCODE(b.\"blockSignature\", 'hex') AS \"b_blockSignature\", " +
				"t.\"id\" AS \"t_id\", t.\"type\" AS \"t_type\", t.\"timestamp\" AS \"t_timestamp\", ENCODE(t.\"senderPublicKey\", 'hex') AS \"t_senderPublicKey\", t.\"senderId\" AS \"t_senderId\", t.\"recipientId\" AS \"t_recipientId\", t.\"amount\" AS \"t_amount\", t.\"fee\" AS \"t_fee\", ENCODE(t.\"signature\", 'hex') AS \"t_signature\", ENCODE(t.\"signSignature\", 'hex') AS \"t_signSignature\", " +
				"ENCODE(s.\"publicKey\", 'hex') AS \"s_publicKey\", " +
				"d.\"username\" AS \"d_username\", " +
				"v.\"votes\" AS \"v_votes\", " +
				"m.\"min\" AS \"m_min\", m.\"lifetime\" AS \"m_lifetime\", m.\"keysgroup\" AS \"m_keysgroup\", " +
				"dapp.\"name\" AS \"dapp_name\", dapp.\"description\" AS \"dapp_description\", dapp.\"tags\" AS \"dapp_tags\", dapp.\"type\" AS \"dapp_type\", dapp.\"link\" AS \"dapp_link\", dapp.\"category\" AS \"dapp_category\", dapp.\"icon\" AS \"dapp_icon\", " +
				"it.\"dappId\" AS \"in_dappId\", " +
				"ot.\"dappId\" AS \"ot_dappId\", ot.\"outTransactionId\" AS \"ot_outTransactionId\", " +
				"ENCODE(t.\"requesterPublicKey\", 'hex') AS \"t_requesterPublicKey\", t.\"signatures\" AS \"t_signatures\" " +
				"FROM blocks b " +
				"LEFT OUTER JOIN trs AS t ON t.\"blockId\" = b.\"id\" " +
				"LEFT OUTER JOIN delegates AS d ON d.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN votes AS v ON v.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN signatures AS s ON s.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN multisignatures AS m ON m.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN dapps AS dapp ON dapp.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN intransfer AS it ON it.\"transactionId\" = t.\"id\" " +
				"LEFT OUTER JOIN outtransfer AS ot ON ot.\"transactionId\" = t.\"id\" " +
				(filter.id || filter.lastId ? "WHERE " : "") + " " +
				(filter.id ? " b.\"id\" = ${id} " : "") + (filter.id && filter.lastId ? " AND " : "") + (filter.lastId ? " b.\"height\" > ${height} AND b.\"height\" < ${limit} " : "") + limitPart + "ORDER BY b.\"height\"", params).then(function (rows) {
				return cb(null, rows);
			}).catch(function (err) {
				return cb("Blocks#loadBlockData error");
			});

		}).catch(function (err ) {
			return cb("Blocks#loadBlockData error");
		});
	}, cb);
}

Blocks.prototype.loadBlocksPart = function (filter, cb) {
	self.loadBlocksData(filter, function (err, rows) {
		// Notes:
		// If while loading we encounter an error, for example, an invalid signature on a block & transaction, then we need to stop loading and remove all blocks after the last good block. We also need to process all transactions within the block.

		var blocks = [];

		if (!err) {
			blocks = private.readDbRows(rows);
		}

		cb(err, blocks);
	});
}

Blocks.prototype.loadBlocksOffset = function (limit, offset, verify, cb) {
	var newLimit = limit + (offset || 0);
	var params = { limit: newLimit, offset: offset || 0 };

	library.dbSequence.add(function (cb) {
		library.db.query("SELECT " +
			"b.\"id\" AS \"b_id\", b.\"version\" AS \"b_version\", b.\"timestamp\" AS \"b_timestamp\", b.\"height\" AS \"b_height\", b.\"previousBlock\" AS \"b_previousBlock\", b.\"numberOfTransactions\" AS \"b_numberOfTransactions\", b.\"totalAmount\" AS \"b_totalAmount\", b.\"totalFee\" AS \"b_totalFee\", b.\"reward\" AS \"b_reward\", b.\"payloadLength\" AS \"b_payloadLength\", ENCODE(b.\"payloadHash\", 'hex') AS \"b_payloadHash\", ENCODE(b.\"generatorPublicKey\", 'hex') AS \"b_generatorPublicKey\", ENCODE(b.\"blockSignature\", 'hex') AS \"b_blockSignature\", " +
			"t.\"id\" AS \"t_id\", t.\"type\" AS \"t_type\", t.\"timestamp\" AS \"t_timestamp\", ENCODE(t.\"senderPublicKey\", 'hex') AS \"t_senderPublicKey\", t.\"senderId\" AS \"t_senderId\", t.\"recipientId\" AS \"t_recipientId\", t.\"amount\" AS \"t_amount\", t.\"fee\" AS \"t_fee\", ENCODE(t.\"signature\", 'hex') AS \"t_signature\", ENCODE(t.\"signSignature\", 'hex') AS \"t_signSignature\", " +
			"ENCODE(s.\"publicKey\", 'hex') AS \"s_publicKey\", " +
			"d.\"username\" AS \"d_username\", " +
			"v.\"votes\" AS \"v_votes\", " +
			"m.\"min\" AS \"m_min\", m.\"lifetime\" AS \"m_lifetime\", m.\"keysgroup\" AS \"m_keysgroup\", " +
			"dapp.\"name\" AS \"dapp_name\", dapp.\"description\" AS \"dapp_description\", dapp.\"tags\" AS \"dapp_tags\", dapp.\"type\" AS \"dapp_type\", dapp.\"link\" AS \"dapp_link\", dapp.\"category\" AS \"dapp_category\", dapp.\"icon\" AS \"dapp_icon\", " +
			"it.\"dappId\" AS \"in_dappId\", " +
			"ot.\"dappId\" AS \"ot_dappId\", ot.\"outTransactionId\" AS \"ot_outTransactionId\", " +
			"ENCODE(t.\"requesterPublicKey\", 'hex') AS \"t_requesterPublicKey\", t.\"signatures\" AS \"t_signatures\" " +
			"FROM blocks b " +
			"LEFT OUTER JOIN trs AS t ON t.\"blockId\" = b.\"id\" " +
			"LEFT OUTER JOIN delegates AS d ON d.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN votes AS v ON v.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN signatures AS s ON s.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN multisignatures AS m ON m.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN dapps AS dapp ON dapp.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN intransfer AS it ON it.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN outtransfer AS ot ON ot.\"transactionId\" = t.\"id\" " +
			"WHERE b.\"height\" >= ${offset} AND b.\"height\" < ${limit} " +
			"ORDER BY b.\"height\""
			, params).then(function (rows) {
				var blocks = private.readDbRows(rows);

				async.eachSeries(blocks, function (block, cb) {
					async.series([
						function (cb) {
							if (block.id != genesisblock.block.id) {
								if (verify) {
									if (block.previousBlock != private.lastBlock.id) {
										return cb({
											message: "Can't verify previous block",
											block: block
										});
									}

									try {
										var valid = library.logic.block.verifySignature(block);
									} catch (e) {
										return setImmediate(cb, {
											message: e.toString(),
											block: block
										});
									}
									if (!valid) {
										// Need to break cycle and delete this block and blocks after this block
										return cb({
											message: "Can't verify signature",
											block: block
										});
									}

									modules.delegates.validateBlockSlot(block, function (err) {
										if (err) {
											return cb({
												message: "Can't verify slot",
												block: block
											});
										}
										cb();
									});
								} else {
									setImmediate(cb);
								}
							} else {
								setImmediate(cb);
							}
						}, function (cb) {
							block.transactions = block.transactions.sort(function (a, b) {
								if (block.id == genesisblock.block.id) {
									if (a.type == TransactionTypes.VOTE)
										return 1;
								}

								if (a.type == TransactionTypes.SIGNATURE) {
									return 1;
								}

								return 0;
							});

							async.eachSeries(block.transactions, function (transaction, cb) {
								if (verify) {
									modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
										if (err) {
											return cb({
												message: err,
												transaction: transaction,
												block: block
											});
										}
										if (verify && block.id != genesisblock.block.id) {
											library.logic.transaction.verify(transaction, sender, function (err) {
												if (err) {
													return setImmediate(cb, {
														message: err,
														transaction: transaction,
														block: block
													});
												}
												private.applyTransaction(block, transaction, sender, cb);
											});
										} else {
											private.applyTransaction(block, transaction, sender, cb);
										}
									});
								} else {
									setImmediate(cb);
								}
							}, function (err) {
								if (err) {
									library.logger.error(err);
									var lastValidTransaction = block.transactions.findIndex(function (trs) {
										return trs.id == err.transaction.id;
									});
									var transactions = block.transactions.slice(0, lastValidTransaction + 1);
									async.eachSeries(transactions.reverse(), function (transaction, cb) {
										async.series([
											function (cb) {
												modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
													if (err) {
														return cb(err);
													}
													modules.transactions.undo(transaction, block, sender, cb);
												});
											}, function (cb) {
												modules.transactions.undoUnconfirmed(transaction, cb);
											}
										], cb);
									}, cb);
								} else {
									private.lastBlock = block;

									modules.round.tick(private.lastBlock, cb);
								}
							});
						}
					], cb);
				}, function (err) {
					cb(err, private.lastBlock);
				});
		}).catch(function (err) {
			// Notes:
			// If while loading we encounter an error, for example, an invalid signature on a block & transaction, then we need to stop loading and remove all blocks after the last good block. We also need to process all transactions within the block.
			return cb("Blocks#loadBlocksOffset error");
		});
	}, cb);
}

Blocks.prototype.loadLastBlock = function (cb) {
	library.dbSequence.add(function (cb) {
		library.db.query("SELECT " +
			"b.\"id\" AS \"b_id\", b.\"version\" AS \"b_version\", b.\"timestamp\" AS \"b_timestamp\", b.\"height\" AS \"b_height\", b.\"previousBlock\" AS \"b_previousBlock\", b.\"numberOfTransactions\" AS \"b_numberOfTransactions\", b.\"totalAmount\" AS \"b_totalAmount\", b.\"totalFee\" AS \"b_totalFee\", b.\"reward\" AS \"b_reward\", b.\"payloadLength\" AS \"b_payloadLength\", ENCODE(b.\"payloadHash\", 'hex') AS \"b_payloadHash\", ENCODE(b.\"generatorPublicKey\", 'hex') AS \"b_generatorPublicKey\", ENCODE(b.\"blockSignature\", 'hex') AS \"b_blockSignature\", " +
			"t.\"id\" AS \"t_id\", t.\"type\" AS \"t_type\", t.\"timestamp\" AS \"t_timestamp\", ENCODE(t.\"senderPublicKey\", 'hex') AS \"t_senderPublicKey\", t.\"senderId\" AS \"t_senderId\", t.\"recipientId\" AS \"t_recipientId\", t.\"amount\" AS \"t_amount\", t.\"fee\" AS \"t_fee\", ENCODE(t.\"signature\", 'hex') AS \"t_signature\", ENCODE(t.\"signSignature\", 'hex') AS \"t_signSignature\", " +
			"ENCODE(s.\"publicKey\", 'hex') AS \"s_publicKey\", " +
			"d.\"username\" AS \"d_username\", " +
			"v.\"votes\" AS \"v_votes\", " +
			"m.\"min\" AS \"m_min\", m.\"lifetime\" AS \"m_lifetime\", m.\"keysgroup\" AS \"m_keysgroup\", " +
			"dapp.\"name\" AS \"dapp_name\", dapp.\"description\" AS \"dapp_description\", dapp.\"tags\" AS \"dapp_tags\", dapp.\"type\" AS \"dapp_type\", dapp.\"link\" AS \"dapp_link\", dapp.\"category\" AS \"dapp_category\", dapp.\"icon\" AS \"dapp_icon\", " +
			"it.\"dappId\" AS \"in_dappId\", " +
			"ot.\"dappId\" AS \"ot_dappId\", ot.\"outTransactionId\" AS \"ot_outTransactionId\", " +
			"ENCODE(t.\"requesterPublicKey\", 'hex') AS \"t_requesterPublicKey\", t.\"signatures\" AS \"t_signatures\" " +
			"FROM blocks b " +
			"LEFT OUTER JOIN trs AS t ON t.\"blockId\" = b.\"id\" " +
			"LEFT OUTER JOIN delegates AS d ON d.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN votes AS v ON v.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN signatures AS s ON s.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN multisignatures AS m ON m.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN dapps AS dapp ON dapp.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN intransfer AS it ON it.\"transactionId\" = t.\"id\" " +
			"LEFT OUTER JOIN outtransfer AS ot ON ot.\"transactionId\" = t.\"id\" " +
			"WHERE b.\"height\" = (SELECT MAX(\"height\") FROM blocks) " +
			"ORDER BY b.\"height\"").then(function (rows) {

			var block = private.readDbRows(rows)[0];

			block.transactions = block.transactions.sort(function (a, b) {
				if (block.id == genesisblock.block.id) {
					if (a.type == TransactionTypes.VOTE)
						return 1;
				}

				if (a.type == TransactionTypes.SIGNATURE) {
					return 1;
				}

				return 0;
			});

			cb(null, block);

		}).catch(function (err) {
			return cb("Blocks#loadLastBlock error");
		});
	}, cb);
}

Blocks.prototype.getLastBlock = function () {
	return private.lastBlock;
}

Blocks.prototype.processBlock = function (block, broadcast, cb) {
	if (!private.loaded) {
		return setImmediate(cb, "Blockchain is loading");
	}
	private.isActive = true;
	library.balancesSequence.add(function (cb) {
		try {
			block.id = library.logic.block.getId(block);
		} catch (e) {
			private.isActive = false;
			return setImmediate(cb, e.toString());
		}
		block.height = private.lastBlock.height + 1;

		modules.transactions.undoUnconfirmedList(function (err, unconfirmedTransactions) {
			if (err) {
				private.isActive = false;
				return process.exit(0);
			}

			function done(err) {
				modules.transactions.applyUnconfirmedList(unconfirmedTransactions, function () {
					private.isActive = false;
					setImmediate(cb, err);
				});
			}

			if (!block.previousBlock && block.height != 1) {
				return setImmediate(done, "Invalid previous block");
			}

			var expectedReward = private.blockReward.calcReward(block.height);

			if (block.height != 1 && expectedReward !== block.reward) {
				return setImmediate(done, "Invalid block reward");
			}

			library.db.query("SELECT \"id\" FROM blocks WHERE \"id\" = ${id}", { id: block.id }).then(function (rows) {
				var bId = rows.length && rows[0].id;

				if (bId) {
					return done("Block already exists: " + block.id);
				}

				try {
					var valid = library.logic.block.verifySignature(block);
				} catch (e) {
					return setImmediate(cb, e.toString());
				}
				if (!valid) {
					return done("Can't verify signature: " + block.id);
				}

				if (block.previousBlock != private.lastBlock.id) {
					// Fork same height and different previous block
					modules.delegates.fork(block, 1);
					return done("Can't verify previous block: " + block.id);
				}

				if (block.version > 0) {
					return done("Invalid block version: " + block.id)
				}

				var blockSlotNumber = slots.getSlotNumber(block.timestamp);
				var lastBlockSlotNumber = slots.getSlotNumber(private.lastBlock.timestamp);

				if (blockSlotNumber > slots.getSlotNumber() || blockSlotNumber <= lastBlockSlotNumber) {
					return done("Can't verify block timestamp: " + block.id);
				}

				modules.delegates.validateBlockSlot(block, function (err) {
					if (err) {
						// Fork another delegate's slot
						modules.delegates.fork(block, 3);
						return done("Can't verify slot: " + block.id);
					}
					if (block.payloadLength > constants.maxPayloadLength) {
						return done("Can't verify payload length of block: " + block.id);
					}

					if (block.transactions.length != block.numberOfTransactions || block.transactions.length > constants.maxTxsPerBlock) {
						return done("Invalid amount of block assets: " + block.id);
					}

					// Check payload hash, transaction, number of confirmations
					var totalAmount = 0, totalFee = 0, payloadHash = crypto.createHash('sha256'), appliedTransactions = {}, acceptedRequests = {}, acceptedConfirmations = {};

					async.eachSeries(block.transactions, function (transaction, cb) {
						try {
							transaction.id = library.logic.transaction.getId(transaction);
						} catch (e) {
							return setImmediate(cb, e.toString());
						}

						transaction.blockId = block.id;

						library.db.query("SELECT \"id\" FROM trs WHERE \"id\" = ${id}", { id: transaction.id }).then(function (rows) {
								var tId = rows.length && rows[0].id;

								if (tId) {
									// Fork transactions already exist
									modules.delegates.fork(block, 2);
									setImmediate(cb, "Transaction already exists: " + transaction.id);
								} else {
									if (appliedTransactions[transaction.id]) {
										return setImmediate(cb, "Duplicated transaction in block: " + transaction.id);
									}

									modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
										if (err) {
											return cb(err);
										}

										library.logic.transaction.verify(transaction, sender, function (err) {
											if (err) {
												return setImmediate(cb, err);
											}

											modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
												if (err) {
													return setImmediate(cb, "Failed to apply transaction: " + transaction.id);
												}

												try {
													var bytes = library.logic.transaction.getBytes(transaction);
												} catch (e) {
													return setImmediate(cb, e.toString());
												}

												appliedTransactions[transaction.id] = transaction;

												var index = unconfirmedTransactions.indexOf(transaction.id);
												if (index >= 0) {
													unconfirmedTransactions.splice(index, 1);
												}

												payloadHash.update(bytes);

												totalAmount += transaction.amount;
												totalFee += transaction.fee;

												setImmediate(cb);
											});
										});
									});
								}
							}
						).catch(function (err) {
							return cb("Blocks#processBlock error");
						});
					}, function (err) {
						var errors = [];

						if (err) {
							errors.push(err);
						}

						if (payloadHash.digest().toString('hex') !== block.payloadHash) {
							errors.push("Invalid payload hash: " + block.id);
						}

						if (totalAmount != block.totalAmount) {
							errors.push("Invalid total amount: " + block.id);
						}

						if (totalFee != block.totalFee) {
							errors.push("Invalid total fee: " + block.id);
						}

						if (errors.length > 0) {
							async.eachSeries(block.transactions, function (transaction, cb) {
								if (appliedTransactions[transaction.id]) {
									modules.transactions.undoUnconfirmed(transaction, cb);
								} else {
									setImmediate(cb);
								}
							}, function () {
								done(errors[0]);
							});
						} else {
							try {
								block = library.logic.block.objectNormalize(block);
							} catch (e) {
								return setImmediate(done, e);
							}

							async.eachSeries(block.transactions, function (transaction, cb) {
								modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
									if (err) {
										library.logger.error("Failed to apply transactions: " + transaction.id);
										process.exit(0);
									}
									modules.transactions.apply(transaction, block, sender, function (err) {
										if (err) {
											library.logger.error("Failed to apply transactions: " + transaction.id);
											process.exit(0);
										}
										modules.transactions.removeUnconfirmedTransaction(transaction.id);
										setImmediate(cb);
									});
								});
							}, function (err) {
								private.saveBlock(block, function (err) {
									if (err) {
										library.logger.error("Failed to save block...");
										library.logger.error(err);
										process.exit(0);
									}

									library.bus.message('newBlock', block, broadcast);
									private.lastBlock = block;

									modules.round.tick(block, done);
									// setImmediate(done);
								});
							});
						}
					});
				});
			}).catch(function (err) {
				return done("Blocks#processBlock error");
			});
		});
	}, cb);
}

Blocks.prototype.simpleDeleteAfterBlock = function (blockId, cb) {
	library.db.query("DELETE FROM blocks WHERE \"height\" >= (SELECT \"height\" FROM blocks WHERE \"id\" = ${id})", { id: blockId }).then(function (res) {
		return cb(null, res);
	}).catch(function (err) {
		return cb("Blocks#simpleDeleteAfterBlock error");
	});
}

Blocks.prototype.loadBlocksFromPeer = function (peer, lastCommonBlockId, cb) {
	var loaded = false;
	var count = 0;
	var lastValidBlock = null;

	async.whilst(
		function () {
			return !loaded && count < 30;
		},
		function (next) {
			count++;
			modules.transport.getFromPeer(peer, {
				method: "GET",
				api: '/blocks?lastBlockId=' + lastCommonBlockId
			}, function (err, data) {
				if (err || data.body.error) {
					return next(err || data.body.error.toString());
				}

				var blocks = data.body.blocks;

				var report = library.scheme.validate(blocks, {
					type: "array"
				});

				if (!report) {
					return next("Received invalid blocks data");
				}

				blocks = private.readDbRows(blocks);

				if (blocks.length == 0) {
					loaded = true;
					next();
				} else {
					var peerStr = data.peer ? data.peer.ip + ":" + data.peer.port : 'unknown';
					library.logger.log('Loading ' + blocks.length + ' blocks from', peerStr);

					async.eachSeries(blocks, function (block, cb) {
						try {
							block = library.logic.block.objectNormalize(block);
						} catch (e) {
							library.logger.log('Block ' + (block ? block.id : 'null') + ' is not valid, ban 60 min', peerStr);
							modules.peer.state(peer.ip, peer.port, 0, 3600);
							return cb(e);
						}
						self.processBlock(block, false, function (err) {
							if (!err) {
								lastCommonBlockId = block.id;
								lastValidBlock = block;
								library.logger.log('Block ' + block.id + ' loaded from ' + peerStr + ' at', block.height);
							} else {
								library.logger.log('Block ' + (block ? block.id : 'null') + ' is not valid, ban 60 min', peerStr);
								modules.peer.state(peer.ip, peer.port, 0, 3600);
							}

							return cb(err);
						});
					}, next);
				}
			});
		},
		function (err) {
			setImmediate(cb, err, lastValidBlock);
		}
	)
}

Blocks.prototype.deleteBlocksBefore = function (block, cb) {
	var blocks = [];

	async.whilst(
		function () {
			return !(block.height >= private.lastBlock.height)
		},
		function (next) {
			blocks.unshift(private.lastBlock);
			private.popLastBlock(private.lastBlock, function (err, newLastBlock) {
				private.lastBlock = newLastBlock;
				next(err);
			});
		},
		function (err) {
			setImmediate(cb, err, blocks);
		}
	);
}

Blocks.prototype.generateBlock = function (keypair, timestamp, cb) {
	var transactions = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	var ready = [];

	async.eachSeries(transactions, function (transaction, cb) {
		modules.accounts.getAccount({ publicKey: transaction.senderPublicKey }, function (err, sender) {
			if (err || !sender) {
				return cb("Invalid sender");
			}

			if (library.logic.transaction.ready(transaction, sender)) {
				library.logic.transaction.verify(transaction, sender, function (err) {
					ready.push(transaction);
					cb();
				});
			} else {
				setImmediate(cb);
			}
		});
	}, function () {
		try {
			var block = library.logic.block.create({
				keypair: keypair,
				timestamp: timestamp,
				previousBlock: private.lastBlock,
				transactions: ready
			});
		} catch (e) {
			return setImmediate(cb, e);
		}

		self.processBlock(block, true, cb);
	});
}

Blocks.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(shared, call, args, cb);
}

// Events
Blocks.prototype.onReceiveBlock = function (block) {
	if (modules.loader.syncing() || !private.loaded) {
		return;
	}

	library.sequence.add(function (cb) {
		if (block.previousBlock == private.lastBlock.id && private.lastBlock.height + 1 == block.height) {
			library.logger.log('Received new block id: ' + block.id + ' height: ' + block.height + ' slot: ' + slots.getSlotNumber(block.timestamp) + ' reward: ' + modules.blocks.getLastBlock().reward)
			self.processBlock(block, true, cb);
		} else if (block.previousBlock != private.lastBlock.id && private.lastBlock.height + 1 == block.height) {
			// Fork right height and different previous block
			modules.delegates.fork(block, 1);
			cb("Fork");
		} else if (block.previousBlock == private.lastBlock.previousBlock && block.height == private.lastBlock.height && block.id != private.lastBlock.id) {
			// Fork same height and same previous block, but different block id
			modules.delegates.fork(block, 5);
			cb("Fork");
		} else {
			cb();
		}
	});
}

Blocks.prototype.onBind = function (scope) {
	modules = scope;

	private.loaded = true;
}

Blocks.prototype.cleanup = function (cb) {
	private.loaded = false;
	if (!private.isActive) {
		cb();
	} else {
		setImmediate(function nextWatch() {
			if (private.isActive) {
				setTimeout(nextWatch, 1 * 1000)
			} else {
				cb();
			}
		});
	}
}

// Shared
shared.getBlock = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			id: {
				type: 'string',
				minLength: 1
			}
		},
		required: ["id"]
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		library.dbSequence.add(function (cb) {
			private.getById(query.id, function (err, block) {
				if (!block || err) {
					return cb("Block not found");
				}
				cb(null, {block: block});
			});
		}, cb);
	});
}

shared.getBlocks = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body;
	library.scheme.validate(query, {
		type: "object",
		properties: {
			limit: {
				type: "integer",
				minimum: 0,
				maximum: 100
			},
			orderBy: {
				type: "string"
			},
			offset: {
				type: "integer",
				minimum: 0
			},
			generatorPublicKey: {
				type: "string",
				format: "publicKey"
			},
			totalAmount: {
				type: "integer",
				minimum: 0,
				maximum: constants.totalAmount
			},
			totalFee: {
				type: "integer",
				minimum: 0,
				maximum: constants.totalAmount
			},
			reward: {
				type: "integer",
				minimum: 0
			},
			previousBlock: {
				type: "string"
			},
			height: {
				type: "integer"
			}
		}
	}, function (err) {
		if (err) {
			return cb(err[0].message);
		}

		library.dbSequence.add(function (cb) {
			private.list(query, function (err, data) {
				if (err) {
					return cb(err);
				}
				cb(null, {blocks: data.blocks, count: data.count});
			});
		}, cb);
	});
}

shared.getHeight = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body;
	cb(null, {height: private.lastBlock.height});
}

shared.getFee = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body;
	cb(null, {fee: library.logic.block.calculateFee()});
}

shared.getMilestone = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body, height = private.lastBlock.height;
	cb(null, {milestone: private.blockReward.calcMilestone(height)});
}

shared.getReward = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body, height = private.lastBlock.height;
	cb(null, {reward: private.blockReward.calcReward(height)});
}

shared.getSupply = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body, height = private.lastBlock.height;
	cb(null, {supply: private.blockReward.calcSupply(height)});
}

shared.getStatus = function (req, cb) {
	if (!private.loaded) {
		cb("Blockchain is loading")
	}
	var query = req.body, height = private.lastBlock.height;
	cb(null, {
		height:    height,
		fee:       library.logic.block.calculateFee(),
		milestone: private.blockReward.calcMilestone(height),
		reward:    private.blockReward.calcReward(height),
		supply:    private.blockReward.calcSupply(height)
	});
}

// Export
module.exports = Blocks;
