'use strict';

var _ = require('lodash');
var async = require('async');
var BlockReward = require('../logic/blockReward.js');
var constants = require('../helpers/constants.js');
var crypto = require('crypto');
var exceptions = require('../helpers/exceptions.js');
var genesisblock = null;
var Inserts = require('../helpers/inserts.js');
var ip = require('ip');
var OrderBy = require('../helpers/orderBy.js');
var sandboxHelper = require('../helpers/sandbox.js');
var schema = require('../schema/blocks.js');
var slots = require('../helpers/slots.js');
var sql = require('../sql/blocks.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {};

__private.lastBlock = {};
__private.lastReceipt = null;
__private.blockReward = new BlockReward();

// @formatter:off
__private.blocksDataFields = {
	'b_id': String,
	'b_version': Number,
	'b_timestamp': Number,
	'b_height': Number,
	'b_previousBlock': String,
	'b_numberOfTransactions': Number,
	'b_totalAmount': String,
	'b_totalFee': String,
	'b_reward': String,
	'b_payloadLength': Number,
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

__private.loaded = false;
__private.cleanup = false;
__private.isActive = false;

// Constructor
function Blocks (cb, scope) {
	library = scope;
	genesisblock = library.genesisblock;
	self = this;

	__private.saveGenesisBlock(function (err) {
		return setImmediate(cb, err, self);
	});
}

__private.list = function (filter, cb) {
	var params = {}, where = [];

	if (filter.generatorPublicKey) {
		where.push('"b_generatorPublicKey"::bytea = ${generatorPublicKey}');
		params.generatorPublicKey = filter.generatorPublicKey;
	}

	if (filter.numberOfTransactions) {
		where.push('"b_numberOfTransactions" = ${numberOfTransactions}');
		params.numberOfTransactions = filter.numberOfTransactions;
	}

	if (filter.previousBlock) {
		where.push('"b_previousBlock" = ${previousBlock}');
		params.previousBlock = filter.previousBlock;
	}

	if (filter.height === 0 || filter.height > 0) {
		where.push('"b_height" = ${height}');
		params.height = filter.height;
	}

	if (filter.totalAmount >= 0) {
		where.push('"b_totalAmount" = ${totalAmount}');
		params.totalAmount = filter.totalAmount;
	}

	if (filter.totalFee >= 0) {
		where.push('"b_totalFee" = ${totalFee}');
		params.totalFee = filter.totalFee;
	}

	if (filter.reward >= 0) {
		where.push('"b_reward" = ${reward}');
		params.reward = filter.reward;
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
	}

	var orderBy = OrderBy(
		(filter.orderBy || 'height:desc'), {
			sortFields: sql.sortFields,
			fieldPrefix: 'b_'
		}
	);

	if (orderBy.error) {
		return setImmediate(cb, orderBy.error);
	}

	library.db.query(sql.countList({
		where: where
	}), params).then(function (rows) {
		var count = rows[0].count;

		library.db.query(sql.list({
			where: where,
			sortField: orderBy.sortField,
			sortMethod: orderBy.sortMethod
		}), params).then(function (rows) {
			var blocks = [];

			for (var i = 0; i < rows.length; i++) {
				blocks.push(library.logic.block.dbRead(rows[i]));
			}

			var data = {
				blocks: blocks,
				count: count
			};

			return setImmediate(cb, null, data);
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#list error');
		});
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#list error');
	});
};

__private.readDbRows = function (rows) {
	var blocks = {};
	var order = [];

	for (var i = 0, length = rows.length; i < length; i++) {
		var block = library.logic.block.dbRead(rows[i]);

		if (block) {
			if (!blocks[block.id]) {
				if (block.id === genesisblock.block.id) {
					block.generationSignature = (new Array(65)).join('0');
				}

				order.push(block.id);
				blocks[block.id] = block;
			}

			var transaction = library.logic.transaction.dbRead(rows[i]);
			blocks[block.id].transactions = blocks[block.id].transactions || {};

			if (transaction) {
				if (!blocks[block.id].transactions[transaction.id]) {
					blocks[block.id].transactions[transaction.id] = transaction;
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
};

__private.getById = function (id, cb) {
	library.db.query(sql.getById, {id: id}).then(function (rows) {
		if (!rows.length) {
			return setImmediate(cb, 'Block not found');
		}

		var block = library.logic.block.dbRead(rows[0]);

		return setImmediate(cb, null, block);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#getById error');
	});
};

__private.getIdSequence = function (height, cb) {
	library.db.query(sql.getIdSequence(), {height: height, limit: 5, delegates: constants.activeDelegates}).then(function (rows) {
		if (rows.length === 0) {
			return setImmediate(cb, 'Failed to get id sequence for height: ' + height);
		}

		var ids = [];

		if (genesisblock && genesisblock.block) {
			var __genesisblock = {
				id: genesisblock.block.id,
				height: genesisblock.block.height
			};

			if (!_.includes(rows, __genesisblock.id)) {
				rows.push(__genesisblock);
			}
		}

		if (__private.lastBlock && !_.includes(rows, __private.lastBlock.id)) {
			rows.unshift({
				id: __private.lastBlock.id,
				height: __private.lastBlock.height
			});
		}

		rows.forEach(function (row) {
			if (!_.includes(ids, row.id)) {
				ids.push(row.id);
			}
		});

		return setImmediate(cb, null, { firstHeight: rows[0].height, ids: ids.join(',') });
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#getIdSequence error');
	});
};

__private.saveGenesisBlock = function (cb) {
	library.db.query(sql.getGenesisBlockId, { id: genesisblock.block.id }).then(function (rows) {
		var blockId = rows.length && rows[0].id;

		if (!blockId) {
			__private.saveBlock(genesisblock.block, function (err) {
				return setImmediate(cb, err);
			});
		} else {
			return setImmediate(cb);
		}
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#saveGenesisBlock error');
	});
};

// Apply the genesis block, provided it has been verified.
// Shortcuting the unconfirmed/confirmed states.
__private.applyGenesisBlock = function (block, cb) {
	block.transactions = block.transactions.sort(function (a, b) {
		if (a.type === transactionTypes.VOTE) {
			return 1;
		} else {
			return 0;
		}
	});
	var tracker = self.getBlockProgressLogger(block.transactions.length, block.transactions.length / 100, 'Genesis block loading');
	async.eachSeries(block.transactions, function (transaction, cb) {
		modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
			if (err) {
				return setImmediate(cb, {
					message: err,
					transaction: transaction,
					block: block
				});
			}
			__private.applyTransaction(block, transaction, sender, cb);
			tracker.applyNext();
		});
	}, function (err) {
		if (err) {
			// If genesis block is invalid, kill the node...
			return process.exit(0);
		} else {
			__private.lastBlock = block;
			modules.rounds.tick(__private.lastBlock, cb);
		}
	});
};

__private.saveBlock = function (block, cb) {
	library.db.tx(function (t) {
		var promise = library.logic.block.dbSave(block);
		var inserts = new Inserts(promise, promise.values);

		var promises = [
			t.none(inserts.template(), promise.values)
		];

		t = __private.promiseTransactions(t, block, promises);
		t.batch(promises);
	}).then(function () {
		return __private.afterSave(block, cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#saveBlock error');
	});
};

__private.promiseTransactions = function (t, block, blockPromises) {
	if (_.isEmpty(block.transactions)) {
		return t;
	}

	var transactionIterator = function (transaction) {
		transaction.blockId = block.id;
		return library.logic.transaction.dbSave(transaction);
	};

	var promiseGrouper = function (promise) {
		if (promise && promise.table) {
			return promise.table;
		} else {
			throw 'Invalid promise';
		}
	};

	var typeIterator = function (type) {
		var values = [];

		_.each(type, function (promise) {
			if (promise && promise.values) {
				values = values.concat(promise.values);
			} else {
				throw 'Invalid promise';
			}
		});

		var inserts = new Inserts(type[0], values, true);
		t.none(inserts.template(), inserts);
	};

	var promises = _.flatMap(block.transactions, transactionIterator);
	_.each(_.groupBy(promises, promiseGrouper), typeIterator);

	return t;
};

// Apply the block, provided it has been verified.
__private.applyBlock = function (block, broadcast, cb, saveBlock) {
	// Prevent shutdown during database writes.
	__private.isActive = true;

	// Transactions to rewind in case of error.
	var appliedTransactions = {};

	// List of unconfirmed transactions ids.
	var unconfirmedTransactionIds;

	async.series({
		// Rewind any unconfirmed transactions before applying block.
		// TODO: It should be possible to remove this call if we can guarantee that only this function is processing transactions atomically. Then speed should be improved further.
		// TODO: Other possibility, when we rebuild from block chain this action should be moved out of the rebuild function.
		undoUnconfirmedList: function (seriesCb) {
			modules.transactions.undoUnconfirmedList(function (err, ids) {
				if (err) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to undo unconfirmed list', err);
					return process.exit(0);
				} else {
					unconfirmedTransactionIds = ids;
					return setImmediate(seriesCb);
				}
			});
		},
		// Apply transactions to unconfirmed mem_accounts fields.
		applyUnconfirmed: function (seriesCb) {
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				// DATABASE write
				modules.accounts.setAccountAndGet({publicKey: transaction.senderPublicKey}, function (err, sender) {
					// DATABASE: write
					modules.transactions.applyUnconfirmed(transaction, sender, function (err) {
						if (err) {
							err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							return setImmediate(eachSeriesCb, err);
						}

						appliedTransactions[transaction.id] = transaction;

						// Remove the transaction from the node queue, if it was present.
						var index = unconfirmedTransactionIds.indexOf(transaction.id);
						if (index >= 0) {
							unconfirmedTransactionIds.splice(index, 1);
						}

						return setImmediate(eachSeriesCb);
					});
				});
			}, function (err) {
				if (err) {
					// Rewind any already applied unconfirmed transactions.
					// Leaves the database state as per the previous block.
					async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return setImmediate(eachSeriesCb, err);
							}
							// The transaction has been applied?
							if (appliedTransactions[transaction.id]) {
								// DATABASE: write
								library.logic.transaction.undoUnconfirmed(transaction, sender, eachSeriesCb);
							} else {
								return setImmediate(eachSeriesCb);
							}
						});
					}, function (err) {
						return setImmediate(seriesCb, err);
					});
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		// Block and transactions are ok.
		// Apply transactions to confirmed mem_accounts fields.
		applyConfirmed: function (seriesCb) {
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
					if (err) {
						err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
						library.logger.error(err);
						library.logger.error('Transaction', transaction);
						// Fatal error, memory tables will be inconsistent
						process.exit(0);
					}
					// DATABASE: write
					modules.transactions.apply(transaction, block, sender, function (err) {
						if (err) {
							err = ['Failed to apply transaction:', transaction.id, '-', err].join(' ');
							library.logger.error(err);
							library.logger.error('Transaction', transaction);
							// Fatal error, memory tables will be inconsistent
							process.exit(0);
						}
						// Transaction applied, removed from the unconfirmed list.
						modules.transactions.removeUnconfirmedTransaction(transaction.id);
						return setImmediate(eachSeriesCb);
					});
				});
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
		// Optionally save the block to the database.
		saveBlock: function (seriesCb) {
			__private.lastBlock = block;

			if (saveBlock) {
				// DATABASE: write
				__private.saveBlock(block, function (err) {
					if (err) {
						library.logger.error('Failed to save block...');
						library.logger.error('Block', block);
						// Fatal error, memory tables will be inconsistent
						process.exit(0);
					}

					library.logger.debug('Block applied correctly with ' + block.transactions.length + ' transactions');
					library.bus.message('newBlock', block, broadcast);

					// DATABASE write. Update delegates accounts
					modules.rounds.tick(block, seriesCb);
				});
			} else {
				library.bus.message('newBlock', block, broadcast);

				// DATABASE write. Update delegates accounts
				modules.rounds.tick(block, seriesCb);
			}
		},
		// Push back unconfirmed transactions list (minus the one that were on the block if applied correctly).
		// TODO: See undoUnconfirmedList discussion above.
		applyUnconfirmedIds: function (seriesCb) {
			// DATABASE write
			modules.transactions.applyUnconfirmedIds(unconfirmedTransactionIds, function (err) {
				return setImmediate(seriesCb, err);
			});
		},
	}, function (err) {
		// Allow shutdown, database writes are finished.
		__private.isActive = false;

		// Nullify large objects.
		// Prevents memory leak during synchronisation.
		appliedTransactions = unconfirmedTransactionIds = block = null;

		// Finish here if snapshotting.
		if (err === 'Snapshot finished') {
			library.logger.info(err);
			process.emit('SIGTERM');
		}

		return setImmediate(cb, err);
	});
};

__private.checkTransaction = function (block, transaction, cb) {
	async.waterfall([
		function (waterCb) {
			try {
				transaction.id = library.logic.transaction.getId(transaction);
			} catch (e) {
				return setImmediate(waterCb, e.toString());
			}
			transaction.blockId = block.id;
			return setImmediate(waterCb);
		},
		function (waterCb) {
			// Check if transaction is already in database, otherwise fork 2.
			// DATABASE: read only
			library.logic.transaction.checkConfirmed(transaction, function (err) {
				if (err) {
					// Fork: Transaction already confirmed.
					modules.delegates.fork(block, 2);
					// Undo the offending transaction.
					// DATABASE: write
					modules.transactions.undoUnconfirmed(transaction, function (err2) {
						modules.transactions.removeUnconfirmedTransaction(transaction.id);
						return setImmediate(waterCb, err2 || err);
					});
				} else {
					return setImmediate(waterCb);
				}
			});
		},
		function (waterCb) {
			// Get account from database if any (otherwise cold wallet).
			// DATABASE: read only
			modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, waterCb);
		},
		function (sender, waterCb) {
			// Check if transaction id valid against database state (mem_* tables).
			// DATABASE: read only
			library.logic.transaction.verify(transaction, sender, waterCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

__private.applyTransaction = function (block, transaction, sender, cb) {
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
					message: 'Failed to apply transaction: ' + transaction.id,
					transaction: transaction,
					block: block
				});
			}
			return setImmediate(cb);
		});
	});
};

__private.afterSave = function (block, cb) {
	async.eachSeries(block.transactions, function (transaction, cb) {
		return library.logic.transaction.afterSave(transaction, cb);
	}, function (err) {
		return setImmediate(cb, err);
	});
};

__private.popLastBlock = function (oldLastBlock, cb) {
	library.balancesSequence.add(function (cb) {
		self.loadBlocksPart({ id: oldLastBlock.previousBlock }, function (err, previousBlock) {
			if (err || !previousBlock.length) {
				return setImmediate(cb, err || 'previousBlock is null');
			}
			previousBlock = previousBlock[0];

			async.eachSeries(oldLastBlock.transactions.reverse(), function (transaction, cb) {
				async.series([
					function (cb) {
						modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, function (err, sender) {
							if (err) {
								return setImmediate(cb, err);
							}
							modules.transactions.undo(transaction, oldLastBlock, sender, cb);
						});
					}, function (cb) {
						modules.transactions.undoUnconfirmed(transaction, cb);
					}, function (cb) {
						return setImmediate(cb);
					}
				], cb);
			}, function (err) {
				if (err) {
					// Fatal error, memory tables will be inconsistent
					library.logger.error('Failed to undo transactions', err);
					return process.exit(0);
				}

				modules.rounds.backwardTick(oldLastBlock, previousBlock, function (err) {
					if (err) {
						// Fatal error, memory tables will be inconsistent
						library.logger.error('Failed to perform backwards tick', err);
						return process.exit(0);
					}

					__private.deleteBlock(oldLastBlock.id, function (err) {
						if (err) {
							// Fatal error, memory tables will be inconsistent
							library.logger.error('Failed to delete block', err);
							return process.exit(0);
						}

						return setImmediate(cb, null, previousBlock);
					});
				});
			});
		});
	}, cb);
};

__private.deleteBlock = function (blockId, cb) {
	library.db.none(sql.deleteBlock, {id: blockId}).then(function () {
		return setImmediate(cb);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteBlock error');
	});
};

__private.recoverChain = function (cb) {
	library.logger.warn('Chain comparison failed, starting recovery');
	self.deleteLastBlock(function (err, newLastBlock) {
		if (err) {
			library.logger.error('Recovery failed');
		} else {
			library.logger.info('Recovery complete, new last block', newLastBlock.id);
		}
		return setImmediate(cb, err);
	});
};

__private.receiveBlock = function (block, cb) {
	library.logger.info([
		'Received new block id:', block.id,
		'height:', block.height,
		'round:',  modules.rounds.calc(block.height),
		'slot:', slots.getSlotNumber(block.timestamp),
		'reward:', block.reward
	].join(' '));

	self.lastReceipt(new Date());
	self.processBlock(block, true, cb, true);
};

// Public methods
Blocks.prototype.count = function (cb) {
	library.db.query(sql.countByRowId).then(function (rows) {
		var res = rows.length ? rows[0].count : 0;

		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#count error');
	});
};

Blocks.prototype.getLastBlock = function () {
	if (__private.lastBlock) {
		var epoch = constants.epochTime / 1000;
		var lastBlockTime = epoch + __private.lastBlock.timestamp;
		var currentTime = new Date().getTime() / 1000;

		__private.lastBlock.secondsAgo = Math.round((currentTime - lastBlockTime) * 1e2) / 1e2;
		__private.lastBlock.fresh = (__private.lastBlock.secondsAgo < constants.blockReceiptTimeOut);
	}

	return __private.lastBlock;
};

Blocks.prototype.lastReceipt = function (lastReceipt) {
	if (lastReceipt) {
		__private.lastReceipt = lastReceipt;
	}

	if (__private.lastReceipt) {
		var timeNow = new Date();
		__private.lastReceipt.secondsAgo = Math.floor((timeNow.getTime() - __private.lastReceipt.getTime()) / 1000);
		__private.lastReceipt.secondsAgo = Math.round(__private.lastReceipt.secondsAgo * 1e2) / 1e2;
		__private.lastReceipt.stale = (__private.lastReceipt.secondsAgo > constants.blockReceiptTimeOut);
	}

	return __private.lastReceipt;
};

Blocks.prototype.getCommonBlock = function (peer, height, cb) {
	var comparisionFailed = false;

	async.waterfall([
		function (waterCb) {
			__private.getIdSequence(height, function (err, res) {
				return setImmediate(waterCb, err, res);
			});
		},
		function (res, waterCb) {
			var ids = res.ids;

			modules.transport.getFromPeer(peer, {
				api: '/blocks/common?ids=' + ids,
				method: 'GET'
			}, function (err, res) {
				if (err || res.body.error) {
					return setImmediate(waterCb, err || res.body.error.toString());
				} else if (!res.body.common) {
					comparisionFailed = true;
					return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using ids:', ids].join(' '));
				} else {
					return setImmediate(waterCb, null, res);
				}
			});
		},
		function (res, waterCb) {
			library.schema.validate(res.body.common, schema.getCommonBlock, function (err) {
				if (err) {
					return setImmediate(waterCb, err[0].message);
				} else {
					return setImmediate(waterCb, null, res);
				}
			});
		},
		function (res, waterCb) {
			library.db.query(sql.getCommonBlock(res.body.common.previousBlock), {
				id: res.body.common.id,
				previousBlock: res.body.common.previousBlock,
				height: res.body.common.height
			}).then(function (rows) {
				if (!rows.length || !rows[0].count) {
					comparisionFailed = true;
					return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using block:', JSON.stringify(res.body.common)].join(' '));
				} else {
					return setImmediate(waterCb, null, res.body.common);
				}
			}).catch(function (err) {
				library.logger.error(err.stack);
				return setImmediate(waterCb, 'Blocks#getCommonBlock error');
			});
		}
	], function (err, res) {
		if (comparisionFailed && modules.transport.poorConsensus()) {
			return __private.recoverChain(cb);
		} else {
			return setImmediate(cb, err, res);
		}
	});
};

Blocks.prototype.loadBlocksFromPeer = function (peer, cb) {
	var lastValidBlock = __private.lastBlock;

	peer = library.logic.peers.create(peer);
	library.logger.info('Loading blocks from: ' + peer.string);

	function getFromPeer (seriesCb) {
		modules.transport.getFromPeer(peer, {
			method: 'GET',
			api: '/blocks?lastBlockId=' + lastValidBlock.id
		}, function (err, res) {
			err = err || res.body.error;
			if (err) {
				return setImmediate(seriesCb, err);
			} else {
				return setImmediate(seriesCb, null, res.body.blocks);
			}
		});
	}

	function validateBlocks (blocks, seriesCb) {
		var report = library.schema.validate(blocks, schema.loadBlocksFromPeer);

		if (!report) {
			return setImmediate(seriesCb, 'Received invalid blocks data');
		} else {
			return setImmediate(seriesCb, null, blocks);
		}
	}

	function processBlocks (blocks, seriesCb) {
		if (blocks.length === 0) {
			return setImmediate(seriesCb);
		}
		async.eachSeries(__private.readDbRows(blocks), function (block, eachSeriesCb) {
			if (__private.cleanup) {
				return setImmediate(eachSeriesCb);
			} else {
				return processBlock(block, eachSeriesCb);
			}
		}, function (err) {
			return setImmediate(seriesCb, err);
		});
	}

	function processBlock (block, seriesCb) {
		self.processBlock(block, false, function (err) {
			if (!err) {
				lastValidBlock = block;
				library.logger.info(['Block', block.id, 'loaded from:', peer.string].join(' '), 'height: ' + block.height);
			} else {
				var id = (block ? block.id : 'null');

				library.logger.debug('Block processing failed', {id: id, err: err.toString(), module: 'blocks', block: block});
			}
			return seriesCb(err);
		}, true);
	}

	async.waterfall([
		getFromPeer,
		validateBlocks,
		processBlocks
	], function (err) {
		if (err) {
			return setImmediate(cb, 'Error loading blocks: ' + (err.message || err), lastValidBlock);
		} else {
			return setImmediate(cb, null, lastValidBlock);
		}
	});
};

Blocks.prototype.loadBlocksData = function (filter, options, cb) {
	if (arguments.length < 3) {
		cb = options;
		options = {};
	}

	options = options || {};

	var params = { limit: filter.limit || 1 };

	if (filter.id && filter.lastId) {
		return setImmediate(cb, 'Invalid filter: Received both id and lastId');
	} else if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}

	var fields = __private.blocksDataFields;

	library.dbSequence.add(function (cb) {
		library.db.query(sql.getHeightByLastId, { lastId: filter.lastId || null }).then(function (rows) {

			var height = rows.length ? rows[0].height : 0;
			var realLimit = height + (parseInt(filter.limit) || 1);

			params.limit = realLimit;
			params.height = height;

			library.db.query(sql.loadBlocksData(filter), params).then(function (rows) {
				return setImmediate(cb, null, rows);
			});
		}).catch(function (err ) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlockData error');
		});
	}, cb);
};

Blocks.prototype.loadBlocksPart = function (filter, cb) {
	self.loadBlocksData(filter, function (err, rows) {
		var blocks = [];

		if (!err) {
			blocks = __private.readDbRows(rows);
		}

		return setImmediate(cb, err, blocks);
	});
};

Blocks.prototype.loadBlocksOffset = function (limit, offset, verify, cb) {
	var newLimit = limit + (offset || 0);
	var params = { limit: newLimit, offset: offset || 0 };

	library.logger.debug('Loading blocks offset', {limit: limit, offset: offset, verify: verify});
	library.dbSequence.add(function (cb) {
		library.db.query(sql.loadBlocksOffset, params).then(function (rows) {
			var blocks = __private.readDbRows(rows);

			async.eachSeries(blocks, function (block, cb) {
				if (__private.cleanup) {
					return setImmediate(cb);
				}

				library.logger.debug('Processing block', block.id);
				if (verify && block.id !== genesisblock.block.id) {
					// Sanity check of the block, if values are coherent.
					// No access to database.
					var check = self.verifyBlock(block);

					if (!check.verified) {
						library.logger.error(['Block', block.id, 'verification failed'].join(' '), check.errors.join(', '));
						return setImmediate(cb, check.errors[0]);
					}
				}
				if (block.id === genesisblock.block.id) {
					__private.applyGenesisBlock(block, cb);
				} else {
					__private.applyBlock(block, false, cb, false);
				}
				__private.lastBlock = block;
			}, function (err) {
				return setImmediate(cb, err, __private.lastBlock);
			});
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlocksOffset error');
		});
	}, cb);
};

Blocks.prototype.deleteLastBlock = function (cb) {
	library.logger.warn('Deleting last block', __private.lastBlock);

	if (__private.lastBlock.height === 1) {
		return setImmediate(cb, 'Can not delete genesis block');
	}

	async.series({
		popLastBlock: function (seriesCb) {
			__private.popLastBlock(__private.lastBlock, function (err, newLastBlock) {
				if (err) {
					library.logger.error('Error deleting last block', __private.lastBlock);
					return setImmediate(seriesCb, err);
				} else {
					__private.lastBlock = newLastBlock;
					return setImmediate(seriesCb);
				}
			});
		}
	}, function (err) {
		return setImmediate(cb, err, __private.lastBlock);
	});
};

Blocks.prototype.loadLastBlock = function (cb) {
	library.dbSequence.add(function (cb) {
		library.db.query(sql.loadLastBlock).then(function (rows) {
			var block = __private.readDbRows(rows)[0];

			block.transactions = block.transactions.sort(function (a, b) {
				if (block.id === genesisblock.block.id) {
					if (a.type === transactionTypes.VOTE) {
						return 1;
					}
				}

				if (a.type === transactionTypes.SIGNATURE) {
					return 1;
				}

				return 0;
			});

			__private.lastBlock = block;
			return setImmediate(cb, null, block);
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadLastBlock error');
		});
	}, cb);
};

Blocks.prototype.generateBlock = function (keypair, timestamp, cb) {
	var transactions = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	var ready = [];

	async.eachSeries(transactions, function (transaction, cb) {
		modules.accounts.getAccount({ publicKey: transaction.senderPublicKey }, function (err, sender) {
			if (err || !sender) {
				return setImmediate(cb, 'Sender not found');
			}

			if (library.logic.transaction.ready(transaction, sender)) {
				library.logic.transaction.verify(transaction, sender, function (err) {
					ready.push(transaction);
					return setImmediate(cb);
				});
			} else {
				return setImmediate(cb);
			}
		});
	}, function () {
		var block;

		try {
			block = library.logic.block.create({
				keypair: keypair,
				timestamp: timestamp,
				previousBlock: __private.lastBlock,
				transactions: ready
			});
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, e);
		}

		self.processBlock(block, true, cb, true);
	});
};

// Main function to process a Block.
// * Verify the block looks ok
// * Verify the block is compatible with database state (DATABASE readonly)
// * Apply the block to database if both verifications are ok
Blocks.prototype.processBlock = function (block, broadcast, cb, saveBlock) {
	if (__private.cleanup) {
		return setImmediate(cb, 'Cleaning up');
	} else if (!__private.loaded) {
		return setImmediate(cb, 'Blockchain is loading');
	}

	async.series({
		normalizeBlock: function (seriesCb) {
			try {
				block = library.logic.block.objectNormalize(block);
			} catch (err) {
				return setImmediate(seriesCb, err);
			}

			return setImmediate(seriesCb);
		},
		verifyBlock: function (seriesCb) {
			// Sanity check of the block, if values are coherent.
			// No access to database
			var check = self.verifyBlock(block);

			if (!check.verified) {
				library.logger.error(['Block', block.id, 'verification failed'].join(' '), check.errors.join(', '));
				return setImmediate(seriesCb, check.errors[0]);
			}

			return setImmediate(seriesCb);
		},
		checkExists: function (seriesCb) {
			// Check if block id is already in the database (very low probability of hash collision).
			// TODO: In case of hash-collision, to me it would be a special autofork...
			// DATABASE: read only
			library.db.query(sql.getBlockId, { id: block.id }).then(function (rows) {
				if (rows.length > 0) {
					return setImmediate(seriesCb, ['Block', block.id, 'already exists'].join(' '));
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		validateBlockSlot: function (seriesCb) {
			// Check if block was generated by the right active delagate. Otherwise, fork 3.
			// DATABASE: Read only to mem_accounts to extract active delegate list
			modules.delegates.validateBlockSlot(block, function (err) {
				if (err) {
					// Fork: Delegate does not match calculated slot.
					modules.delegates.fork(block, 3);
					return setImmediate(seriesCb, err);
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		checkTransactions: function (seriesCb) {
			// Check against the mem_* tables that we can perform the transactions included in the block.
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				__private.checkTransaction(block, transaction, eachSeriesCb);
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		}
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			// The block and the transactions are OK i.e:
			// * Block and transactions have valid values (signatures, block slots, etc...)
			// * The check against database state passed (for instance sender has enough LSK, votes are under 101, etc...)
			// We thus update the database with the transactions values, save the block and tick it.
			__private.applyBlock(block, broadcast, cb, saveBlock);
		}
	});
};

// Will return all possible errors that are intrinsic to the block.
// NO DATABASE access
Blocks.prototype.verifyBlock = function (block) {
	var result = { verified: false, errors: [] };

	try {
		block.id = library.logic.block.getId(block);
	} catch (e) {
		result.errors.push(e.toString());
	}

	block.height = __private.lastBlock.height + 1;

	if (!block.previousBlock && block.height !== 1) {
		result.errors.push('Invalid previous block');
	} else if (block.previousBlock !== __private.lastBlock.id) {
		// Fork: Same height but different previous block id.
		modules.delegates.fork(block, 1);
		result.errors.push(['Invalid previous block:', block.previousBlock, 'expected:', __private.lastBlock.id].join(' '));
	}

	var expectedReward = __private.blockReward.calcReward(block.height);

	if (block.height !== 1 && expectedReward !== block.reward && !_.includes(exceptions.blockRewards, block.id)) {
		result.errors.push(['Invalid block reward:', block.reward, 'expected:', expectedReward].join(' '));
	}

	var valid;

	try {
		valid = library.logic.block.verifySignature(block);
	} catch (e) {
		result.errors.push(e.toString());
	}

	if (!valid) {
		result.errors.push('Failed to verify block signature');
	}

	if (block.version > 0) {
		result.errors.push('Invalid block version');
	}

	var blockSlotNumber = slots.getSlotNumber(block.timestamp);
	var lastBlockSlotNumber = slots.getSlotNumber(__private.lastBlock.timestamp);

	if (blockSlotNumber > slots.getSlotNumber() || blockSlotNumber <= lastBlockSlotNumber) {
		result.errors.push('Invalid block timestamp');
	}

	if (block.payloadLength > constants.maxPayloadLength) {
		result.errors.push('Payload length is too high');
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		result.errors.push('Invalid number of transactions');
	}

	if (block.transactions.length > constants.maxTxsPerBlock) {
		result.errors.push('Transactions length is too high');
	}

	// Checking if transactions of the block adds up to block values.
	var totalAmount = 0,
	    totalFee = 0,
	    payloadHash = crypto.createHash('sha256'),
	    appliedTransactions = {};

	for (var i in block.transactions) {
		var transaction = block.transactions[i];
		var bytes;

		try {
			bytes = library.logic.transaction.getBytes(transaction);
		} catch (e) {
			result.errors.push(e.toString());
		}

		if (appliedTransactions[transaction.id]) {
			result.errors.push('Encountered duplicate transaction: ' + transaction.id);
		}

		appliedTransactions[transaction.id] = transaction;
		if (bytes) { payloadHash.update(bytes); }
		totalAmount += transaction.amount;
		totalFee += transaction.fee;
	}

	if (payloadHash.digest().toString('hex') !== block.payloadHash) {
		result.errors.push('Invalid payload hash');
	}

	if (totalAmount !== block.totalAmount) {
		result.errors.push('Invalid total amount');
	}

	if (totalFee !== block.totalFee) {
		result.errors.push('Invalid total fee');
	}

	result.verified = result.errors.length === 0;
	return result;
};

Blocks.prototype.deleteBlocksBefore = function (block, cb) {
	var blocks = [];

	async.series({
		popBlocks: function (seriesCb) {
			async.whilst(
				function () {
					return (block.height < __private.lastBlock.height);
				},
				function (next) {
					blocks.unshift(__private.lastBlock);
					__private.popLastBlock(__private.lastBlock, function (err, newLastBlock) {
						__private.lastBlock = newLastBlock;
						next(err);
					});
				},
				function (err) {
					return setImmediate(seriesCb, err, blocks);
				}
			);
		}
	});
};

Blocks.prototype.deleteAfterBlock = function (blockId, cb) {
	library.db.query(sql.deleteAfterBlock, {id: blockId}).then(function (res) {
		return setImmediate(cb, null, res);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#deleteAfterBlock error');
	});
};

Blocks.prototype.sandboxApi = function (call, args, cb) {
	sandboxHelper.callMethod(Blocks.prototype.shared, call, args, cb);
};

// Events
Blocks.prototype.onReceiveBlock = function (block) {
	library.sequence.add(function (cb) {
		// When client is not loaded, is syncing or round is ticking
		// Do not receive new blocks as client is not ready
		if (!__private.loaded || modules.loader.syncing() || modules.rounds.ticking()) {
			library.logger.debug('Client not ready to receive block', block.id);
			return setImmediate(cb);
		}

		if (block.previousBlock === __private.lastBlock.id && __private.lastBlock.height + 1 === block.height) {
			return __private.receiveBlock(block, cb);
		} else if (block.previousBlock !== __private.lastBlock.id && __private.lastBlock.height + 1 === block.height) {
			// Fork: Consecutive height but different previous block id.
			modules.delegates.fork(block, 1);

			// We should keep the oldest one or if both have same age - keep one with lower id
			if (block.timestamp > __private.lastBlock.timestamp || (block.timestamp === __private.lastBlock.timestamp && block.id > __private.lastBlock.id)) {
				library.logger.info('Last block stands');
				return setImmediate(cb);
			} else {
				// In other cases - we have wrong parent and should rewind.
				library.logger.info('Last block and parent loses');
				async.series([
					self.deleteLastBlock,
					self.deleteLastBlock
				], cb);
			}
		} else if (block.previousBlock === __private.lastBlock.previousBlock && block.height === __private.lastBlock.height && block.id !== __private.lastBlock.id) {
			// Fork: Same height and previous block id, but different block id.
			modules.delegates.fork(block, 5);

			// Check if delegate forged on more than one node.
			if (block.generatorPublicKey === __private.lastBlock.generatorPublicKey) {
				library.logger.warn('Delegate forging on multiple nodes', block.generatorPublicKey);
			}

			// Two competiting blocks on same height, we should keep the oldest one or if both have same age - keep one with lower id
			if (block.timestamp > __private.lastBlock.timestamp || (block.timestamp === __private.lastBlock.timestamp && block.id > __private.lastBlock.id)) {
				library.logger.info('Last block stands');
				return setImmediate(cb);
			} else {
				library.logger.info('Last block loses');
				async.series([
					function (seriesCb) {
						self.deleteLastBlock(seriesCb);
					},
					function (seriesCb) {
						return __private.receiveBlock(block, seriesCb);
					}
				], cb);
			}
		} else {
			return setImmediate(cb);
		}
	});
};

Blocks.prototype.onBind = function (scope) {
	modules = scope;

	__private.loaded = true;
};

Blocks.prototype.cleanup = function (cb) {
	__private.loaded = false;
	__private.cleanup = true;

	if (!__private.isActive) {
		return setImmediate(cb);
	} else {
		setImmediate(function nextWatch () {
			if (__private.isActive) {
				library.logger.info('Waiting for block processing to finish...');
				setTimeout(nextWatch, 10000);
			} else {
				return setImmediate(cb);
			}
		});
	}
};

Blocks.prototype.aggregateBlocksReward = function (filter, cb) {
	var params = {};

	params.generatorPublicKey = filter.generatorPublicKey;
	params.delegates = constants.activeDelegates;

	if (filter.start !== undefined) {
		params.start = filter.start - constants.epochTime.getTime () / 1000;
	}

	if (filter.end !== undefined) {
		params.end = filter.end - constants.epochTime.getTime () / 1000;
	}

	library.db.query(sql.aggregateBlocksReward(params), params).then(function (rows) {
		var data = rows[0];
		if (data.delegate === null) {
			return setImmediate(cb, 'Account not found or is not a delegate');
		}
		data = { fees: data.fees || '0', rewards: data.rewards || '0', count: data.count || '0' };
		return setImmediate(cb, null, data);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#aggregateBlocksReward error');
	});
};

/**
 * Creates logger for tracking applied transactions of block
 *
 * @param {Number} transactionsCount
 * @param {Number} logsFrequency
 * @param {String} msg
 * @return {BlockProgressLogger}
 */
Blocks.prototype.getBlockProgressLogger = function (transactionsCount, logsFrequency, msg) {
	function BlockProgressLogger (transactionsCount, logsFrequency, msg) {
		this.target = transactionsCount;
		this.step = Math.floor(transactionsCount / logsFrequency);
		this.applied = 0;

		/**
		 * Resets applied transactions
		 */
		this.reset = function () {
			this.applied = 0;
		};

		/**
		 * Increments applied transactions and logs the progress
		 * - For the first and last transaction
		 * - With given frequency
		 */
		this.applyNext = function () {
			if (this.applied >= this.target) {
				throw new Error('Cannot apply transaction over the limit: ' + this.target);
			}
			this.applied += 1;
			if (this.applied === 1 || this.applied === this.target || this.applied % this.step === 1) {
				this.log();
			}
		};

		/**
		 * Logs the progress
		 */
		this.log = function () {
			library.logger.info(msg, ((this.applied / this.target) *  100).toPrecision(4)+ ' %' + ': applied ' + this.applied + ' of ' + this.target + ' transactions' );
		};
	}

	return new BlockProgressLogger(transactionsCount, logsFrequency, msg);
};

Blocks.prototype.isLoaded = function () {
	return !!modules;
};

// Shared API
Blocks.prototype.shared = {
	getBlock: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		library.schema.validate(req.body, schema.getBlock, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			library.dbSequence.add(function (cb) {
				__private.getById(req.body.id, function (err, block) {
					if (!block || err) {
						return setImmediate(cb, 'Block not found');
					}
					return setImmediate(cb, null, {block: block});
				});
			}, cb);
		});
	},

	getBlocks: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		library.schema.validate(req.body, schema.getBlocks, function (err) {
			if (err) {
				return setImmediate(cb, err[0].message);
			}

			library.dbSequence.add(function (cb) {
				__private.list(req.body, function (err, data) {
					if (err) {
						return setImmediate(cb, err);
					}
					return setImmediate(cb, null, {blocks: data.blocks, count: data.count});
				});
			}, cb);
		});
	},

	getBroadhash: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {broadhash: modules.system.getBroadhash()});
	},

	getEpoch: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {epoch: constants.epochTime});
	},

	getHeight: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {height: __private.lastBlock.height});
	},

	getFee: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {fee: library.logic.block.calculateFee()});
	},

	getFees: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {fees: constants.fees});
	},

	getNethash: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {nethash: modules.system.getNethash()});
	},

	getMilestone: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {milestone: __private.blockReward.calcMilestone(__private.lastBlock.height)});
	},

	getReward: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {reward: __private.blockReward.calcReward(__private.lastBlock.height)});
	},

	getSupply: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {supply: __private.blockReward.calcSupply(__private.lastBlock.height)});
	},

	getStatus: function (req, cb) {
		if (!__private.loaded) {
			return setImmediate(cb, 'Blockchain is loading');
		}

		return setImmediate(cb, null, {
			broadhash: modules.system.getBroadhash(),
			epoch: constants.epochTime,
			height: __private.lastBlock.height,
			fee: library.logic.block.calculateFee(),
			milestone: __private.blockReward.calcMilestone(__private.lastBlock.height),
			nethash: modules.system.getNethash(),
			reward: __private.blockReward.calcReward(__private.lastBlock.height),
			supply: __private.blockReward.calcSupply(__private.lastBlock.height)
		});
	}
};

// Export
module.exports = Blocks;
