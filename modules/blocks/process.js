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

const _ = require('lodash');
const async = require('async');
const slots = require('../../helpers/slots.js');

const { MAX_TRANSACTIONS_PER_BLOCK, ACTIVE_DELEGATES } = global.constants;

const __private = {};
let modules;
let definitions;
let library;
let self;

/**
 * Main process logic. Allows process blocks. Initializes library.
 *
 * @class
 * @memberof modules.blocks
 * @see Parent: {@link modules.blocks}
 * @requires async
 * @requires lodash
 * @requires helpers/slots
 * @requires logic/peer
 * @param {Object} logger
 * @param {Block} block
 * @param {Peers} peers
 * @param {Transaction} transaction
 * @param {ZSchema} schema
 * @param {Database} db
 * @param {Sequence} sequence
 * @param {Object} genesisBlock
 * @todo Add description for the params
 */
class Process {
	constructor(
		logger,
		block,
		peers,
		transaction,
		schema,
		db,
		sequence,
		genesisBlock
	) {
		library = {
			logger,
			schema,
			db,
			sequence,
			genesisBlock,
			logic: {
				block,
				peers,
				transaction,
			},
		};
		self = this;

		library.logger.trace('Blocks->Process: Submodule initialized.');
		return self;
	}
}

/**
 * Receive block - logs info about received block, updates last receipt, processes block.
 *
 * @private
 * @func receiveBlock
 * @param {Object} block - Full normalized block
 * @param {function} cb - Callback function
 */
__private.receiveBlock = function(block, cb) {
	library.logger.info(
		[
			'Received new block id:',
			block.id,
			'height:',
			block.height,
			'round:',
			slots.calcRound(block.height),
			'slot:',
			slots.getSlotNumber(block.timestamp),
			'reward:',
			block.reward,
		].join(' ')
	);

	// Update last receipt
	modules.blocks.lastReceipt.update();
	// Start block processing - broadcast: true, saveBlock: true
	modules.blocks.verify.processBlock(block, true, true, cb);
};

/**
 * Receive block detected as fork cause 1: Consecutive height but different previous block id.
 *
 * @private
 * @func receiveBlock
 * @param {Object} block - Received block
 * @param {function} cb - Callback function
 */
__private.receiveForkOne = function(block, lastBlock, cb) {
	let tmp_block = _.clone(block);

	// Fork: Consecutive height but different previous block id
	modules.delegates.fork(block, 1);

	// Keep the oldest block, or if both have same age, keep block with lower id
	if (
		block.timestamp > lastBlock.timestamp ||
		(block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)
	) {
		library.logger.info('Last block stands');
		return setImmediate(cb); // Discard received block
	}
	async.series(
		[
			function(seriesCb) {
				try {
					tmp_block = library.logic.block.objectNormalize(tmp_block);
				} catch (err) {
					return setImmediate(seriesCb, err);
				}
				return setImmediate(seriesCb);
			},
			// Check valid slot
			function(seriesCb) {
				__private.validateBlockSlot(tmp_block, lastBlock, seriesCb);
			},
			// Check received block before any deletion
			function(seriesCb) {
				const check = modules.blocks.verify.verifyReceipt(tmp_block);

				if (!check.verified) {
					library.logger.error(
						['Block', tmp_block.id, 'verification failed'].join(' '),
						check.errors.join(', ')
					);
					// Return first error from checks
					return setImmediate(seriesCb, check.errors[0]);
				}
				library.logger.info('Last block and parent loses due to fork 1');
				return setImmediate(seriesCb);
			},
			// Delete last 2 blocks
			modules.blocks.chain.deleteLastBlock,
			modules.blocks.chain.deleteLastBlock,
		],
		err => {
			if (err) {
				library.logger.error('Fork recovery failed', err);
			}
			return setImmediate(cb, err);
		}
	);
};

/**
 * Receive block detected as fork cause 5: Same height and previous block id, but different block id.
 *
 * @private
 * @method receiveBlock
 * @param {Object} block - Received block
 * @param {function} cb - Callback function
 */
__private.receiveForkFive = function(block, lastBlock, cb) {
	let tmpBlock = _.clone(block);

	// Fork: Same height and previous block id, but different block id
	modules.delegates.fork(block, 5);

	// Check if delegate forged on more than one node
	if (block.generatorPublicKey === lastBlock.generatorPublicKey) {
		library.logger.warn(
			'Delegate forging on multiple nodes',
			block.generatorPublicKey
		);
	}

	// Keep the oldest block, or if both have same age, keep block with lower id
	if (
		block.timestamp > lastBlock.timestamp ||
		(block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)
	) {
		library.logger.info('Last block stands');
		return setImmediate(cb); // Discard received block
	}
	async.series(
		[
			function(seriesCb) {
				try {
					tmpBlock = library.logic.block.objectNormalize(tmpBlock);
				} catch (err) {
					return setImmediate(seriesCb, err);
				}
				return setImmediate(seriesCb);
			},
			// Check valid slot
			function(seriesCb) {
				__private.validateBlockSlot(tmpBlock, lastBlock, seriesCb);
			},
			// Check received block before any deletion
			function(seriesCb) {
				const check = modules.blocks.verify.verifyReceipt(tmpBlock);

				if (!check.verified) {
					library.logger.error(
						['Block', tmpBlock.id, 'verification failed'].join(' '),
						check.errors.join(', ')
					);
					// Return first error from checks
					return setImmediate(seriesCb, check.errors[0]);
				}
				return setImmediate(seriesCb);
			},
			// Delete last block
			function(seriesCb) {
				library.logger.info('Last block loses due to fork 5');
				modules.blocks.chain.deleteLastBlock(seriesCb);
			},
			// Process received block
			function(seriesCb) {
				return __private.receiveBlock(block, seriesCb);
			},
		],
		err => {
			if (err) {
				library.logger.error('Fork recovery failed', err);
			}
			return setImmediate(cb, err);
		}
	);
};

/**
 * Performs chain comparison with remote peer.
 * WARNING: Can trigger chain recovery.
 *
 * @param {Peer} peer - Peer to perform chain comparison with
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.res - Result object
 */
Process.prototype.getCommonBlock = function(peer, height, cb) {
	let comparisonFailed = false;

	async.waterfall(
		[
			function(waterCb) {
				// Get IDs sequence (comma separated list)
				modules.blocks.utils.getIdSequence(height, (err, res) =>
					setImmediate(waterCb, err, res)
				);
			},
			function(res, waterCb) {
				const ids = res.ids;
				// Perform request to supplied remote peer
				peer = library.logic.peers.create(peer);
				peer.rpc.blocksCommon({ ids }, (err, res) => {
					if (err) {
						modules.peers.remove(peer);
						return setImmediate(waterCb, err);
					} else if (!res.common) {
						// FIXME: Need better checking here, is base on 'common' property enough?
						comparisonFailed = true;
						return setImmediate(
							waterCb,
							[
								'Chain comparison failed with peer:',
								peer.string,
								'using ids:',
								ids,
							].join(' ')
						);
					}
					return setImmediate(waterCb, null, res.common);
				});
			},
			function(common, waterCb) {
				// Check if we received genesis block - before response validation, as genesis block have previousBlock = null
				if (common && common.height === 1) {
					comparisonFailed = true;
					return setImmediate(
						waterCb,
						'Comparison failed - received genesis as common block'
					);
				}
				// Validate remote peer response via schema
				library.schema.validate(common, definitions.CommonBlock, err => {
					if (err) {
						return setImmediate(waterCb, err[0].message);
					}
					return setImmediate(waterCb, null, common);
				});
			},
			function(common, waterCb) {
				// Check that block with ID, previousBlock and height exists in database
				library.db.blocks
					.getCommonBlock({
						id: common.id,
						previousBlock: common.previousBlock,
						height: common.height,
					})
					.then(rows => {
						if (!rows.length || !rows[0].count) {
							// Block doesn't exists - comparison failed
							comparisonFailed = true;
							return setImmediate(
								waterCb,
								[
									'Chain comparison failed with peer:',
									peer.string,
									'using block:',
									JSON.stringify(common),
								].join(' ')
							);
						}
						// Block exists - it's common between our node and remote peer
						return setImmediate(waterCb, null, common);
					})
					.catch(err => {
						// SQL error occurred
						library.logger.error(err.stack);
						return setImmediate(waterCb, 'Blocks#getCommonBlock error');
					});
			},
		],
		(err, res) => {
			// If comparison failed and current consensus is low - perform chain recovery
			if (comparisonFailed && modules.transport.poorConsensus()) {
				return modules.blocks.chain.recoverChain(cb);
			}
			return setImmediate(cb, err, res);
		}
	);
};

/**
 * Loads full blocks from database, used when rebuilding blockchain, snapshotting,
 * see: loader.loadBlockChain (private).
 *
 * @param {number} limit - Limit amount of blocks
 * @param {number} offset - Offset to start at
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.lastBlock - Current last block
 */
Process.prototype.loadBlocksOffset = function(limit, offset, cb) {
	// Calculate limit if offset is supplied
	const newLimit = limit + (offset || 0);
	const params = { limit: newLimit, offset: offset || 0 };

	library.logger.debug('Loading blocks offset', {
		limit,
		offset,
	});

	// Loads full blocks from database
	// FIXME: Weird logic in that SQL query, also ordering used can be performance bottleneck - to rewrite
	library.db.blocks
		.loadBlocksOffset(params.offset, params.limit)
		.then(rows => {
			// Normalize blocks
			const blocks = modules.blocks.utils.readDbRows(rows);

			async.eachSeries(
				blocks,
				(block, eachBlockSeriesCb) => {
					// Stop processing if node shutdown was requested
					if (modules.blocks.isCleaning.get()) {
						return setImmediate(eachBlockSeriesCb);
					}

					library.logger.debug('Processing block', block.id);

					if (block.id === library.genesisBlock.block.id) {
						// Apply block - saveBlock: false
						modules.blocks.chain.applyGenesisBlock(block, err =>
							setImmediate(eachBlockSeriesCb, err)
						);
					} else {
						// Process block - broadcast: false, saveBlock: false
						modules.blocks.verify.processBlock(block, false, false, err => {
							if (err) {
								library.logger.debug('Block processing failed', {
									id: block.id,
									err: err.toString(),
									module: 'blocks',
									block,
								});
							}
							return setImmediate(eachBlockSeriesCb, err);
						});
					}
				},
				err => setImmediate(cb, err, modules.blocks.lastBlock.get())
			);
		})
		.catch(err => {
			library.logger.error(err);
			return setImmediate(
				cb,
				['Blocks#loadBlocksOffset error', err].join(': ')
			);
		});
};

/**
 * Ask remote peer for blocks and process them.
 *
 * @param {Peer} peer - Peer to perform chain comparison with
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.lastValidBlock - Normalized new last block
 */
Process.prototype.loadBlocksFromPeer = function(peer, cb) {
	let lastValidBlock = modules.blocks.lastBlock.get();

	peer = library.logic.peers.create(peer);
	library.logger.info(`Loading blocks from: ${peer.string}`);

	function getFromPeer(seriesCb) {
		peer.rpc.blocks(
			{ lastBlockId: lastValidBlock.id, peer: library.logic.peers.me() },
			(err, res) => {
				err = err || res.error;
				if (err) {
					modules.peers.remove(peer);
					return setImmediate(seriesCb, err);
				}
				return setImmediate(seriesCb, null, res.blocks);
			}
		);
	}

	function validateBlocks(blocks, seriesCb) {
		const report = library.schema.validate(blocks, definitions.WSBlocksList);

		if (!report) {
			return setImmediate(seriesCb, 'Received invalid blocks data');
		}
		return setImmediate(seriesCb, null, blocks);
	}
	// Process all received blocks
	function processBlocks(blocks, seriesCb) {
		// Skip if ther is no blocks
		if (blocks.length === 0) {
			return setImmediate(seriesCb);
		}
		// Iterate over received blocks, normalize block first...
		async.eachSeries(
			modules.blocks.utils.readDbRows(blocks),
			(block, eachSeriesCb) => {
				if (modules.blocks.isCleaning.get()) {
					// Cancel processing if node shutdown was requested
					return setImmediate(eachSeriesCb);
				}
				// ...then process block
				return processBlock(block, err => {
					// Ban a peer if block validation fails
					// Invalid peers won't get chosen in the next sync attempt
					if (err) {
						library.logic.peers.ban(peer);
					}
					return eachSeriesCb(err);
				});
			},
			err => setImmediate(seriesCb, err)
		);
	}
	// Process single block
	function processBlock(block, seriesCb) {
		// Start block processing - broadcast: false, saveBlock: true
		modules.blocks.verify.processBlock(block, false, true, err => {
			if (!err) {
				// Update last valid block
				lastValidBlock = block;
				library.logger.info(
					['Block', block.id, 'loaded from:', peer.string].join(' '),
					`height: ${block.height}`
				);
			} else {
				const id = block ? block.id : 'null';

				library.logger.debug('Block processing failed', {
					id,
					err: err.toString(),
					module: 'blocks',
					block,
				});
			}
			return seriesCb(err);
		});
	}

	async.waterfall([getFromPeer, validateBlocks, processBlocks], err => {
		if (err) {
			return setImmediate(
				cb,
				`Error loading blocks: ${err.message || err}`,
				lastValidBlock
			);
		}
		return setImmediate(cb, null, lastValidBlock);
	});
};

/**
 * Generate new block, see: loader.loadBlockChain (private).
 *
 * @param {Object} keypair - Pair of private and public keys, see: helpers.ed.makeKeypair
 * @param {number} timestamp - Slot time, see: helpers.slots.getSlotTime
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error message if error occurred
 */
Process.prototype.generateBlock = function(keypair, timestamp, cb) {
	// Get transactions that will be included in block
	const transactions = modules.transactions.getUnconfirmedTransactionList(
		false,
		MAX_TRANSACTIONS_PER_BLOCK
	);
	const ready = [];

	async.eachSeries(
		transactions,
		(transaction, cb) => {
			modules.accounts.getAccount(
				{ publicKey: transaction.senderPublicKey },
				(err, sender) => {
					if (err || !sender) {
						return setImmediate(cb, 'Sender not found');
					}

					// Check transaction depends on type
					if (library.logic.transaction.ready(transaction, sender)) {
						// Verify transaction
						library.logic.transaction.verify(
							transaction,
							sender,
							null,
							true,
							err => {
								if (!err) {
									ready.push(transaction);
								}
								return setImmediate(cb);
							},
							null
						);
					} else {
						return setImmediate(cb);
					}
				}
			);
		},
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			let block;

			try {
				// Create a block
				block = library.logic.block.create({
					keypair,
					timestamp,
					previousBlock: modules.blocks.lastBlock.get(),
					transactions: ready,
				});
			} catch (e) {
				library.logger.error(e.stack);
				return setImmediate(cb, e);
			}

			// Start block processing - broadcast: true, saveBlock: true
			modules.blocks.verify.processBlock(block, true, true, cb);
		}
	);
};

/**
 * Validate if block generator is valid delegate.
 *
 * @private
 * @func validateBlockSlot
 * @param {Object} block - Current normalized block
 * @param {Object} lastBlock - Last normalized block
 * @param {Function} cb - Callback function
 */
__private.validateBlockSlot = function(block, lastBlock, cb) {
	const roundNextBlock = slots.calcRound(block.height);
	const roundLastBlock = slots.calcRound(lastBlock.height);

	if (
		lastBlock.height % ACTIVE_DELEGATES === 0 ||
		roundLastBlock < roundNextBlock
	) {
		// Check if block was generated by the right active delagate from previous round.
		// DATABASE: Read only to mem_accounts to extract active delegate list
		modules.delegates.validateBlockSlotAgainstPreviousRound(block, err =>
			setImmediate(cb, err)
		);
	} else {
		// Check if block was generated by the right active delagate.
		// DATABASE: Read only to mem_accounts to extract active delegate list
		modules.delegates.validateBlockSlot(block, err => setImmediate(cb, err));
	}
};

/**
 * Handle newly received block.
 *
 * @listens module:transport~event:receiveBlock
 * @param {block} block - New block
 * @todo Add @returns tag
 */
Process.prototype.onReceiveBlock = function(block) {
	// When client is not loaded, is syncing
	// Do not receive new blocks as client is not ready
	if (!__private.loaded) {
		return library.logger.debug(
			'Client is not ready to receive block',
			block.id
		);
	}

	if (modules.loader.syncing()) {
		return library.logger.debug(
			"Client is syncing. Can't receive block at the moment.",
			block.id
		);
	}

	// Execute in sequence via sequence
	library.sequence.add(cb => {
		// Get the last block
		const lastBlock = modules.blocks.lastBlock.get();

		// Detect sane block
		if (
			block.previousBlock === lastBlock.id &&
			lastBlock.height + 1 === block.height
		) {
			// Process received block
			return __private.receiveBlock(block, cb);
		} else if (
			block.previousBlock !== lastBlock.id &&
			lastBlock.height + 1 === block.height
		) {
			// Process received fork cause 1
			return __private.receiveForkOne(block, lastBlock, cb);
		} else if (
			block.previousBlock === lastBlock.previousBlock &&
			block.height === lastBlock.height &&
			block.id !== lastBlock.id
		) {
			// Process received fork cause 5
			return __private.receiveForkFive(block, lastBlock, cb);
		}
		if (block.id === lastBlock.id) {
			library.logger.debug('Block already processed', block.id);
		} else {
			library.logger.warn(
				[
					'Discarded block that does not match with current chain:',
					block.id,
					'height:',
					block.height,
					'round:',
					slots.calcRound(block.height),
					'slot:',
					slots.getSlotNumber(block.timestamp),
					'generator:',
					block.generatorPublicKey,
				].join(' ')
			);
		}

		// Discard received block
		return setImmediate(cb);
	});
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
 *
 * @param {modules} scope - Exposed modules
 */
Process.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Process: Shared modules bind.');
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

	definitions = scope.swagger.definitions;

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Process;
