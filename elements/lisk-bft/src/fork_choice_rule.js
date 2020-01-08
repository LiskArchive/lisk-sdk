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

const FORK_STATUS_IDENTICAL_BLOCK = 1;
const FORK_STATUS_VALID_BLOCK = 2;
const FORK_STATUS_DOUBLE_FORGING = 3;
const FORK_STATUS_TIE_BREAK = 4;
const FORK_STATUS_DIFFERENT_CHAIN = 5;
const FORK_STATUS_DISCARD = 6;

const forgingSlot = (slots, block) => slots.getSlotNumber(block.timestamp);

const isBlockReceivedWithinForgingSlot = (slots, { timestamp, receivedAt }) =>
	slots.isWithinTimeslot(slots.getSlotNumber(timestamp), receivedAt);

const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots,
	lastAppliedBlock,
) => {
	// If the block doesn't have the property `receivedAt` it meants it was forged
	// or synced, therefore we assume it was "received in the correct slot"
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

// eslint-disable-next-line class-methods-use-this
const isValidBlock = (lastBlock, currentBlock) =>
	lastBlock.height + 1 === currentBlock.height &&
	lastBlock.id === currentBlock.previousBlockId;

// eslint-disable-next-line class-methods-use-this
const isIdenticalBlock = (lastBlock, currentBlock) =>
	lastBlock.id === currentBlock.id;

// eslint-disable-next-line class-methods-use-this
const isDuplicateBlock = (lastBlock, currentBlock) =>
	lastBlock.height === currentBlock.height &&
	lastBlock.maxHeightPrevoted === currentBlock.maxHeightPrevoted &&
	lastBlock.previousBlockId === currentBlock.previousBlockId;

const isDoubleForging = (lastBlock, currentBlock) =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey === currentBlock.generatorPublicKey;

const isTieBreak = ({ slots, lastAppliedBlock, receivedBlock }) =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

// eslint-disable-next-line class-methods-use-this
const isDifferentChain = (lastBlock, currentBlock) => {
	const maxHeightPrevoted = lastBlock.maxHeightPrevoted || 0;

	return (
		maxHeightPrevoted < currentBlock.maxHeightPrevoted ||
		(lastBlock.height < currentBlock.height &&
			maxHeightPrevoted === currentBlock.maxHeightPrevoted)
	);
};

module.exports = {
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
	isTieBreak,
	isDoubleForging,
	isDifferentChain,
	isIdenticalBlock,
	isValidBlock,
	isDuplicateBlock,
};
