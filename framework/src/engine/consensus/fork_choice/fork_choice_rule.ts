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

import { BlockHeader } from '@liskhq/lisk-chain';
import { BFTHeader } from '../types';

export enum ForkStatus {
	IDENTICAL_BLOCK = 1,
	VALID_BLOCK = 2,
	DOUBLE_FORGING = 3,
	TIE_BREAK = 4,
	DIFFERENT_CHAIN = 5,
	DISCARD = 6,
}

interface Slots {
	getSlotTime(slot: number): number;
	getSlotNumber(timeStamp: number): number;
	isWithinTimeslot(slot: number, time: number): boolean;
}

export const forgingSlot = (slots: Slots, block: BFTHeader): number =>
	slots.getSlotNumber(block.timestamp);

export const isBlockReceivedWithinForgingSlot = (
	slots: Slots,
	{ timestamp, receivedAt }: BFTHeader,
): boolean =>
	slots.isWithinTimeslot(
		slots.getSlotNumber(timestamp),
		receivedAt ?? Math.floor(Date.now() / 1000),
	);

export const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots: Slots,
	lastAppliedBlock: BFTHeader,
): boolean => {
	/* If the block doesn't have the property `receivedAt` it means it was forged
	 or synced, therefore we assume it was "received in the correct slot" */
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

export const isValidBlock = (lastBlock: BFTHeader, currentBlock: BFTHeader): boolean =>
	lastBlock.height + 1 === currentBlock.height && lastBlock.id.equals(currentBlock.previousBlockID);

export const isIdenticalBlock = (lastBlock: BFTHeader, currentBlock: BFTHeader): boolean =>
	lastBlock.id.equals(currentBlock.id);

export const isDuplicateBlock = (lastBlock: BFTHeader, currentBlock: BFTHeader): boolean =>
	lastBlock.height === currentBlock.height &&
	lastBlock.maxHeightPrevoted === currentBlock.maxHeightPrevoted &&
	lastBlock.previousBlockID.equals(currentBlock.previousBlockID);

export const isDoubleForging = (lastBlock: BFTHeader, currentBlock: BFTHeader): boolean =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorAddress.equals(currentBlock.generatorAddress);

export const isTieBreak = ({
	slots,
	lastAppliedBlock,
	receivedBlock,
}: {
	readonly slots: Slots;
	readonly lastAppliedBlock: BFTHeader;
	readonly receivedBlock: BFTHeader;
}): boolean =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

interface DifferentChainCheckHeader {
	height: number;
	maxHeightPrevoted: number;
}

export const isDifferentChain = (
	lastBlock: DifferentChainCheckHeader,
	currentBlock: DifferentChainCheckHeader,
): boolean => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const maxHeightPrevoted = lastBlock.maxHeightPrevoted || 0;

	return (
		maxHeightPrevoted < currentBlock.maxHeightPrevoted ||
		(lastBlock.height < currentBlock.height && maxHeightPrevoted === currentBlock.maxHeightPrevoted)
	);
};

export const forkChoice = (
	blockHeader: BlockHeader,
	lastBlockHeader: BlockHeader,
	slots: Slots,
): ForkStatus => {
	// Current time since Lisk Epoch
	const receivedBFTHeader = {
		...blockHeader.toObject(),
		receivedAt: Math.floor(Date.now() / 1000),
	};

	/* Cases are numbered following LIP-0014 Fork choice rule.
	 See: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#applying-blocks-according-to-fork-choice-rule
		 Case 2 and 1 have flipped execution order for better readability. Behavior is still the same */

	if (isValidBlock(lastBlockHeader, blockHeader)) {
		// Case 2: correct block received
		return ForkStatus.VALID_BLOCK;
	}

	if (isIdenticalBlock(lastBlockHeader, blockHeader)) {
		// Case 1: same block received twice
		return ForkStatus.IDENTICAL_BLOCK;
	}

	if (isDoubleForging(lastBlockHeader, blockHeader)) {
		// Delegates are the same
		// Case 3: double forging different blocks in the same slot.
		// Last Block stands.
		return ForkStatus.DOUBLE_FORGING;
	}

	if (
		isTieBreak({
			slots,
			lastAppliedBlock: lastBlockHeader,
			receivedBlock: receivedBFTHeader,
		})
	) {
		// Two competing blocks by different delegates at the same height.
		// Case 4: Tie break
		return ForkStatus.TIE_BREAK;
	}

	if (isDifferentChain(lastBlockHeader, blockHeader)) {
		// Case 5: received block has priority. Move to a different chain.
		return ForkStatus.DIFFERENT_CHAIN;
	}

	// Discard newly received block
	return ForkStatus.DISCARD;
};
