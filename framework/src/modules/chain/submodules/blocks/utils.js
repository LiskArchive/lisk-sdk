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

const { ACTIVE_DELEGATES, EPOCH_TIME } = global.constants;
const __private = {};
let modules;
let library;
let self;

/**
 * Main utils logic. Allows utils functions for blocks. Initializes library.
 *
 * @class
 * @memberof modules.blocks
 * @see Parent: {@link modules.blocks}
 * @requires lodash
 * @param {Object} logger
 * @param {Account} account
 * @param {Block} block
 * @param {Transaction} transaction
 * @param {Storage} storage
 * @param {Object} genesisBlock
 * @todo Add description for the params
 */
class Utils {
	constructor(logger, account, block, transaction, storage, genesisBlock) {
		library = {
			logger,
			account,
			block,
			transaction,
			storage,
			genesisBlock,
			logic: {
				account,
				block,
				transaction,
			},
		};
		self = this;
		library.logger.trace('Blocks->Utils: Submodule initialized.');
		return self;
	}
}

/**
 * Normalize blocks and their transactions.
 *
 * @param {Array} rows - Data from full_blocks_list view
 * @returns {Array} blocks - List of normalized blocks with transactions
 */
Utils.prototype.readDbRows = function(rows) {
	let blocks = {};
	const order = [];

	for (let i = 0, length = rows.length; i < length; i++) {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		const block = library.logic.block.dbRead(rows[i]);

		if (block) {
			// If block is not already in the list...
			if (!blocks[block.id]) {
				if (block.id === library.genesisBlock.block.id) {
					// Generate fake signature for genesis block
					block.generationSignature = new Array(65).join('0');
				}

				// Add block ID to order list
				order.push(block.id);
				// Add block to list
				blocks[block.id] = block;
			}

			// Normalize transaction
			const transaction = library.logic.transaction.dbRead(rows[i]);
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
 * Normalize blocks and their transactions.
 *
 * @param {Array} rows - Data from extended block entity
 * @returns {Array} blocks - List of normalized blocks with transactions
 */
Utils.prototype.readStorageRows = function(rows) {
	const blocks = rows.map(block => {
		// Normalize block
		// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
		block = library.logic.block.storageRead(block);

		if (block) {
			if (block.id === library.genesisBlock.block.id) {
				// Generate fake signature for genesis block
				block.generationSignature = new Array(65).join('0');
			}

			// Normalize transaction
			if (block.transactions) {
				block.transactions = block.transactions.map(
					library.logic.transaction.storageRead
				);
			}
		}
		return block;
	});

	return blocks;
};

/**
 * Loads full blocks from database and normalize them.
 *
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of normalized blocks
 */
Utils.prototype.loadBlocksPart = function(filter, cb, tx) {
	self.loadBlocksData(
		filter,
		(err, rows) => {
			let blocks;

			if (!err) {
				// Normalize list of blocks
				blocks = self.readDbRows(rows);
			}

			return setImmediate(cb, err, blocks);
		},
		tx
	);
};

/**
 * Loads full normalized last block from database, see: loader.loadBlockChain (private).
 *
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error message if error occurred
 * @returns {Object} cb.block - Full normalized last block
 */
Utils.prototype.loadLastBlock = function(cb) {
	// Get full last block from database
	// FIXME: Review SQL order by clause
	return library.storage.entities.Block.get(
		{},
		{ sort: 'height:desc', limit: 1, extended: true }
	)
		.then(rows => {
			// Normalize block
			const block = modules.blocks.utils.readStorageRows(rows)[0];

			// Update last block
			modules.blocks.lastBlock.set(block);
			return setImmediate(cb, null, block);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadLastBlock error');
		});
};

/**
 * Get blocks IDs sequence - last block ID, IDs of first blocks of last 5 rounds, genesis block ID.
 *
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.res - Result
 * @returns {string} cb.res.firstHeight - Height of last block
 * @returns {string} cb.res.ids - Comma separated list of blocks IDs
 */
Utils.prototype.getIdSequence = function(height, cb) {
	const lastBlock = modules.blocks.lastBlock.get();
	// Get IDs of first blocks of (n) last rounds, descending order
	// EXAMPLE: For height 2000000 (round 19802) we will get IDs of blocks at height: 1999902, 1999801, 1999700, 1999599, 1999498
	library.storage.entities.Block.getFirstBlockIdOfLastRounds({
		height,
		numberOfRounds: 5,
		numberOfDelegates: ACTIVE_DELEGATES,
	})
		.then(rows => {
			if (rows.length === 0) {
				return setImmediate(
					cb,
					`Failed to get id sequence for height: ${height}`
				);
			}

			const ids = [];

			// Add genesis block at the end if the set doesn't contain it already
			if (library.genesisBlock && library.genesisBlock.block) {
				const __genesisBlock = {
					id: library.genesisBlock.block.id,
					height: library.genesisBlock.block.height,
				};

				if (!_.includes(rows, __genesisBlock.id)) {
					rows.push(__genesisBlock);
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
				ids: ids.join(),
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#getIdSequence error');
		});
};

/**
 * Load full block with a particular height
 *
 * @param {number} height - Block height
 * @param {function} cb - Callback function
 * @param {object} tx - Database transaction object
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.block - Block with requested height
 */
Utils.prototype.loadBlockByHeight = function(height, cb, tx) {
	library.storage.entities.Block.getOne({ height }, { extended: true }, tx)
		.then(row => {
			const block = self.readStorageRows([row])[0];
			return setImmediate(cb, null, block);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlockByHeight error');
		});
};

/**
 * Generates a list of full blocks for another node upon sync request from that node, see: modules.transport.internal.blocks.
 *
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of blocks
 */
Utils.prototype.loadBlocksData = function(filter, cb, tx) {
	const params = { limit: filter.limit || 1 };

	// FIXME: filter.id is not used
	if (filter.id && filter.lastId) {
		return setImmediate(cb, 'Invalid filter: Received both id and lastId');
	}
	if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}

	// Get height of block with supplied ID
	return library.storage.entities.Block.get(
		{ id: filter.lastId || null },
		{ limit: params.limit },
		tx
	)
		.then(rows => {
			const height = rows.length ? rows[0].height : 0;
			// Calculate max block height for database query
			const realLimit = height + (parseInt(filter.limit) || 1);

			params.limit = realLimit;
			params.height = height;

			const mergedParams = Object.assign({}, filter, params);
			const queryFilters = {};

			if (!mergedParams.id && !mergedParams.lastId) {
				queryFilters.height_lt = mergedParams.limit;
			}

			if (mergedParams.id) {
				queryFilters.id = mergedParams.id;
			}

			if (mergedParams.lastId) {
				queryFilters.height_gt = mergedParams.height;
				queryFilters.height_lt = mergedParams.limit;
			}

			// Retrieve blocks from database
			return library.storage.entities.Block.get(
				queryFilters,
				{
					extended: true,
					limit: null,
					sort: ['height'],
				},
				tx
			).then(blockRows => {
				let parsedBlocks = [];
				blockRows.forEach(block => {
					parsedBlocks = parsedBlocks.concat(
						self._parseStorageObjToLegacyObj(block)
					);
				});
				setImmediate(cb, null, parsedBlocks);
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlockData error');
		});
};

/**
 * Generates a list of full blocks for another node upon sync request from that node, see: modules.transport.internal.blocks.
 * NOTE: changing the original method loadBlocksData() could potentially change behaviour (popLastBlock() uses it for instance)
 * so that's why this new method was added
 * @param {Object} filter - Filter options
 * @param {Object} filter.limit - Limit blocks to amount
 * @param {Object} filter.lastId - ID of block to begin with
 * @param {function} cb - Callback function
 * @param {Object} tx - database transaction
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.rows - List of blocks
 */
Utils.prototype.loadBlocksDataWS = function(filter, cb, tx) {
	const params = { limit: filter.limit || 1 };

	// FIXME: filter.id is not used
	if (filter.id && filter.lastId) {
		return setImmediate(cb, 'Invalid filter: Received both id and lastId');
	}
	if (filter.id) {
		params.id = filter.id;
	} else if (filter.lastId) {
		params.lastId = filter.lastId;
	}

	// Get height of block with supplied ID
	return library.storage.entities.Block.get(
		{ id: filter.lastId || null },
		{ limit: params.limit },
		tx
	)
		.then(rows => {
			if (!rows.length) {
				library.logger.warn(
					`Invalid lastBlockId: ${filter.lastId} requested via RPC`
				);
				return setImmediate(cb, 'Invalid lastBlockId requested');
			}

			const height = rows.length ? rows[0].height : 0;
			// Calculate max block height for database query
			const realLimit = height + (parseInt(filter.limit) || 1);

			params.limit = realLimit;
			params.height = height;

			const mergedParams = Object.assign({}, filter, params);
			const queryFilters = {};

			if (!mergedParams.id && !mergedParams.lastId) {
				queryFilters.height_lt = mergedParams.limit;
			}

			if (mergedParams.id) {
				queryFilters.id = mergedParams.id;
			}

			if (mergedParams.lastId) {
				queryFilters.height_gt = mergedParams.height;
				queryFilters.height_lt = mergedParams.limit;
			}

			// Retrieve blocks from database
			return library.storage.entities.Block.get(
				queryFilters,
				{
					extended: true,
					limit: null,
					sort: ['height'],
				},
				tx
			).then(blockRows => {
				let parsedBlocks = [];
				blockRows.forEach(block => {
					parsedBlocks = parsedBlocks.concat(
						self._parseStorageObjToLegacyObj(block)
					);
				});
				setImmediate(cb, null, parsedBlocks);
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'Blocks#loadBlockData error');
		});
};

/**
 * Generates a list of full blocks structured as full_blocks_list DB view
 * db.blocks.loadBlocksData used to return the raw full_blocks_list fields and peers expect to receive this schema
 * After replacing db.blocks for storage.entities.Block, this parser was required to transfor storage object to the expected format.
 * This should be removed along with https://github.com/LiskHQ/lisk/issues/2424 implementation
 *
 * @param {Object} ExtendedBlock - Storage ExtendedBlock object
 * @returns {Array} Array of transactions with block data formated as full_blocks_list db view
 */
Utils.prototype._parseStorageObjToLegacyObj = function(block) {
	const parsedBlocks = [];
	let transactions = [{}];

	if (Array.isArray(block.transactions) && block.transactions.length > 0) {
		transactions = block.transactions;
	}

	/* eslint-disable no-restricted-globals */
	transactions.forEach(t => {
		parsedBlocks.push({
			b_id: _.get(block, 'id', null),
			b_version: isNaN(+block.version) ? null : +block.version,
			b_timestamp: isNaN(+block.timestamp) ? null : +block.timestamp,
			b_height: isNaN(+block.height) ? null : +block.height,
			b_previousBlock: _.get(block, 'previousBlockId', null),
			b_numberOfTransactions: isNaN(+block.numberOfTransactions)
				? null
				: +block.numberOfTransactions,
			b_totalAmount: _.get(block, 'totalAmount', null),
			b_totalFee: _.get(block, 'totalFee', null),
			b_reward: _.get(block, 'reward', null),
			b_payloadLength: isNaN(+block.payloadLength)
				? null
				: +block.payloadLength,
			b_payloadHash: _.get(block, 'payloadHash', null),
			b_generatorPublicKey: _.get(block, 'generatorPublicKey', null),
			b_blockSignature: _.get(block, 'blockSignature', null),
			t_id: _.get(t, 'id', null),
			t_type: _.get(t, 'type', null),
			t_timestamp: _.get(t, 'timestamp', null),
			t_senderPublicKey: _.get(t, 'senderPublicKey', null),
			t_senderId: _.get(t, 'senderId', null),
			t_recipientId: _.get(t, 'recipientId', null),
			t_amount: _.get(t, 'amount', null),
			t_fee: _.get(t, 'fee', null),
			t_signature: _.get(t, 'signature', null),
			t_signSignature: _.get(t, 'signSignature', null),
			t_requesterPublicKey: _.get(t, 'requesterPublicKey', null),
			t_signatures: t.signatures ? t.signatures.join(',') : null,
			tf_data: _.get(t, 'asset.data', null),
			s_publicKey: _.get(t, 'asset.signature.publicKey', null),
			d_username: _.get(t, 'asset.delegate.username', null),
			v_votes: t.asset && t.asset.votes ? t.asset.votes.join(',') : null,
			m_min: _.get(t, 'asset.multisignature.min', null),
			m_lifetime: _.get(t, 'asset.multisignature.lifetime', null),
			m_keysgroup: _.get(t, 'asset.multisignature.keysgroup', null),
			dapp_name: _.get(t, 'asset.dapp.name', null),
			dapp_description: _.get(t, 'asset.dapp.description', null),
			dapp_tags: _.get(t, 'asset.dapp.tags', null),
			dapp_type: _.get(t, 'asset.dapp.type', null),
			dapp_link: _.get(t, 'asset.dapp.link', null),
			dapp_category: _.get(t, 'asset.dapp.category', null),
			dapp_icon: _.get(t, 'asset.dapp.icon', null),
			in_dappId: _.get(t, 'asset.inTransfer.dappId', null),
			ot_dappId: _.get(t, 'asset.outTransfer.dappId', null),
			ot_outTransactionId: _.get(t, 'asset.outTransfer.transactionId', null),
		});
	});

	return parsedBlocks;
};

/**
 * Creates logger for tracking applied transactions of block.
 *
 * @param {number} transactionsCount
 * @param {number} logsFrequency
 * @param {string} msg
 * @returns {BlockProgressLogger}
 * @todo Add description for the params and return value
 */
Utils.prototype.getBlockProgressLogger = function(
	transactionsCount,
	logsFrequency,
	msg
) {
	/**
	 * Description of the class.
	 *
	 * @class
	 * @todo Add @param tags
	 */
	function BlockProgressLogger(
		loggerTransactionsCount,
		loggerFrequencyLogs,
		loggerMsg
	) {
		this.target = loggerTransactionsCount;
		this.step = Math.floor(loggerTransactionsCount / loggerFrequencyLogs);
		this.applied = 0;

		/**
		 * Resets applied transactions.
		 */
		this.reset = function() {
			this.applied = 0;
		};

		/**
		 * Increments applied transactions and logs the progress,
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
		 * Logs the progress.
		 */
		this.log = function() {
			library.logger.info(
				loggerMsg,
				`${(this.applied / this.target * 100).toPrecision(4)} %: applied ${
					this.applied
				} of ${this.target} transactions`
			);
		};
	}

	return new BlockProgressLogger(transactionsCount, logsFrequency, msg);
};

/**
 * Get block rewards of delegate for time period.
 *
 * @param {Object} filter
 * @param {string} filter.address - Delegate address
 * @param {number} [filter.start] - Start timestamp
 * @param {number} [filter.end] - End timestamp
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 * @returns {Object} cb.data - Rewards data
 * @returns {number} cb.data.fees - Round fees
 * @returns {number} cb.data.rewards - Blocks rewards
 * @returns {number} cb.data.count - Blocks count
 */
Utils.prototype.aggregateBlocksReward = function(filter, cb) {
	const params = {};

	library.logic.account.get({ address: filter.address }, (err, account) => {
		if (err) {
			return setImmediate(cb, err);
		}

		if (!account) {
			return setImmediate(cb, 'Account not found');
		}

		params.generatorPublicKey = account.publicKey;
		params.delegates = ACTIVE_DELEGATES;

		if (filter.start !== undefined) {
			params.fromTimestamp = Math.floor(
				(filter.start - new Date(EPOCH_TIME).getTime()) / 1000
			);
			params.fromTimestamp = params.fromTimestamp.toFixed();
		}

		if (filter.end !== undefined) {
			params.toTimestamp = Math.floor(
				(filter.end - new Date(EPOCH_TIME).getTime()) / 1000
			);
			params.toTimestamp = params.toTimestamp.toFixed();
		}

		// Get calculated rewards
		return library.storage.entities.Account.delegateBlocksRewards(params)
			.then(rows => {
				let data = rows[0];
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
			.catch(delegateBlocksRewardsErr => {
				library.logger.error(delegateBlocksRewardsErr.stack);
				return setImmediate(cb, 'Blocks#aggregateBlocksReward error');
			});
	});
};

/**
 * Handle modules initialization:
 * - blocks
 *
 * @param {modules} scope - Exposed modules
 */
Utils.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Utils: Shared modules bind.');
	modules = {
		blocks: scope.modules.blocks,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Utils;
