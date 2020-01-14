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

import { Block, Slots } from './types';

export const FORK_STATUS_IDENTICAL_BLOCK = 1;
export const FORK_STATUS_VALID_BLOCK = 2;
export const FORK_STATUS_DOUBLE_FORGING = 3;
export const FORK_STATUS_TIE_BREAK = 4;
export const FORK_STATUS_DIFFERENT_CHAIN = 5;
export const FORK_STATUS_DISCARD = 6;

export const forgingSlot = (slots: Slots, block: Block): number =>
	slots.getSlotNumber(block.timestamp);

export const isBlockReceivedWithinForgingSlot = (
	slots: Slots,
	{ timestamp, receivedAt }: Block,
): boolean =>
	slots.isWithinTimeslot(slots.getSlotNumber(timestamp), receivedAt);

export const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots: Slots,
	lastAppliedBlock: Block,
): boolean => {
	/* If the block doesn't have the property `receivedAt` it meants it was forged
	 or synced, therefore we assume it was "received in the correct slot" */
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

export const isValidBlock = (lastBlock: Block, currentBlock: Block): boolean =>
	lastBlock.height + 1 === currentBlock.height &&
	lastBlock.id === currentBlock.previousBlockId;

export const isIdenticalBlock = (
	lastBlock: Block,
	currentBlock: Block,
): boolean => lastBlock.id === currentBlock.id;

export const isDuplicateBlock = (
	lastBlock: Block,
	currentBlock: Block,
): boolean =>
	lastBlock.height === currentBlock.height &&
	lastBlock.maxHeightPrevoted === currentBlock.maxHeightPrevoted &&
	lastBlock.previousBlockId === currentBlock.previousBlockId;

export const isDoubleForging = (
	lastBlock: Block,
	currentBlock: Block,
): boolean =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey === currentBlock.generatorPublicKey;

export const isTieBreak = ({
	slots,
	lastAppliedBlock,
	receivedBlock,
}: {
	readonly slots: Slots;
	readonly lastAppliedBlock: Block;
	readonly receivedBlock: Block;
}): boolean =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

export const isDifferentChain = (
	lastBlock: Block,
	currentBlock: Block,
): boolean => {
	const maxHeightPrevoted = lastBlock.maxHeightPrevoted || 0;

	return (
		maxHeightPrevoted < currentBlock.maxHeightPrevoted ||
		(lastBlock.height < currentBlock.height &&
			maxHeightPrevoted === currentBlock.maxHeightPrevoted)
	);
};
