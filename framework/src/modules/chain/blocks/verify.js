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

const BigNum = require('@liskhq/bignum');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const { hash } = require('@liskhq/lisk-cryptography');
const blockVersion = require('./block_version');
const blocksLogic = require('./block');
const blocksUtils = require('./utils');
const transactionsModule = require('../transactions');

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
const verifySignature = (block, result) => {
	let valid;

	try {
		valid = blocksLogic.verifySignature(block);
	} catch (error) {
		result.errors.push(error);
	}

	if (!valid) {
		result.errors.push(new Error('Failed to verify block signature'));
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
const verifyPreviousBlock = (block, result) => {
	if (!block.previousBlock && block.height !== 1) {
		result.errors.push(new Error('Invalid previous block'));
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
const verifyAgainstLastNBlockIds = (block, lastNBlockIds, result) => {
	if (lastNBlockIds.indexOf(block.id) !== -1) {
		result.errors.push(new Error('Block already exists in chain'));
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
const verifyVersion = (block, exceptions, result) => {
	if (!blockVersion.isValid(block.version, block.height, exceptions)) {
		result.errors.push(new Error('Invalid block version'));
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
const verifyReward = (blockReward, block, exceptions, result) => {
	const expectedReward = blockReward.calculateReward(block.height);
	if (
		block.height !== 1 &&
		!expectedReward.equals(block.reward) &&
		(!exceptions.blockRewards || !exceptions.blockRewards.includes(block.id))
	) {
		result.errors.push(
			new Error(
				`Invalid block reward: ${block.reward} expected: ${expectedReward}`,
			),
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
const verifyId = (block, result) => {
	try {
		// Overwrite block ID
		block.id = blocksLogic.getId(block);
	} catch (error) {
		result.errors.push(error);
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
const verifyPayload = (
	block,
	maxTransactionsPerBlock,
	maxPayloadLength,
	result,
) => {
	if (block.payloadLength > maxPayloadLength) {
		result.errors.push(new Error('Payload length is too long'));
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		result.errors.push(
			new Error('Included transactions do not match block transactions count'),
		);
	}

	if (block.transactions.length > maxTransactionsPerBlock) {
		result.errors.push(
			new Error('Number of transactions exceeds maximum per block'),
		);
	}

	let totalAmount = new BigNum(0);
	let totalFee = new BigNum(0);
	const transactionsBytesArray = [];
	const appliedTransactions = {};

	block.transactions.forEach(transaction => {
		let transactionBytes;

		try {
			transactionBytes = transaction.getBytes();
		} catch (e) {
			result.errors.push(e.toString());
		}

		if (appliedTransactions[transaction.id]) {
			result.errors.push(
				new Error(`Encountered duplicate transaction: ${transaction.id}`),
			);
		}

		appliedTransactions[transaction.id] = transaction;
		if (transactionBytes) {
			transactionsBytesArray.push(transactionBytes);
		}
		totalAmount = totalAmount.plus(transaction.amount);
		totalFee = totalFee.plus(transaction.fee);
	});

	const transactionsBuffer = Buffer.concat(transactionsBytesArray);
	const payloadHash = hash(transactionsBuffer).toString('hex');

	if (payloadHash !== block.payloadHash) {
		result.errors.push(new Error('Invalid payload hash'));
	}

	if (!totalAmount.equals(block.totalAmount)) {
		result.errors.push(new Error('Invalid total amount'));
	}

	if (!totalFee.equals(block.totalFee)) {
		result.errors.push(new Error('Invalid total fee'));
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
const verifyForkOne = (roundsModule, block, lastBlock, result) => {
	if (block.previousBlock && block.previousBlock !== lastBlock.id) {
		roundsModule.fork(block, 1);
		result.errors.push(
			new Error(
				`Invalid previous block: ${block.previousBlock} expected: ${
					lastBlock.id
				}`,
			),
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
const verifyBlockSlot = (slots, block, lastBlock, result) => {
	const blockSlotNumber = slots.getSlotNumber(block.timestamp);
	const lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	if (
		blockSlotNumber > slots.getSlotNumber() ||
		blockSlotNumber <= lastBlockSlotNumber
	) {
		result.errors.push(new Error('Invalid block timestamp'));
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
const verifyBlockSlotWindow = (slots, blockSlotWindow, block, result) => {
	const currentApplicationSlot = slots.getSlotNumber();
	const blockSlot = slots.getSlotNumber(block.timestamp);

	// Reject block if it's slot is older than BLOCK_SLOT_WINDOW
	if (currentApplicationSlot - blockSlot > blockSlotWindow) {
		result.errors.push(new Error('Block slot is too old'));
	}

	// Reject block if it's slot is in the future
	if (currentApplicationSlot < blockSlot) {
		result.errors.push(new Error('Block slot is in the future'));
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
const verifyReceipt = ({
	slots,
	blockSlotWindow,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockReward,
	lastNBlockIds,
	exceptions,
	block,
	lastBlock,
}) => {
	block = blocksUtils.setHeight(block, lastBlock);

	let result = { verified: false, errors: [] };

	result = verifySignature(block, result);
	result = verifyPreviousBlock(block, result);
	result = verifyAgainstLastNBlockIds(block, lastNBlockIds, result);
	result = verifyBlockSlotWindow(slots, blockSlotWindow, block, result);
	result = verifyVersion(block, exceptions, result);
	result = verifyReward(blockReward, block, exceptions, result);
	result = verifyId(block, result);
	result = verifyPayload(
		block,
		maxTransactionsPerBlock,
		maxPayloadLength,
		result,
	);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

class BlocksVerify {
	constructor({
		storage,
		exceptions,
		slots,
		roundsModule,
		interfaceAdapters,
		genesisBlock,
		blockReward,
		constants,
	}) {
		this.storage = storage;
		this.roundsModule = roundsModule;
		this.slots = slots;
		this.blockReward = blockReward;
		this.exceptions = exceptions;
		this.constants = constants;
		this.genesisBlock = genesisBlock;
		this.interfaceAdapters = interfaceAdapters;
	}

	verifyBlock(block, lastBlock) {
		block = blocksUtils.setHeight(block, lastBlock);

		let result = { verified: false, errors: [] };

		result = verifySignature(block, result);
		result = verifyPreviousBlock(block, result);
		result = verifyVersion(block, this.exceptions, result);
		result = verifyReward(this.blockReward, block, this.exceptions, result);
		result = verifyId(block, result);
		result = verifyPayload(
			block,
			this.constants.maxTransactionsPerBlock,
			this.constants.maxPayloadLength,
			result,
		);

		result = verifyForkOne(this.roundsModule, block, lastBlock, result);
		result = verifyBlockSlot(this.slots, block, lastBlock, result);

		result.verified = result.errors.length === 0;
		result.errors.reverse();

		return result;
	}

	async checkExists(block) {
		const isPersisted = await this.storage.entities.Block.isPersisted({
			id: block.id,
		});
		if (isPersisted) {
			throw new Error(`Block ${block.id} already exists`);
		}
		if (!block.transactions.length) {
			return;
		}
		const persistedTransactions = await this.storage.entities.Transaction.get({
			id_in: block.transactions.map(transaction => transaction.id),
		});

		if (persistedTransactions.length > 0) {
			throw new Error(
				`Transaction is already confirmed: ${persistedTransactions[0].id}`,
			);
		}
	}

	async validateBlockSlot(block) {
		// Check if block was generated by the right active delagate. Otherwise, fork 3
		// DATABASE: Read only to mem_accounts to extract active delegate list
		try {
			await this.roundsModule.validateBlockSlot(block);
		} catch (error) {
			this.roundsModule.fork(block, 3);
			throw error;
		}
	}

	async checkTransactions(block) {
		const { version, height, timestamp, transactions } = block;
		if (transactions.length === 0) {
			return;
		}
		const context = {
			blockVersion: version,
			blockHeight: height,
			blockTimestamp: timestamp,
		};

		const nonInertTransactions = transactions.filter(
			transaction =>
				!transactionsModule.checkIfTransactionIsInert(
					transaction,
					this.exceptions,
				),
		);

		const nonAllowedTxResponses = transactionsModule
			.checkAllowedTransactions(context)(nonInertTransactions)
			.transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);

		if (nonAllowedTxResponses) {
			throw nonAllowedTxResponses.errors;
		}

		const {
			transactionsResponses,
		} = await transactionsModule.verifyTransactions(
			this.storage,
			this.slots,
			this.exceptions,
		)(nonInertTransactions);

		const unverifiableTransactionsResponse = transactionsResponses.filter(
			transactionResponse =>
				transactionResponse.status !== TransactionStatus.OK,
		);

		if (unverifiableTransactionsResponse.length > 0) {
			throw unverifiableTransactionsResponse[0].errors;
		}
	}

	matchGenesisBlock(block) {
		return (
			block.id === this.genesisBlock.id &&
			block.payloadHash.toString('hex') === this.genesisBlock.payloadHash &&
			block.blockSignature.toString('hex') === this.genesisBlock.blockSignature
		);
	}

	async reloadRequired(blocksCount, memRounds) {
		const round = this.slots.calcRound(blocksCount);
		const unapplied = memRounds.filter(row => row.round !== round);
		if (unapplied.length > 0) {
			throw new Error('Detected unapplied rounds in mem_round');
		}
		const accounts = await this.storage.entities.Account.get(
			{ isDelegate: true },
			{ limit: null },
		);
		const delegatesPublicKeys = accounts.map(account => account.publicKey);
		if (delegatesPublicKeys.length === 0) {
			throw new Error('No delegates found');
		}
	}

	async requireBlockRewind(currentBlock) {
		const currentHeight = currentBlock.height;
		const currentRound = this.slots.calcRound(currentHeight);
		const secondLastRound = currentRound - 2;
		const validateTillHeight =
			secondLastRound < 1 ? 2 : this.slots.calcRoundEndHeight(secondLastRound);
		const secondLastBlock = await blocksUtils.loadBlockByHeight(
			this.storage,
			currentHeight - 1,
			this.interfaceAdapters,
			this.genesisBlock,
		);
		const currentBlockResult = this.verifyBlock(currentBlock, secondLastBlock);
		if (currentBlockResult.verified) {
			return false;
		}
		const startBlock = await blocksUtils.loadBlockByHeight(
			this.storage,
			validateTillHeight,
			this.interfaceAdapters,
			this.genesisBlock,
		);
		const startBlockLastBlock = await blocksUtils.loadBlockByHeight(
			this.storage,
			startBlock.height - 1,
			this.interfaceAdapters,
			this.genesisBlock,
		);
		const startBlockResult = this.verifyBlock(startBlock, startBlockLastBlock);
		if (!startBlockResult.verified) {
			throw new Error(
				`There are more than ${currentHeight -
					validateTillHeight} invalid blocks. Can't delete those to recover the chain.`,
			);
		}
		return true;
	}

	// eslint-disable-next-line class-methods-use-this
	isSaneBlock(block, lastBlock) {
		return (
			block.previousBlock === lastBlock.id &&
			lastBlock.height + 1 === block.height
		);
	}

	// eslint-disable-next-line class-methods-use-this
	isForkOne(block, lastBlock) {
		return (
			block.previousBlock !== lastBlock.id &&
			lastBlock.height + 1 === block.height
		);
	}

	// eslint-disable-next-line class-methods-use-this
	shouldDiscardForkOne(block, lastBlock) {
		return (
			block.timestamp > lastBlock.timestamp ||
			(block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)
		);
	}

	async normalizeAndVerify(block, lastBlock, lastNBlockIds) {
		let normalizedBlock;
		try {
			normalizedBlock = blocksLogic.objectNormalize(block, this.exceptions);
		} catch (errors) {
			return {
				verified: false,
				errors,
			};
		}
		try {
			await this.validateBlockSlot(normalizedBlock);
		} catch (error) {
			return {
				verified: false,
				errors: [error],
			};
		}
		return verifyReceipt({
			...this.constants,
			block: normalizedBlock,
			lastNBlockIds,
			lastBlock,
			exceptions: this.exceptions,
			slots: this.slots,
			blockReward: this.blockReward,
		});
	}

	// eslint-disable-next-line class-methods-use-this
	isForkFive(block, lastBlock) {
		return (
			block.previousBlock === lastBlock.previousBlock &&
			block.height === lastBlock.height &&
			block.id !== lastBlock.id
		);
	}

	// eslint-disable-next-line class-methods-use-this
	isDoubleForge(block, lastBlock) {
		return block.generatorPublicKey === lastBlock.generatorPublicKey;
	}

	// eslint-disable-next-line class-methods-use-this
	shouldDiscardForkFive(block, lastBlock) {
		return (
			block.timestamp > lastBlock.timestamp ||
			(block.timestamp === lastBlock.timestamp && block.id > lastBlock.id)
		);
	}
}

module.exports = {
	BlocksVerify,
	verifyId,
	verifySignature,
	verifyBlockSlotWindow,
	verifyPreviousBlock,
	verifyPayload,
	verifyBlockSlot,
	verifyForkOne,
	verifyAgainstLastNBlockIds,
	verifyVersion,
	verifyReward,
	verifyReceipt,
};
