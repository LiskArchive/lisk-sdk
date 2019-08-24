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
	verifyAgainstLastNBlockIds,
} = require('./verify');
const {
	applyConfirmedStep,
	applyConfirmedGenesisStep,
	deleteLastBlock,
	undoConfirmedStep,
	saveBlockStep,
	parseBlockToJson,
	backwardTickStep,
} = require('./chain');
const {
	calculateSupply,
	calculateReward,
	calculateMilestone,
} = require('./block_reward');
const forkChoiceRule = require('./fork_choice_rule');
const {
	validateSignature,
	validatePreviousBlock,
	validateReward,
	validatePayload,
	validateBlockSlot,
	validateBlockSlotWindow,
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
		roundsModule,
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
		this._lastNBlockIds = [];
		this._lastBlock = {};
		this._isActive = false;

		/**
		 * Represents the receipt time of the last block that was received
		 * from the network.
		 * TODO: Remove after fork.
		 * @type {number}
		 * @private
		 */
		this._lastReceipt = null;

		this._cleaning = false;

		this.logger = logger;
		this.storage = storage;
		this.roundsModule = roundsModule;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		const blockRewardArgs = {
			distance: rewardDistance,
			rewardOffset,
			milestones: rewardMileStones,
			totalAmount,
		};
		this.blockReward = {
			calculateMilestone: height => calculateMilestone(height, blockRewardArgs),
			calculateReward: height => calculateReward(height, blockRewardArgs),
			calculateSupply: height => calculateSupply(height, blockRewardArgs),
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
			roundsModule: this.roundsModule,
			blockReward: this.blockReward,
			constants: this.constants,
			interfaceAdapters: this.interfaceAdapters,
		});

		this.blocksUtils = blocksUtils;
		this._receiveBlockImplementations = {
			0: block => this._receiveBlockFromNetworkV1(block),
			1: block => this._receiveBlockFromNetworkV1(block),
			2: block => this._receiveBlockFromNetworkV2(block),
		};
	}

	get lastBlock() {
		// Remove receivedAt property..
		const { receivedAt, ...block } = this._lastBlock;
		return block;
	}

	get isActive() {
		return this._isActive;
	}

	async init() {
		// check mem tables
		const {
			blocksCount,
			genesisBlock,
			memRounds,
		} = await this.storage.entities.Block.begin(
			'loader:checkMemTables',
			async tx => blocksUtils.loadMemTables(this.storage, tx),
		);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);
		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		// check if the round related information is in valid state
		await this.blocksVerify.reloadRequired(blocksCount, memRounds);

		this._lastBlock = await blocksLogic.loadLastBlock(
			this.storage,
			this.interfaceAdapters,
			this.genesisBlock,
		);

		try {
			// Do we need this anymore?
			const rows = await this.storage.entities.Block.get(
				{},
				{ limit: this.constants.blockSlotWindow, sort: 'height:desc' },
			);
			this._lastNBlockIds = rows.map(row => row.id);
		} catch (error) {
			const errorMessageToThrow = `Unable to load last ${
				this.constants.blockSlotWindow
			} block ids, error: ${error}`;
			this.logger.error(
				error,
				`Unable to load last ${this.constants.blockSlotWindow} block ids`,
			);
			throw errorMessageToThrow;
		}
	}

	validate({ block, lastBlock, blockBytes }) {
		validateSignature(block, blockBytes);
		validatePreviousBlock(block);
		validateReward(block, this.blockReward, this.exceptions);
		validatePayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
		);
		validateBlockSlot(block, lastBlock, this.slots);
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

	validateNew({ block }) {
		validateBlockSlotWindow(block, this.slots, this.blockSlotWindow);
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

	async verify({ block }) {
		// TODO: Remove once BFT is complete, not needed anymore
		verifyAgainstLastNBlockIds(block, this._lastNBlockIds);
		await verifyBlockNotExists(this.storage, block);
		// TODO: move to DPOS verify step
		await this.blocksVerify.verifyBlockSlot(block);
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
	}

	async save({ block, tx }) {
		await saveBlockStep(this.storage, this.roundsModule, block, true, tx);
		this._lastBlock = block;
	}

	async saveGenesis({ block, tx, skipSave }) {
		await saveBlockStep(this.storage, this.roundsModule, block, !skipSave, tx);
		this._lastBlock = block;
	}

	async remove({ block, tx }, saveToTemp) {
		const storageRowOfBlock = await deleteLastBlock(this.storage, block, tx);
		const [secondLastBlock] = blocksLogic.readStorageRows(
			[storageRowOfBlock],
			this.interfaceAdapters,
			this.genesisBlock,
		);
		await backwardTickStep(this.roundsModule, block, secondLastBlock, tx);

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

	async deleteLastBlockAndGet(tx) {
		const originalLastBlock = cloneDeep(this._lastBlock);
		this._lastBlock = await this.remove({ block: this._lastBlock, tx });
		this.emit(EVENT_DELETE_BLOCK, {
			block: originalLastBlock,
			newLastBlock: cloneDeep(this._lastBlock),
		});
		return this._lastBlock;
	}

	async loadBlocksDataWS(filter, tx) {
		return blocksUtils.loadBlocksDataWS(this.storage, filter, tx);
	}

	readBlocksFromNetwork(blocks) {
		const normalizedBlocks = blocksUtils.readDbRows(
			blocks,
			this.interfaceAdapters,
			this.genesisBlock,
		);
		return normalizedBlocks;
	}

	/**
	 * Returns the highest common block between ids and the database blocks table
	 * @param {Array<String>} ids - An array of block ids
	 * @return {Promise<BasicBlock|undefined>}
	 */
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

	_updateLastNBlocks(block) {
		this._lastNBlockIds.push(block.id);
		if (this._lastNBlockIds.length > this.constants.blockSlotWindow) {
			this._lastNBlockIds.shift();
		}
	}

	_updateLastReceipt() {
		this._lastReceipt = Math.floor(Date.now() / 1000);
		return this._lastReceipt;
	}

	async _updateBroadhash() {
		const { broadhash, height } = await blocksUtils.calculateNewBroadhash(
			this.storage,
			this._broadhash,
			this._lastBlock.height,
		);
		this._broadhash = broadhash;
		this.emit(EVENT_NEW_BROADHASH, { broadhash, height });
	}

	_shouldNotBeActive() {
		if (this._isActive) {
			throw new Error('Block process cannot be executed in parallel');
		}
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
