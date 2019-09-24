/*
 * Copyright © 2019 Lisk Foundation
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

const EventEmitter = require('events');
const { cloneDeep } = require('lodash');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	applyTransactions,
	checkPersistedTransactions,
	checkAllowedTransactions,
	validateTransactions,
} = require('../transactions');
const blocksUtils = require('./utils');
const blocksLogic = require('./block');
const {
	BlocksVerify,
	verifyBlockNotExists,
	verifyPreviousBlockId,
} = require('./verify');
const {
	applyConfirmedStep,
	applyConfirmedGenesisStep,
	deleteLastBlock,
	deleteFromBlockId,
	undoConfirmedStep,
	saveBlockStep,
	parseBlockToJson,
	undoBlockStep,
} = require('./chain');
const {
	calculateSupply,
	calculateReward,
	calculateMilestone,
} = require('./block_reward');
const forkChoiceRule = require('./fork_choice_rule');
const {
	validateSignature,
	validatePreviousBlockProperty,
	validateReward,
	validatePayload,
	validateBlockSlot,
} = require('./validate');

const EVENT_NEW_BLOCK = 'EVENT_NEW_BLOCK';
const EVENT_DELETE_BLOCK = 'EVENT_DELETE_BLOCK';
const EVENT_BROADCAST_BLOCK = 'EVENT_BROADCAST_BLOCK';
const EVENT_NEW_BROADHASH = 'EVENT_NEW_BROADHASH';
const EVENT_PRIORITY_CHAIN_DETECTED = 'EVENT_PRIORITY_CHAIN_DETECTED';

class Blocks extends EventEmitter {
	constructor({
		// components
		logger,
		storage,
		// Unique requirements
		genesisBlock,
		slots,
		exceptions,
		// Modules
		dposModule,
		interfaceAdapters,
		// constants
		blockReceiptTimeout, // set default
		loadPerIteration,
		maxPayloadLength,
		maxTransactionsPerBlock,
		activeDelegates,
		rewardDistance,
		rewardOffset,
		rewardMileStones,
		totalAmount,
		blockSlotWindow,
	}) {
		super();

		this._broadhash = genesisBlock.payloadHash;
		this._lastBlock = {};

		/**
		 * Represents the receipt time of the last block that was received
		 * from the network.
		 * TODO: Remove after fork.
		 * @type {number}
		 * @private
		 */

		this._cleaning = false;

		this.logger = logger;
		this.storage = storage;
		this.dposModule = dposModule;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		this.blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: height =>
				calculateMilestone(height, this.blockRewardArgs),
			calculateReward: height => calculateReward(height, this.blockRewardArgs),
			calculateSupply: height => calculateSupply(height, this.blockRewardArgs),
		};
		this.constants = {
			blockReceiptTimeout,
			maxPayloadLength,
			maxTransactionsPerBlock,
			loadPerIteration,
			activeDelegates,
			blockSlotWindow,
		};

		this.blocksVerify = new BlocksVerify({
			storage: this.storage,
			exceptions: this.exceptions,
			slots: this.slots,
			genesisBlock: this.genesisBlock,
			dposModule: this.dposModule,
		});

		this.blocksUtils = blocksUtils;
	}

	get lastBlock() {
		// Remove receivedAt property..
		const { receivedAt, ...block } = this._lastBlock;
		return block;
	}

	async init() {
		// check mem tables
		const { genesisBlock } = await this.storage.entities.Block.begin(
			'loader:checkMemTables',
			async tx => blocksUtils.loadMemTables(this.storage, tx),
		);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		// check if the round related information is in valid state
		await this.blocksVerify.reloadRequired();

		this._lastBlock = await blocksLogic.loadLastBlock(
			this.storage,
			this.interfaceAdapters,
			this.genesisBlock,
		);

		// Remove initializing _lastNBlockIds variable since it's unnecessary
	}

	async validateDetached({ block, blockBytes }) {
		return this._validateDetached({ block, blockBytes });
	}

	async _validateDetached({ block, blockBytes }) {
		validatePreviousBlockProperty(block, this.genesisBlock);
		validateSignature(block, blockBytes);
		validateReward(block, this.blockReward, this.exceptions);
		validatePayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
		);
		// Update id
		block.id = blocksUtils.getId(blockBytes);

		// validate transactions
		const { transactionsResponses } = validateTransactions(this.exceptions)(
			block.transactions,
		);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);
		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}
	}

	async verifyInMemory({ block, lastBlock }) {
		verifyPreviousBlockId(block, lastBlock, this.genesisBlock);
		validateBlockSlot(block, lastBlock, this.slots);
		await this.blocksVerify.verifyBlockForger(block);
	}

	forkChoice({ block, lastBlock }) {
		// Current time since Lisk Epoch
		block.receivedAt = this.slots.getEpochTime();
		// Cases are numbered following LIP-0014 Fork choice rule.
		// See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
		// Case 2 and 1 have flipped execution order for better readability. Behavior is still the same

		if (forkChoiceRule.isValidBlock(lastBlock, block)) {
			// Case 2: correct block received
			return forkChoiceRule.FORK_STATUS_VALID_BLOCK;
		}

		if (forkChoiceRule.isIdenticalBlock(lastBlock, block)) {
			// Case 1: same block received twice
			return forkChoiceRule.FORK_STATUS_IDENTICAL_BLOCK;
		}

		if (forkChoiceRule.isDoubleForging(lastBlock, block)) {
			// Delegates are the same
			// Case 3: double forging different blocks in the same slot.
			// Last Block stands.
			return forkChoiceRule.FORK_STATUS_DOUBLE_FORGING;
		}

		if (
			forkChoiceRule.isTieBreak({
				slots: this.slots,
				lastAppliedBlock: lastBlock,
				receivedBlock: block,
			})
		) {
			// Two competing blocks by different delegates at the same height.
			// Case 4: Tie break
			return forkChoiceRule.FORK_STATUS_TIE_BREAK;
		}

		if (forkChoiceRule.isDifferentChain(lastBlock, block)) {
			// Case 5: received block has priority. Move to a different chain.
			return forkChoiceRule.FORK_STATUS_DIFFERENT_CHAIN;
		}

		// Discard newly received block
		return forkChoiceRule.FORK_STATUS_DISCARD;
	}

	async verify({ block, skipExistingCheck }) {
		if (skipExistingCheck !== true) {
			await verifyBlockNotExists(this.storage, block);
			const {
				transactionsResponses: persistedResponse,
			} = await checkPersistedTransactions(this.storage)(block.transactions);
			const invalidPersistedResponse = persistedResponse.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidPersistedResponse) {
				throw invalidPersistedResponse.errors;
			}
		}
		await this.blocksVerify.checkTransactions(block);
	}

	async apply({ block, tx }) {
		await applyConfirmedStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);
	}

	async applyGenesis({ block, tx }) {
		await applyConfirmedGenesisStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);
	}

	async undo({ block, tx }) {
		await undoConfirmedStep(
			this.storage,
			this.slots,
			block,
			this.exceptions,
			tx,
		);

		await undoBlockStep(this.dposModule, block, tx);
	}

	async save({ block, tx, skipSave }) {
		await saveBlockStep(this.storage, this.dposModule, block, skipSave, tx);
		this._lastBlock = block;
	}

	async remove({ block, tx }, saveToTemp) {
		const storageRowOfBlock = await deleteLastBlock(this.storage, block, tx);
		const [secondLastBlock] = blocksLogic.readStorageRows(
			[storageRowOfBlock],
			this.interfaceAdapters,
			this.genesisBlock,
		);

		if (saveToTemp) {
			const parsedDeletedBlock = parseBlockToJson(block);
			const blockTempEntry = {
				id: parsedDeletedBlock.id,
				height: parsedDeletedBlock.height,
				fullBlock: parsedDeletedBlock,
			};
			await this.storage.entities.TempBlock.create(blockTempEntry, {}, tx);
		}
		this._lastBlock = secondLastBlock;
	}

	async exists(block) {
		try {
			await verifyBlockNotExists(this.storage, block);
			return false;
		} catch (err) {
			return true;
		}
	}

	async deleteAfter(block) {
		return deleteFromBlockId(this.storage, block.id);
	}

	// TODO: Unit tests written in mocha, which should be migrated to jest.
	async filterReadyTransactions(transactions, context) {
		const allowedTransactionsIds = checkAllowedTransactions(context)(
			transactions,
		)
			.transactionsResponses.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK,
			)
			.map(transactionReponse => transactionReponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id),
		);
		const { transactionsResponses: responses } = await applyTransactions(
			this.storage,
			this.slots,
		)(allowedTransactions);
		const readyTransactions = allowedTransactions.filter(transaction =>
			responses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id),
		);
		return readyTransactions;
	}

	broadcast(block) {
		// emit event
		const cloned = cloneDeep(block);
		this.emit(EVENT_BROADCAST_BLOCK, { block: cloned });
	}

	/**
	 * Handle node shutdown request.
	 *
	 * @listens module:app~event:cleanup
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 */
	async cleanup() {
		this._cleaning = true;
		if (!this._isActive) {
			// Module ready for shutdown
			return;
		}

		const waitFor = () =>
			new Promise(resolve => {
				setTimeout(resolve, 10000);
			});
		// Module is not ready, repeat
		const nextWatch = async () => {
			if (this._isActive) {
				this.logger.info('Waiting for block processing to finish...');
				await waitFor();
				await nextWatch();
			}

			return null;
		};
		await nextWatch();
	}

	async loadBlocksFromLastBlockId(lastBlockId, limit = 1) {
		return blocksUtils.loadBlocksFromLastBlockId(
			this.storage,
			lastBlockId,
			limit,
		);
	}

	/**
	 * Returns the highest common block between ids and the database blocks table
	 * @param {Array<String>} ids - An array of block ids
	 * @return {Promise<BasicBlock|undefined>}
	 */
	// TODO: Unit tests written in mocha, which should be migrated to jest.
	async getHighestCommonBlock(ids) {
		try {
			const [block] = await this.storage.entities.Block.get(
				{
					id_in: ids,
				},
				{ sort: 'height:desc', limit: 1 },
			);
			return block;
		} catch (e) {
			const errMessage = 'Failed to access storage layer';
			this.logger.error(e, errMessage);
			throw new Error(errMessage);
		}
	}

	// TODO: Remove it later
	async _updateBroadhash() {
		const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
			this.storage,
			this._broadhash,
			this._lastBlock.height,
		);
		this._broadhash = broadhash;
		this.emit(EVENT_NEW_BROADHASH, { broadhash, height });
	}
}

module.exports = {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
	EVENT_PRIORITY_CHAIN_DETECTED,
};
