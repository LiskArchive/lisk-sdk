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
const BigNum = require('@liskhq/bignum');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	applyTransactions,
	composeTransactionSteps,
	checkPersistedTransactions,
	checkAllowedTransactions,
	validateTransactions,
	verifyTransactions,
	processSignature,
} = require('./transactions');
const {
	TransactionInterfaceAdapter,
} = require('./transaction_interface_adapter');
const { StateStore } = require('./state_store');
const blocksUtils = require('./utils');
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
	saveBlock,
} = require('./chain');
const {
	calculateSupply,
	calculateReward,
	calculateMilestone,
} = require('./block_reward');
const {
	validateSignature,
	validatePreviousBlockProperty,
	validateReward,
	validatePayload,
	validateBlockSlot,
} = require('./validate');

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
		registeredTransactions,
		// constants
		networkIdentifier,
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
		this._lastBlock = {};
		this._transactionAdapter = new TransactionInterfaceAdapter(
			networkIdentifier,
			registeredTransactions,
		);

		this.logger = logger;
		this.storage = storage;
		this.exceptions = exceptions;
		this.genesisBlock = genesisBlock;
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
		const {
			genesisBlock,
		} = await this.storage.entities.Block.begin(
			'loader:checkMemTables',
			async tx => blocksUtils.loadMemTables(this.storage, tx),
		);

		const genesisBlockMatch = this.blocksVerify.matchGenesisBlock(genesisBlock);

		if (!genesisBlockMatch) {
			throw new Error('Genesis block does not match');
		}

		const [storageLastBlock] = await this.storage.entities.Block.get(
			{},
			{ sort: 'height:desc', limit: 1, extended: true },
		);
		if (!storageLastBlock) {
			throw new Error('Failed to load last block');
		}

		this._lastBlock = this.deserialize(storageLastBlock);
	}

	// eslint-disable-next-line class-methods-use-this
	serialize(blockInstance) {
		const blockJSON = {
			...blockInstance,
			totalAmount: blockInstance.totalAmount.toString(),
			totalFee: blockInstance.totalFee.toString(),
			reward: blockInstance.reward.toString(),
			transactions: blockInstance.transactions.map(tx => ({
				...tx.toJSON(),
				blockId: blockInstance.id,
			})),
		};
		return blockJSON;
	}

	deserialize(blockJSON) {
		const transactions = (blockJSON.transactions || []).map(transaction =>
			this._transactionAdapter.fromJSON(transaction),
		);
		return {
			...blockJSON,
			totalAmount: new BigNum(blockJSON.totalAmount || 0),
			totalFee: new BigNum(blockJSON.totalFee || 0),
			reward: new BigNum(blockJSON.reward || 0),
			version:
				blockJSON.version === undefined || blockJSON.version === null
					? 0
					: blockJSON.version,
			numberOfTransactions: transactions.length,
			payloadLength:
				blockJSON.payloadLength === undefined ||
				blockJSON.payloadLength === null
					? 0
					: blockJSON.payloadLength,
			transactions,
		};
	}

	deserializeTransaction(transactionJSON) {
		return this._transactionAdapter.fromJSON(transactionJSON);
	}

	async validateBlockHeader(block, blockBytes, expectedReward) {
		validatePreviousBlockProperty(block, this.genesisBlock);
		validateSignature(block, blockBytes);
		validateReward(block, expectedReward, this.exceptions);

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

		validatePayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
		);

		// Update id
		block.id = blocksUtils.getId(blockBytes);
	}

	async verifyInMemory(block, lastBlock) {
		verifyPreviousBlockId(block, lastBlock, this.genesisBlock);
		validateBlockSlot(block, lastBlock, this.slots);
	}

	async verify(blockInstance, stateStore, { skipExistingCheck }) {
		if (skipExistingCheck !== true) {
			await verifyBlockNotExists(this.storage, blockInstance);
			const {
				transactionsResponses: persistedResponse,
			} = await checkPersistedTransactions(this.storage)(
				blockInstance.transactions,
			);
			const invalidPersistedResponse = persistedResponse.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidPersistedResponse) {
				throw invalidPersistedResponse.errors;
			}
		}
		await this.blocksVerify.checkTransactions(blockInstance, stateStore);
	}

	async apply(blockInstance, stateStore) {
		await applyConfirmedStep(blockInstance, stateStore, this.exceptions);

		this._lastBlock = blockInstance;
	}

	async applyGenesis(blockInstance, stateStore) {
		await applyConfirmedGenesisStep(blockInstance, stateStore);

		this._lastBlock = blockInstance;
	}

	async save(blockJSON, tx) {
		await saveBlock(this.storage, blockJSON, tx);
	}

	async undo(blockInstance, stateStore) {
		await undoConfirmedStep(blockInstance, stateStore, this.exceptions);
	}

	async remove(
		block,
		blockJSON,
		tx,
		{ saveTempBlock } = { saveTempBlock: false },
	) {
		const storageRowOfBlock = await deleteLastBlock(this.storage, block, tx);
		const secondLastBlock = this.deserialize(storageRowOfBlock);

		if (saveTempBlock) {
			const blockTempEntry = {
				id: blockJSON.id,
				height: blockJSON.height,
				fullBlock: blockJSON,
			};
			await this.storage.entities.TempBlock.create(blockTempEntry, {}, tx);
		}
		this._lastBlock = secondLastBlock;
	}

	async removeBlockFromTempTable(blockId, tx) {
		return this.storage.entities.TempBlock.delete({ id: blockId }, {}, tx);
	}

	async getTempBlocks(filter = {}, options = {}, tx) {
		return this.storage.entities.TempBlock.get(filter, options, tx);
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

	async getJSONBlocksWithLimitAndOffset(limit, offset = 0) {
		// Calculate toHeight
		const toHeight = offset + limit;

		const filters = {
			height_gte: offset,
			height_lt: toHeight,
		};

		const options = {
			limit: null,
			sort: ['height:asc', 'rowId:asc'],
			extended: true,
		};

		// Loads extended blocks from storage
		return this.storage.entities.Block.get(filters, options);
	}

	async loadBlocksFromLastBlockId(lastBlockId, limit = 1) {
		return blocksUtils.loadBlocksFromLastBlockId(
			this.storage,
			lastBlockId,
			limit,
		);
	}

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
			const errMessage = 'Failed to fetch the highest common block';
			this.logger.error({ err: e }, errMessage);
			throw new Error(errMessage);
		}
	}

	// TODO: Unit tests written in mocha, which should be migrated to jest.
	async filterReadyTransactions(transactions, context) {
		const stateStore = new StateStore(this.storage);
		const allowedTransactionsIds = checkAllowedTransactions(context)(
			transactions,
		)
			.transactionsResponses.filter(
				transactionResponse =>
					transactionResponse.status === TransactionStatus.OK,
			)
			.map(transactionResponse => transactionResponse.id);

		const allowedTransactions = transactions.filter(transaction =>
			allowedTransactionsIds.includes(transaction.id),
		);
		const { transactionsResponses: responses } = await applyTransactions(
			this.exceptions,
		)(allowedTransactions, stateStore);
		const readyTransactions = allowedTransactions.filter(transaction =>
			responses
				.filter(response => response.status === TransactionStatus.OK)
				.map(response => response.id)
				.includes(transaction.id),
		);
		return readyTransactions;
	}

	async validateTransactions(transactions) {
		return composeTransactionSteps(
			checkAllowedTransactions(this.lastBlock),
			validateTransactions(this.exceptions),
			// Composed transaction checks are all static, so it does not need state store
		)(transactions, undefined);
	}

	async verifyTransactions(transactions) {
		const stateStore = new StateStore(this.storage);
		return composeTransactionSteps(
			checkAllowedTransactions(() => {
				const { version, height, timestamp } = this._lastBlock;
				return {
					blockVersion: version,
					blockHeight: height,
					blockTimestamp: timestamp,
				};
			}),
			checkPersistedTransactions(this.storage),
			verifyTransactions(this.slots, this.exceptions),
		)(transactions, stateStore);
	}

	async processTransactions(transactions) {
		const stateStore = new StateStore(this.storage);
		return composeTransactionSteps(
			checkPersistedTransactions(this.storage),
			applyTransactions(this.exceptions),
		)(transactions, stateStore);
	}

	async processSignature(transaction, signature) {
		const stateStore = new StateStore(this.storage);
		return processSignature()(transaction, signature, stateStore);
	}
}

module.exports = {
	Blocks,
};
