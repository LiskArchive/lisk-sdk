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

const crypto = require('crypto');
const async = require('async');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const BlockReward = require('../../logic/block_reward');
const slots = require('../../helpers/slots');
const blockVersion = require('../../logic/block_version');
const checkTransactionExceptions = require('../../logic/check_transaction_against_exceptions.js');
const Bignum = require('../../helpers/bignum');

let modules;
let library;
let self;
const exceptions = global.exceptions;
const {
	BLOCK_SLOT_WINDOW,
	MAX_PAYLOAD_LENGTH,
	MAX_TRANSACTIONS_PER_BLOCK,
} = global.constants;
const __private = {};

__private.lastNBlockIds = [];

/**
 * Description of the class.
 *
 * @class
 * @memberof modules.blocks
 * @see Parent: {@link modules.blocks}
 * @requires async
 * @requires crypto
 * @requires lodash
 * @requires helpers/slots
 * @requires logic/block_reward
 * @todo Add @param tags
 * @todo Add description for the class
 */
class Verify {
	constructor(logger, block, storage, config, channel) {
		library = {
			logger,
			storage,
			logic: {
				block,
			},
			config: {
				loading: {
					snapshotRound: config.loading.snapshotRound,
				},
			},
			channel,
		};
		self = this;
		__private.blockReward = new BlockReward();
		library.logger.trace('Blocks->Verify: Submodule initialized.');
		return self;
	}
}

/**
 * Check transactions - perform transactions validation when processing block.
 * FIXME: Some checks are probably redundant, see: logic.transactionPool
 *
 * @private
 * @func checkTransactions
 * @param {Object} block - Block object
 * @param {Object} transaction - Transaction object
 * @param  {boolean} checkExists - Check if transaction already exists in database
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.checkTransactions = async (transactions, checkExists) => {
	if (transactions.length === 0) {
		return;
	}

	if (checkExists) {
		const persistedTransactions = await library.storage.entities.Transaction.get(
			{
				id_in: transactions.map(transaction => transaction.id),
			}
		);

		if (persistedTransactions.length > 0) {
			modules.transactions.onConfirmedTransactions([persistedTransactions[0]]);
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id}`
			);
		}
	}

	const nonInertTransactions = transactions.filter(
		transaction =>
			!checkTransactionExceptions.checkIfTransactionIsInert(transaction)
	);

	const {
		transactionsResponses,
	} = await modules.processTransactions.verifyTransactions(
		nonInertTransactions
	);

	const unverifiableTransactionsResponse = transactionsResponses.filter(
		transactionResponse => transactionResponse.status !== TransactionStatus.OK
	);

	if (unverifiableTransactionsResponse.length > 0) {
		throw unverifiableTransactionsResponse[0].errors;
	}
};

/**
 * Set height according to the given last block.
 *
 * @private
 * @func setHeight
 * @param {Object} block - Target block
 * @param {Object} lastBlock - Last block
 * @returns {Object} block - Target block
 */
__private.setHeight = function(block, lastBlock) {
	block.height = lastBlock.height + 1;
	return block;
};

/**
 * Verify block signature.
 *
 * @private
 * @func verifySignature
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifySignature = function(block, result) {
	let valid;

	try {
		valid = library.logic.block.verifySignature(block);
	} catch (e) {
		result.errors.push(e.toString());
	}

	if (!valid) {
		result.errors.push('Failed to verify block signature');
	}

	return result;
};

/**
 * Verify previous block.
 *
 * @private
 * @func verifyPreviousBlock
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyPreviousBlock = function(block, result) {
	if (!block.previousBlock && block.height !== 1) {
		result.errors.push('Invalid previous block');
	}
	return result;
};

/**
 * Verify block is not one of the last {BLOCK_SLOT_WINDOW} saved blocks.
 *
 * @private
 * @func verifyAgainstLastNBlockIds
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyAgainstLastNBlockIds = function(block, result) {
	if (__private.lastNBlockIds.indexOf(block.id) !== -1) {
		result.errors.push('Block already exists in chain');
	}

	return result;
};

/**
 * Verify block version.
 *
 * @private
 * @func verifyVersion
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyVersion = function(block, result) {
	if (!blockVersion.isValid(block.version, block.height)) {
		result.errors.push('Invalid block version');
	}

	return result;
};

/**
 * Verify block reward.
 *
 * @private
 * @func verifyReward
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyReward = function(block, result) {
	const expectedReward = __private.blockReward.calcReward(block.height);
	if (
		block.height !== 1 &&
		!expectedReward.isEqualTo(block.reward) &&
		!exceptions.blockRewards.includes(block.id)
	) {
		result.errors.push(
			`Invalid block reward: ${block.reward} expected: ${expectedReward}`
		);
	}

	return result;
};

/**
 * Verify block id.
 *
 * @private
 * @func verifyId
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyId = function(block, result) {
	try {
		// Get block ID
		// FIXME: Why we don't have it?
		block.id = library.logic.block.getId(block);
	} catch (e) {
		result.errors.push(e.toString());
	}

	return result;
};

/**
 * Verify block payload (transactions).
 *
 * @private
 * @func verifyPayload
 * @param {Object} block - Target block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyPayload = function(block, result) {
	if (block.payloadLength > MAX_PAYLOAD_LENGTH) {
		result.errors.push('Payload length is too long');
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		result.errors.push(
			'Included transactions do not match block transactions count'
		);
	}

	if (block.transactions.length > MAX_TRANSACTIONS_PER_BLOCK) {
		result.errors.push('Number of transactions exceeds maximum per block');
	}

	let totalAmount = new Bignum(0);
	let totalFee = new Bignum(0);
	const payloadHash = crypto.createHash('sha256');
	const appliedTransactions = {};

	block.transactions.forEach(transaction => {
		let bytes;

		try {
			bytes = transaction.getBytes();
		} catch (e) {
			result.errors.push(e.toString());
		}

		if (appliedTransactions[transaction.id]) {
			result.errors.push(
				`Encountered duplicate transaction: ${transaction.id}`
			);
		}

		appliedTransactions[transaction.id] = transaction;
		if (bytes) {
			payloadHash.update(bytes);
		}
		totalAmount = totalAmount.plus(transaction.amount);
		totalFee = totalFee.plus(transaction.fee);
	});

	if (payloadHash.digest().toString('hex') !== block.payloadHash) {
		result.errors.push('Invalid payload hash');
	}

	if (!totalAmount.isEqualTo(block.totalAmount)) {
		result.errors.push('Invalid total amount');
	}

	if (!totalFee.isEqualTo(block.totalFee)) {
		result.errors.push('Invalid total fee');
	}

	return result;
};

/**
 * Verify block for fork cause one.
 *
 * @private
 * @func verifyForkOne
 * @param {Object} block - Target block
 * @param {Object} lastBlock - Last block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyForkOne = function(block, lastBlock, result) {
	if (block.previousBlock && block.previousBlock !== lastBlock.id) {
		modules.delegates.fork(block, 1);
		result.errors.push(
			`Invalid previous block: ${block.previousBlock} expected: ${lastBlock.id}`
		);
	}

	return result;
};

/**
 * Verify block slot according to timestamp.
 *
 * @private
 * @func verifyBlockSlot
 * @param {Object} block - Target block
 * @param {Object} lastBlock - Last block
 * @param {Object} result - Verification results
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyBlockSlot = function(block, lastBlock, result) {
	const blockSlotNumber = slots.getSlotNumber(block.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	if (
		blockSlotNumber > slots.getSlotNumber() ||
		blockSlotNumber <= lastBlockSlotNumber
	) {
		result.errors.push('Invalid block timestamp');
	}

	return result;
};

/**
 * Verify block slot window according to application time.
 *
 * @private
 * @func verifyBlockSlotWindow
 * @param {Object} block - Target block
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
__private.verifyBlockSlotWindow = function(block, result) {
	const currentApplicationSlot = slots.getSlotNumber();
	const blockSlot = slots.getSlotNumber(block.timestamp);

	// Reject block if it's slot is older than BLOCK_SLOT_WINDOW
	if (currentApplicationSlot - blockSlot > BLOCK_SLOT_WINDOW) {
		result.errors.push('Block slot is too old');
	}

	// Reject block if it's slot is in the future
	if (currentApplicationSlot < blockSlot) {
		result.errors.push('Block slot is in the future');
	}

	return result;
};

/**
 * Verify block before fork detection and return all possible errors related to block.
 *
 * @param {Object} block - Full block
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
Verify.prototype.verifyReceipt = function(block) {
	const lastBlock = modules.blocks.lastBlock.get();

	block = __private.setHeight(block, lastBlock);

	let result = { verified: false, errors: [] };

	result = __private.verifySignature(block, result);
	result = __private.verifyPreviousBlock(block, result);
	result = __private.verifyAgainstLastNBlockIds(block, result);
	result = __private.verifyBlockSlotWindow(block, result);
	result = __private.verifyVersion(block, result);
	result = __private.verifyReward(block, result);
	result = __private.verifyId(block, result);
	result = __private.verifyPayload(block, result);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

/**
 * Loads last {BLOCK_SLOT_WINDOW} blocks from the database into memory. Called when application triggeres blockchainReady event.
 */
Verify.prototype.onBlockchainReady = function() {
	return library.storage.entities.Block.get(
		{},
		{ limit: BLOCK_SLOT_WINDOW, sort: 'height:desc' }
	)
		.then(rows => {
			__private.lastNBlockIds = rows.map(row => row.id);
		})
		.catch(err => {
			library.logger.error(
				`Unable to load last ${BLOCK_SLOT_WINDOW} block ids`
			);
			library.logger.error(err);
		});
};

/**
 * Maintains __private.lastNBlock constant - a queue of fixed length (BLOCK_SLOT_WINDOW). Called when application triggers newBlock event.
 *
 * @func onNewBlock
 * @param {block} block
 * @todo Add description for the params
 */
Verify.prototype.onNewBlock = function(block) {
	__private.lastNBlockIds.push(block.id);
	if (__private.lastNBlockIds.length > BLOCK_SLOT_WINDOW) {
		__private.lastNBlockIds.shift();
	}
};

/**
 * Verify block before processing and return all possible errors related to block.
 *
 * @param {Object} block - Full block
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
Verify.prototype.verifyBlock = function(block) {
	const lastBlock = modules.blocks.lastBlock.get();

	block = __private.setHeight(block, lastBlock);

	let result = { verified: false, errors: [] };

	result = __private.verifySignature(block, result);
	result = __private.verifyPreviousBlock(block, result);
	result = __private.verifyVersion(block, result);
	result = __private.verifyReward(block, result);
	result = __private.verifyId(block, result);
	result = __private.verifyPayload(block, result);

	result = __private.verifyForkOne(block, lastBlock, result);
	result = __private.verifyBlockSlot(block, lastBlock, result);

	result.verified = result.errors.length === 0;
	result.errors.reverse();
	if (result.verified) {
		library.logger.info(
			`Verify->verifyBlock succeeded for block ${block.id} at height ${
				block.height
			}.`
		);
	} else {
		library.logger.error(
			`Verify->verifyBlock failed for block ${block.id} at height ${
				block.height
			}.`,
			result.errors
		);
	}

	return result;
};

/**
 * Adds default properties to block.
 *
 * @param {Object} block - Block object reduced
 * @returns {Object} Block object completed
 */
Verify.prototype.addBlockProperties = function(block) {
	block.totalAmount = new Bignum(block.totalAmount || 0);
	block.totalFee = new Bignum(block.totalFee || 0);
	block.reward = new Bignum(block.reward || 0);

	if (block.version === undefined) {
		block.version = 0;
	}
	if (block.numberOfTransactions === undefined) {
		if (block.transactions === undefined) {
			block.numberOfTransactions = 0;
		} else {
			block.numberOfTransactions = block.transactions.length;
		}
	}
	if (block.payloadLength === undefined) {
		block.payloadLength = 0;
	}
	if (block.transactions === undefined) {
		block.transactions = [];
	}
	return block;
};

/**
 * Deletes default properties from block.
 *
 * @param {Object} block - Block object completed
 * @returns {Object} Block object reduced
 */
Verify.prototype.deleteBlockProperties = function(block) {
	const reducedBlock = Object.assign({}, block);
	if (reducedBlock.version === 0) {
		delete reducedBlock.version;
	}
	// verifyBlock ensures numberOfTransactions is transactions.length
	if (typeof reducedBlock.numberOfTransactions === 'number') {
		delete reducedBlock.numberOfTransactions;
	}
	if (reducedBlock.totalAmount.isEqualTo(0)) {
		delete reducedBlock.totalAmount;
	}
	if (reducedBlock.totalFee.isEqualTo(0)) {
		delete reducedBlock.totalFee;
	}
	if (reducedBlock.payloadLength === 0) {
		delete reducedBlock.payloadLength;
	}
	if (reducedBlock.reward.isEqualTo(0)) {
		delete reducedBlock.reward;
	}
	if (reducedBlock.transactions && reducedBlock.transactions.length === 0) {
		delete reducedBlock.transactions;
	}
	return reducedBlock;
};

/**
 * Adds block properties.
 *
 * @private
 * @func addBlockProperties
 * @param {Object} block - Full block
 * @param {boolean} broadcast - Indicator that block needs to be broadcasted
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.addBlockProperties = function(block, broadcast, cb) {
	if (!broadcast) {
		try {
			// Set default properties
			block = self.addBlockProperties(block);
		} catch (err) {
			return setImmediate(cb, err);
		}
	}

	return setImmediate(cb);
};

/**
 * Validates block schema.
 *
 * @private
 * @func normalizeBlock
 * @param {Object} block - Full block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.normalizeBlock = function(block, cb) {
	try {
		block = library.logic.block.objectNormalize(block);
	} catch (error) {
		return setImmediate(cb, error);
	}

	return setImmediate(cb);
};

/**
 * Verifies block.
 *
 * @private
 * @func verifyBlock
 * @param {Object} block - Full block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.verifyBlock = function(block, cb) {
	// Sanity check of the block, if values are coherent
	// No access to database
	const result = self.verifyBlock(block);

	if (!result.verified) {
		library.logger.error(
			`Block ${block.id} verification failed`,
			result.errors[0]
		);
		return setImmediate(cb, result.errors[0]);
	}
	return setImmediate(cb);
};

/**
 * Broadcasts block.
 *
 * @private
 * @func broadcastBlock
 * @param {Object} block - Full block
 * @param {boolean} broadcast - Indicator that block needs to be broadcasted
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.broadcastBlock = function(block, broadcast, cb) {
	if (broadcast) {
		try {
			// Delete default properties
			const reducedBlock = self.deleteBlockProperties(block);
			modules.blocks.chain.broadcastReducedBlock(reducedBlock, broadcast);
		} catch (err) {
			return setImmediate(cb, err);
		}
	}

	return setImmediate(cb);
};

/**
 * Checks if block is in database.
 *
 * @private
 * @func checkExists
 * @param {Object} block - Full block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.checkExists = function(block, cb) {
	// Check if block id is already in the database (very low probability of hash collision)
	// TODO: In case of hash-collision, to me it would be a special autofork...
	// DATABASE: read only
	library.storage.entities.Block.isPersisted({ id: block.id })
		.then(isPersisted => {
			if (isPersisted) {
				return setImmediate(cb, `Block ${block.id} already exists`);
			}
			return setImmediate(cb);
		})
		.catch(err => {
			library.logger.error(err);
			return setImmediate(cb, 'Block#blockExists error');
		});
};

/**
 * Checks if block was generated by the right active delagate.
 *
 * @private
 * @func validateBlockSlot
 * @param {Object} block - Full block
 * @param {function} cb - Callback function
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
__private.validateBlockSlot = function(block, cb) {
	// Check if block was generated by the right active delagate. Otherwise, fork 3
	// DATABASE: Read only to mem_accounts to extract active delegate list
	modules.delegates.validateBlockSlot(block, err => {
		if (err) {
			// Fork: Delegate does not match calculated slot
			modules.delegates.fork(block, 3);
			return setImmediate(cb, err);
		}
		return setImmediate(cb);
	});
};

/**
 * Main function to process a block:
 * - Verify the block looks ok
 * - Verify the block is compatible with database state (DATABASE readonly)
 * - Broadcast the block to remote peers
 * - Apply the block to database if both verifications are ok
 * - Update headers: broadhash and height
 * - Notify remote peers about our new headers
 *
 * @param {Object} block - Full block
 * @param {boolean} broadcast - Indicator that block needs to be broadcasted
 * @param {function} cb - Callback function
 * @param {boolean} saveBlock - Indicator that block needs to be saved to database
 * @returns {function} cb - Callback function from params (through setImmediate)
 * @returns {Object} cb.err - Error if occurred
 */
Verify.prototype.processBlock = function(block, broadcast, saveBlock, cb) {
	if (modules.blocks.isCleaning.get()) {
		// Break processing if node shutdown reqested
		return setImmediate(cb, 'Cleaning up');
	}
	if (!__private.loaded) {
		// Break processing if blockchain is not loaded
		return setImmediate(cb, 'Blockchain is loading');
	}

	return async.series(
		{
			addBlockProperties(seriesCb) {
				__private.addBlockProperties(block, broadcast, seriesCb);
			},
			normalizeBlock(seriesCb) {
				__private.normalizeBlock(block, seriesCb);
			},
			verifyBlock(seriesCb) {
				__private.verifyBlock(block, seriesCb);
			},
			broadcastBlock(seriesCb) {
				__private.broadcastBlock(block, broadcast, seriesCb);
			},
			checkExists(seriesCb) {
				// Skip checking for existing block id if we don't need to save that block
				if (!saveBlock) {
					return setImmediate(seriesCb);
				}
				return __private.checkExists(block, seriesCb);
			},
			validateBlockSlot(seriesCb) {
				__private.validateBlockSlot(block, seriesCb);
			},
			checkTransactions(seriesCb) {
				// checkTransactions should check for transactions to exists in database
				// only if the block needed to be saved to database
				__private
					.checkTransactions(block.transactions, saveBlock)
					.then(seriesCb)
					.catch(seriesCb);
			},
			applyBlock(seriesCb) {
				// The block and the transactions are OK i.e:
				// * Block and transactions have valid values (signatures, block slots, etc...)
				// * The check against database state passed (for instance sender has enough LSK, votes are under 101, etc...)
				// We thus update the database with the transactions values, save the block and tick it.
				// Also that function set new block as our last block
				modules.blocks.chain.applyBlock(block, saveBlock, seriesCb);
			},
			// Perform the next step only when 'broadcast' flag is set, it can be:
			// 'true' if block comes from generation or receiving process
			// 'false' if block comes from chain synchronization process
			updateApplicationState(seriesCb) {
				if (!library.config.loading.snapshotRound && broadcast) {
					return modules.blocks
						.calculateNewBroadhash()
						.then(({ broadhash, height }) => {
							// Listen for the update of step to move to next step
							library.channel.once('app:state:updated', () => {
								seriesCb();
							});

							// Update our application state: broadhash and height
							return library.channel.invoke('app:updateApplicationState', {
								broadhash,
								height,
							});
						})
						.catch(seriesCb);
				}
				return seriesCb();
			},
		},
		err => setImmediate(cb, err)
	);
};

/**
 * It assigns modules to private constants.
 *
 * @param {modules} scope - Exposed modules
 */
Verify.prototype.onBind = function(scope) {
	library.logger.trace('Blocks->Verify: Shared modules bind.');

	modules = {
		accounts: scope.modules.accounts,
		blocks: scope.modules.blocks,
		delegates: scope.modules.delegates,
		transactions: scope.modules.transactions,
		processTransactions: scope.modules.processTransactions,
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = Verify;
