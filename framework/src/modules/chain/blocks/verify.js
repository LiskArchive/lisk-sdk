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
const blockVersion = require('./block_version');
const { getId, verifySignature: verifyBlockSignature } = require('./block');
const Bignum = require('../helpers/bignum');
const { setHeight } = require('./utils');

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
const checkExists = async (storage, block) => {
	// Check if block id is already in the database (very low probability of hash collision)
	// TODO: In case of hash-collision, to me it would be a special autofork...
	// DATABASE: read only
	const isPersisted = await storage.entities.Block.isPersisted({
		id: block.id,
	});
	if (isPersisted) {
		throw new Error(`Block ${block.id} already exists`);
	}
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
const validateBlockSlot = async (delegatesModule, block) => {
	// Check if block was generated by the right active delagate. Otherwise, fork 3
	// DATABASE: Read only to mem_accounts to extract active delegate list
	try {
		await delegatesModule.validateBlockSlot(block);
	} catch (error) {
		delegatesModule.fork(block, 3);
		throw error;
	}
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
const verifySignature = (block, result) => {
	let valid;

	try {
		valid = verifyBlockSignature(block);
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
	const expectedReward = blockReward.calcReward(block.height);
	if (
		block.height !== 1 &&
		!expectedReward.isEqualTo(block.reward) &&
		!exceptions.blockRewards.includes(block.id)
	) {
		result.errors.push(
			new Error(
				`Invalid block reward: ${block.reward} expected: ${expectedReward}`
			)
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
		block.id = getId(block);
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
	result
) => {
	if (block.payloadLength > maxPayloadLength) {
		result.errors.push(new Error('Payload length is too long'));
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		result.errors.push(
			new Error('Included transactions do not match block transactions count')
		);
	}

	if (block.transactions.length > maxTransactionsPerBlock) {
		result.errors.push(
			new Error('Number of transactions exceeds maximum per block')
		);
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
		result.errors.push(new Error('Invalid payload hash'));
	}

	if (!totalAmount.isEqualTo(block.totalAmount)) {
		result.errors.push(new Error('Invalid total amount'));
	}

	if (!totalFee.isEqualTo(block.totalFee)) {
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
const verifyForkOne = (delegatesModule, block, lastBlock, result) => {
	if (block.previousBlock && block.previousBlock !== lastBlock.id) {
		delegatesModule.fork(block, 1);
		result.errors.push(
			new Error(
				`Invalid previous block: ${block.previousBlock} expected: ${
					lastBlock.id
				}`
			)
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
const verifyReceipt = (
	storage,
	slots,
	blockSlotWindow,
	maxTransactionsPerBlock,
	maxPayloadLength,
	blockRewards,
	lastNBlockIds,
	exceptions,
	block,
	lastBlock
) => {
	block = setHeight(block, lastBlock);

	let result = { verified: false, errors: [] };

	result = verifySignature(block, result);
	result = verifyPreviousBlock(block, result);
	result = verifyAgainstLastNBlockIds(block, lastNBlockIds, result);
	result = verifyBlockSlotWindow(slots, blockSlotWindow, block, result);
	result = verifyVersion(block, exceptions, result);
	result = verifyReward(blockRewards, block, result);
	result = verifyId(block, result);
	result = verifyPayload(
		block,
		maxTransactionsPerBlock,
		maxPayloadLength,
		result
	);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

/**
 * Verify block before processing and return all possible errors related to block.
 *
 * @param {Object} block - Full block
 * @returns {Object} result - Verification results
 * @returns {boolean} result.verified - Indicator that verification passed
 * @returns {Array} result.errors - Array of validation errors
 */
const verifyBlock = (block, lastBlock) => {
	block = setHeight(block, lastBlock);

	let result = { verified: false, errors: [] };

	result = verifySignature(block, result);
	result = verifyPreviousBlock(block, result);
	result = verifyVersion(block, result);
	result = verifyReward(block, result);
	result = verifyId(block, result);
	result = verifyPayload(block, result);

	result = verifyForkOne(block, lastBlock, result);
	result = verifyBlockSlot(block, lastBlock, result);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

module.exports = {
	checkExists,
	validateBlockSlot,
	verifySignature,
	verifyBlockSlotWindow,
	verifyPreviousBlock,
	verifyBlockSlot,
	verifyForkOne,
	verifyAgainstLastNBlockIds,
	verifyVersion,
	verifyReward,
	verifyReceipt,
	verifyBlock,
};
