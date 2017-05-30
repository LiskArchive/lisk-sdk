'use strict';

var async = require('async');
var constants = require('../../helpers/constants.js');
var schema = require('../../schema/blocks.js');
var slots = require('../../helpers/slots.js');
var sql = require('../../sql/blocks.js');

var modules, library, self, __private = {};

/**
 * Initializes library.
 * @memberof module:blocks
 * @class
 * @classdesc Main Process logic.
 * Allows process blocks.
 * @param {Object} logger
 * @param {Block} block
 * @param {Peers} peers
 * @param {Transaction} transaction
 * @param {ZSchema} schema
 * @param {Database} db
 * @param {Sequence} dbSequence
 * @param {Sequence} sequence
 * @param {Object} genesisblock
 */
function Process (logger, block, peers, transaction, schema, db, dbSequence, sequence, genesisblock) {
	library = {
		logger: logger,
		schema: schema,
		db: db,
		dbSequence: dbSequence,
		sequence: sequence,
		genesisblock: genesisblock,
		logic: {
			block: block,
			peers: peers,
			transaction: transaction,
		},
	};
	self = this;

	library.logger.trace('Blocks->Process: Submodule initialized.');
	return self;
}

/**
 * Performs chain comparison with remote peer
 * WARNING: Can trigger chain recovery
 *
 * @async
 * @public
 * @method getCommonBlock
 * @param  {Peer}     peer Peer to perform chain comparison with
 * @param  {number}   height Block height
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.res Result object
 */
Process.prototype.getCommonBlock = function (peer, height, cb) {
	var comparisionFailed = false;

	async.waterfall([
		function (waterCb) {
			// Get IDs sequence (comma separated list)
			modules.blocks.utils.getIdSequence(height, function (err, res) {
				return setImmediate(waterCb, err, res);
			});
		},
		function (res, waterCb) {
			var ids = res.ids;

			// Perform request to supplied remote peer
			modules.transport.getFromPeer(peer, {
				api: '/blocks/common?ids=' + ids,
				method: 'GET'
			}, function (err, res) {
				if (err || res.body.error) {
					return setImmediate(waterCb, err || res.body.error.toString());
				} else if (!res.body.common) {
					// FIXME: Need better checking here, is base on 'common' property enough?
					comparisionFailed = true;
					return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using ids:', ids].join(' '));
				} else {
					return setImmediate(waterCb, null, res);
				}
			});
		},
		function (res, waterCb) {
			// Validate remote peer response via schema
			library.schema.validate(res.body.common, schema.getCommonBlock, function (err) {
				if (err) {
					return setImmediate(waterCb, err[0].message);
				} else {
					return setImmediate(waterCb, null, res);
				}
			});
		},
		function (res, waterCb) {
			// Check that block with ID, previousBlock and height exists in database
			library.db.query(sql.getCommonBlock(res.body.common.previousBlock), {
				id: res.body.common.id,
				previousBlock: res.body.common.previousBlock,
				height: res.body.common.height
			}).then(function (rows) {
				if (!rows.length || !rows[0].count) {
					// Block doesn't exists - comparison failed
					comparisionFailed = true;
					return setImmediate(waterCb, ['Chain comparison failed with peer:', peer.string, 'using block:', JSON.stringify(res.body.common)].join(' '));
				} else {
					// Block exists - it's common between our node and remote peer
					return setImmediate(waterCb, null, res.body.common);
				}
			}).catch(function (err) {
				// SQL error occurred
				library.logger.error(err.stack);
				return setImmediate(waterCb, 'Blocks#getCommonBlock error');
			});
		}
	], function (err, res) {
		// If comparison failed and current consensus is low - perform chain recovery
		if (comparisionFailed && modules.transport.poorConsensus()) {
			return modules.blocks.chain.recoverChain(cb);
		} else {
			return setImmediate(cb, err, res);
		}
	});
};


/**
 * Loads full blocks from database, used when rebuilding blockchain, snapshotting
 * see: loader.loadBlockChain (private)
 * 
 * @async
 * @public
 * @method loadBlocksOffset
 * @param  {number}   limit Limit amount of blocks
 * @param  {number}   offset Offset to start at
 * @param  {boolean}  verify Indicator that block needs to be verified
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.lastBlock Current last block
 */
Process.prototype.loadBlocksOffset = function (limit, offset, verify, cb) {
	// Calculate limit if offset is supplied
	var newLimit = limit + (offset || 0);
	var params = { limit: newLimit, offset: offset || 0 };

	library.logger.debug('Loading blocks offset', {limit: limit, offset: offset, verify: verify});
	// Execute in sequence via dbSequence
	library.dbSequence.add(function (cb) {
		// Loads full blocks from database
		// FIXME: Weird logic in that SQL query, also ordering used can be performance bottleneck - to rewrite
		library.db.query(sql.loadBlocksOffset, params).then(function (rows) {
			// Normalize blocks
			var blocks = modules.blocks.utils.readDbRows(rows);

			async.eachSeries(blocks, function (block, cb) {
				// Stop processing if node shutdown was requested
				if (modules.blocks.isCleaning.get()) {
					return setImmediate(cb);
				}

				library.logger.debug('Processing block', block.id);
				if (verify && block.id !== library.genesisblock.block.id) {
					// Sanity check of the block, if values are coherent.
					// No access to database.
					var check = modules.blocks.verify.verifyBlock(block);

					if (!check.verified) {
						library.logger.error(['Block', block.id, 'verification failed'].join(' '), check.errors.join(', '));
						// Return first error from checks
						return setImmediate(cb, check.errors[0]);
					}
				}
				if (block.id === library.genesisblock.block.id) {
					modules.blocks.chain.applyGenesisBlock(block, cb);
				} else {
					// Apply block - broadcast: false, saveBlock: false
					// FIXME: Looks like we are missing some validations here, because applyBlock is different than processBlock used elesewhere
					// - that need to be checked and adjusted to be consistent
					modules.blocks.chain.applyBlock(block, false, cb, false);
				}
				// Update last block
				modules.blocks.lastBlock.set(block);
			}, function (err) {
				return setImmediate(cb, err, modules.blocks.lastBlock.get());
			});
		}).catch(function (err) {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlocksOffset error');
		});
	}, cb);
};

/**
 * Ask remote peer for blocks and process them
 *
 * @async
 * @public
 * @method loadBlocksFromPeer
 * @param  {Peer}     peer Peer to perform chain comparison with
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.lastValidBlock Normalized new last block
 */
Process.prototype.loadBlocksFromPeer = function (peer, cb) {
	// Set current last block as last valid block
	var lastValidBlock = modules.blocks.lastBlock.get();

	// Normalize peer
	peer = library.logic.peers.create(peer);
	library.logger.info('Loading blocks from: ' + peer.string);

	function getFromPeer (seriesCb) {
		// Ask remote peer for blocks
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

	// Validate remote peer response via schema
	function validateBlocks (blocks, seriesCb) {
		var report = library.schema.validate(blocks, schema.loadBlocksFromPeer);

		if (!report) {
			return setImmediate(seriesCb, 'Received invalid blocks data');
		} else {
			return setImmediate(seriesCb, null, blocks);
		}
	}

	// Process all received blocks
	function processBlocks (blocks, seriesCb) {
		// Skip if ther is no blocks
		if (blocks.length === 0) {
			return setImmediate(seriesCb);
		}
		// Iterate over received blocks, normalize block first...
		async.eachSeries(modules.blocks.utils.readDbRows(blocks), function (block, eachSeriesCb) {
			if (modules.blocks.isCleaning.get()) {
				// Cancel processing if node shutdown was requested
				return setImmediate(eachSeriesCb);
			} else {
				// ...then process block
				return processBlock(block, eachSeriesCb);
			}
		}, function (err) {
			return setImmediate(seriesCb, err);
		});
	}

	// Process single block
	function processBlock (block, seriesCb) {
		// Start block processing - broadcast: false, saveBlock: true
		modules.blocks.verify.processBlock(block, false, function (err) {
			if (!err) {
				// Update last valid block
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

/**
 * Generate new block
 * see: loader.loadBlockChain (private)
 * 
 * @async
 * @public
 * @method generateBlock
 * @param  {Object}   keypair Pair of private and public keys, see: helpers.ed.makeKeypair
 * @param  {number}   timestamp Slot time, see: helpers.slots.getSlotTime
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error message if error occurred
 */
Process.prototype.generateBlock = function (keypair, timestamp, cb) {
	// Get transactions that will be included in block
	var transactions = modules.transactions.getUnconfirmedTransactionList(false, constants.maxTxsPerBlock);
	var ready = [];

	async.eachSeries(transactions, function (transaction, cb) {
		modules.accounts.getAccount({ publicKey: transaction.senderPublicKey }, function (err, sender) {
			if (err || !sender) {
				return setImmediate(cb, 'Sender not found');
			}

			// Check transaction depends on type
			if (library.logic.transaction.ready(transaction, sender)) {
				// Verify transaction
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
			// Create a block
			block = library.logic.block.create({
				keypair: keypair,
				timestamp: timestamp,
				previousBlock: modules.blocks.lastBlock.get(),
				transactions: ready
			});
		} catch (e) {
			library.logger.error(e.stack);
			return setImmediate(cb, e);
		}

		// Start block processing - broadcast: true, saveBlock: true
		modules.blocks.verify.processBlock(block, true, cb, true);
	});
};

/**
 * EVENTS
 */

/**
 * Handle newly received block
 *
 * @public
 * @method  onReceiveBlock
 * @listens module:transport~event:receiveBlock
 * @param   {block}   block New block
 */
Process.prototype.onReceiveBlock = function (block) {
	var lastBlock;

	// Execute in sequence via sequence
	library.sequence.add(function (cb) {
		// When client is not loaded, is syncing or round is ticking
		// Do not receive new blocks as client is not ready
		if (!__private.loaded || modules.loader.syncing() || modules.rounds.ticking()) {
			library.logger.debug('Client not ready to receive block', block.id);
			return;
		}

		lastBlock = modules.blocks.lastBlock.get();

		// Initial check if new block looks fine
		if (block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height) {
			// Process received block
			return __private.receiveBlock(block, cb);
		} else if (block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height) {
			// Fork: Consecutive height but different previous block id.
			modules.delegates.fork(block, 1);

			// We should keep the oldest one or if both have same age - keep one with lower id
			if (block.timestamp > lastBlock.timestamp || (block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)) {
				library.logger.info('Last block stands');
				return setImmediate(cb);
			} else {
				// In other cases - we have wrong parent and should rewind.
				library.logger.info('Last block and parent loses');
				// Delete last 2 blocks
				async.series([
					modules.blocks.chain.deleteLastBlock,
					modules.blocks.chain.deleteLastBlock
				], cb);
			}
		} else if (block.previousBlock === lastBlock.previousBlock && block.height === lastBlock.height && block.id !== lastBlock.id) {
			// Fork: Same height and previous block id, but different block id.
			modules.delegates.fork(block, 5);

			// Check if delegate forged on more than one node.
			if (block.generatorPublicKey === lastBlock.generatorPublicKey) {
				library.logger.warn('Delegate forging on multiple nodes', block.generatorPublicKey);
			}

			// Two competiting blocks on same height, we should keep the oldest one or if both have same age - keep one with lower id
			if (block.timestamp > lastBlock.timestamp || (block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)) {
				library.logger.info('Last block stands');
				return setImmediate(cb);
			} else {
				library.logger.info('Last block loses');
				async.series([
					function (seriesCb) {
						// Delete last block
						modules.blocks.chain.deleteLastBlock(seriesCb);
					},
					function (seriesCb) {
						// Process received block
						return __private.receiveBlock(block, seriesCb);
					}
				], cb);
			}
		} else {
			return setImmediate(cb);
		}
	});
};

/**
 * Receive block - logs info about received block, updates last receipt, fires processing
 *
 * @private
 * @async
 * @method receiveBlock
 * @param {Object}   block Full normalized block
 * @param {Function} cb Callback function
 */
__private.receiveBlock = function (block, cb) {
	library.logger.info([
		'Received new block id:', block.id,
		'height:', block.height,
		'round:',  modules.rounds.calc(block.height),
		'slot:', slots.getSlotNumber(block.timestamp),
		'reward:', block.reward
	].join(' '));

	// Update last receipt
	modules.blocks.lastReceipt.update();
	// Start block processing - broadcast: true, saveBlock: true
	modules.blocks.verify.processBlock(block, true, cb, true);
};

/**
 * Handle modules initialization
 * - accounts
 * - blocks
 * - delegates
 * - loader
 * - rounds
 * - transactions
 * - transport
 * @param {modules} scope Exposed modules
 */
Process.prototype.onBind = function (scope) {
	library.logger.trace('Blocks->Process: Shared modules bind.');
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		delegates: scope.delegates,
		loader: scope.loader,
		rounds: scope.rounds,
		transactions: scope.transactions,
		transport: scope.transport,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Process;
