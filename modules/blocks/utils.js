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
var constants = require('../../helpers/constants.js');
var transactionTypes = require('../../helpers/transaction_types.js');

var modules;
var library;
var self;
var __private = {};

/**
 * Initializes library.
 * @memberof module:blocks
 * @class
 * @classdesc Main Utils logic.
 * Allows utils functions for blocks.
 * @param {Object} logger
 * @param {Account} account
 * @param {Block} block
 * @param {Transaction} transaction
 * @param {Database} db
 * @param {Sequence} dbSequence
 * @param {Object} genesisblock
 */
function Utils(
	logger,
	account,
	block,
	transaction,
	db,
	dbSequence,
	genesisblock
) {
	library = {
		logger: logger,
		db: db,
		dbSequence: dbSequence,
		genesisblock: genesisblock,
		logic: {
			account: account,
			block: block,
			transaction: transaction,
		},
	};
	self = this;

	library.logger.trace('Blocks->Utils: Submodule initialized.');
	return self;
}

/**
 * Normalize blocks and their transactions
 *
 * @method readDbRows
 * @param  {[Object]} rows Data from full_blocks_list view
 * @return {[Object]} blocks Normalized list of blocks with transactions
 */
Utils.prototype.readDbRows = function(rows) {
	var blocks = {};
	var order = [];

	for (var i = 0, length = rows.length; i < length; i++) {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		var block = library.logic.block.dbRead(rows[i]);

		if (block) {
			// If block is not already in the list...
			if (!blocks[block.id]) {
				if (block.id === library.genesisblock.block.id) {
					// Generate fake signature for genesis block
					block.generationSignature = new Array(65).join('0');
				}

				// Add block ID to order list
				order.push(block.id);
				// Add block to list
				blocks[block.id] = block;
			}

			// Normalize transaction
			var transaction = library.logic.transaction.dbRead(rows[i]);
			// Set empty object if there are no transactions in block
			blocks[block.id].transactions = blocks[block.id].transactions || {};

			if (transaction) {
				// Add transaction to block if not there already
				if (!blocks[block.id].transactions[transaction.id]) {
					blocks[block.id].transactions[transaction.id] = transaction;
				}
			}
		}
	}

	// Reorganize list
	blocks = order.map(v => {
		blocks[v].transactions = Object.keys(blocks[v].transactions).map(
			t => blocks[v].transactions[t]
		);
		return blocks[v];
	});

	return blocks;
};

/**
 * Loads full blocks from database and normalize them
 *
 * @async
 * @public
 * @method loadBlocksPart
 * @param  {Object}   filter Filter options
 * @param  {Object}   filter.limit Limit blocks to amount
 * @param  {Object}   filter.lastId ID of block to begin with
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.rows List of normalized blocks
 */
Utils.prototype.loadBlocksPart = function(filter, cb) {
	self.loadBlocksData(filter, (err, rows) => {
		var blocks = [];

		if (!err) {
			// Normalize list of blocks
			blocks = self.readDbRows(rows);
		}

		return setImmediate(cb, err, blocks);
	});
};

/**
 * Loads full normalized last block from database
 * see: loader.loadBlockChain (private)
 *
 * @async
 * @public
 * @method loadLastBlock
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error message if error occurred
 * @return {Object}   cb.block Full normalized last block
 */
Utils.prototype.loadLastBlock = function(cb) {
	library.dbSequence.add(cb => {
		// Get full last block from database
		// FIXME: Ordering in that SQL - to rewrite
		library.db.blocks
			.loadLastBlock()
			.then(rows => {
				// Normalize block
				var block = modules.blocks.utils.readDbRows(rows)[0];

				// Sort block's transactions
				block.transactions = block.transactions.sort(a => {
					if (block.id === library.genesisblock.block.id) {
						if (a.type === transactionTypes.VOTE) {
							return 1;
						}
					}

					if (a.type === transactionTypes.SIGNATURE) {
						return 1;
					}

					return 0;
				});

				// Update last block
				modules.blocks.lastBlock.set(block);
				return setImmediate(cb, null, block);
			})
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Blocks#loadLastBlock error');
			});
	}, cb);
};

/**
 * Get blocks IDs sequence - last block ID, IDs of first blocks of last 5 rounds, genesis block ID
 *
 * @private
 * @async
 * @method getIdSequence
 * @param  {number}   height Block height
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.res Result
 * @return {string}   cb.res.firstHeight Height of last block
 * @return {string}   cb.res.ids Comma separated list of blocks IDs
 */
Utils.prototype.getIdSequence = function(height, cb) {
	var lastBlock = modules.blocks.lastBlock.get();
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	library.db.blocks
		.getIdSequence({
			height: height,
			limit: 5,
			delegates: constants.activeDelegates,
		})
		.then(rows => {
			if (rows.length === 0) {
				return setImmediate(
					cb,
					`Failed to get id sequence for height: ${height}`
				);
			}

			var ids = [];

			// Add genesis block at the end if the set doesn't contain it already
			if (library.genesisblock && library.genesisblock.block) {
				var __genesisblock = {
					id: library.genesisblock.block.id,
					height: library.genesisblock.block.height,
				};

				if (!_.includes(rows, __genesisblock.id)) {
					rows.push(__genesisblock);
				}
			}

			// Add last block at the beginning if the set doesn't contain it already
			if (lastBlock && !_.includes(rows, lastBlock.id)) {
				rows.unshift({
					id: lastBlock.id,
					height: lastBlock.height,
				});
			}

			// Extract blocks IDs
			rows.forEach(row => {
				// FIXME: Looks like double check
				if (!_.includes(ids, row.id)) {
					ids.push(row.id);
				}
			});

			return setImmediate(cb, null, {
				firstHeight: rows[0].height,
				ids: ids.join(','),
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#getIdSequence error');
		});
};

/**
 * Generates a list of full blocks for another node upon sync request from that node
 * see: modules.transport.internal.blocks
 *
 * @async
 * @public
 * @method loadBlocksData
 * @param  {Object}   filter Filter options
 * @param  {Object}   filter.limit Limit blocks to amount
 * @param  {Object}   filter.lastId ID of block to begin with
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.rows List of blocks
 */
Utils.prototype.loadBlocksData = function(filter, cb) {
	var params = { limit: filter.limit || 1 };

	// FIXME: filter.id is not used
	if (filter.id && filter.lastId) {
		return setImmediate(cb, 'Invalid filter: Received both id and lastId');
	} else if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}

	// Execute in sequence via dbSequence
	library.dbSequence.add(cb => {
		// Get height of block with supplied ID
		library.db.blocks
			.getHeightByLastId(filter.lastId || null)
			.then(rows => {
				var height = rows.length ? rows[0].height : 0;
				// Calculate max block height for database query
				var realLimit = height + (parseInt(filter.limit) || 1);

				params.limit = realLimit;
				params.height = height;

				// Retrieve blocks from database
				// FIXME: That SQL query have mess logic, need to be refactored
				library.db.blocks
					.loadBlocksData(Object.assign({}, filter, params))
					.then(rows => setImmediate(cb, null, rows));
			})
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Blocks#loadBlockData error');
			});
	}, cb);
};

/**
 * Creates logger for tracking applied transactions of block
 *
 * @method getBlockProgressLogger
 * @param  {number} transactionsCount
 * @param  {number} logsFrequency
 * @param  {string} msg
 * @return {BlockProgressLogger}
 */
Utils.prototype.getBlockProgressLogger = function(
	transactionsCount,
	logsFrequency,
	msg
) {
	function BlockProgressLogger(transactionsCount, logsFrequency, msg) {
		this.target = transactionsCount;
		this.step = Math.floor(transactionsCount / logsFrequency);
		this.applied = 0;

		/**
		 * Resets applied transactions
		 */
		this.reset = function() {
			this.applied = 0;
		};

		/**
		 * Increments applied transactions and logs the progress
		 * - For the first and last transaction
		 * - With given frequency
		 */
		this.applyNext = function() {
			if (this.applied >= this.target) {
				throw new Error(
					`Cannot apply transaction over the limit: ${this.target}`
				);
			}
			this.applied += 1;
			if (
				this.applied === 1 ||
				this.applied === this.target ||
				this.applied % this.step === 1
			) {
				this.log();
			}
		};

		/**
		 * Logs the progress
		 */
		this.log = function() {
			library.logger.info(
				msg,
				`${(this.applied / this.target * 100).toPrecision(4)} %: applied ${
					this.applied
				} of ${this.target} transactions`
			);
		};
	}

	return new BlockProgressLogger(transactionsCount, logsFrequency, msg);
};

/**
 * Get block rewards of delegate for time period
 *
 * @public
 * @async
 * @method aggregateBlocksReward
 * @param  {Object}   filter
 * @param  {string}   filter.address Delegate address
 * @param  {number}   [filter.start] Start timestamp
 * @param  {number}   [filter.end] End timestamp
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.data Rewards data
 * @return {number}   cb.data.fees Round fees
 * @return {number}   cb.data.rewards Blocks rewards
 * @return {number}   cb.data.count Blocks count
 */
Utils.prototype.aggregateBlocksReward = function(filter, cb) {
	var params = {};

	library.logic.account.get({ address: filter.address }, function(
		err,
		account
	) {
		if (err) {
			return setImmediate(cb, err);
		}

		if (!account) {
			return setImmediate(cb, 'Account not found');
		}

		params.generatorPublicKey = account.publicKey;
		params.delegates = constants.activeDelegates;

		if (filter.start !== undefined) {
			params.start = (filter.start - constants.epochTime.getTime()) / 1000;
			params.start = params.start.toFixed();
		}

		if (filter.end !== undefined) {
			params.end = (filter.end - constants.epochTime.getTime()) / 1000;
			params.end = params.end.toFixed();
		}

		// Get calculated rewards
		library.db.blocks
			.aggregateBlocksReward(params)
			.then(function(rows) {
				var data = rows[0];
				if (data.delegate === null) {
					return setImmediate(cb, 'Account is not a delegate');
				}
				data = {
					fees: data.fees || '0',
					rewards: data.rewards || '0',
					count: data.count || '0',
				};
				return setImmediate(cb, null, data);
			})
			.catch(function(err) {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Blocks#aggregateBlocksReward error');
			});
	});
};

/**
 * Handle modules initialization:
 * - blocks
 * @param {modules} scope Exposed modules
 */
Utils.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Utils: Shared modules bind.');
	modules = {
		blocks: scope.blocks,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Utils;
