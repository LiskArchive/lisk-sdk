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

import { BlockHeaderWithID, Chain } from './types';

type Slots = Chain['slots'];

export const forgingSlot = (slots: Slots, block: BlockHeaderWithID): number =>
	slots.getSlotNumber(block.timestamp);

export const isBlockReceivedWithinForgingSlot = (
	slots: Slots,
	{ timestamp, receivedAt }: BlockHeaderWithID,
): boolean =>
	slots.isWithinTimeslot(slots.getSlotNumber(timestamp), receivedAt);

export const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots: Slots,
	lastAppliedBlock: BlockHeaderWithID,
): boolean => {
	/* If the block doesn't have the property `receivedAt` it means it was forged
	 or synced, therefore we assume it was "received in the correct slot" */
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

export const isValidBlock = (
	lastBlock: BlockHeaderWithID,
	currentBlock: BlockHeaderWithID,
): boolean =>
	lastBlock.height + 1 === currentBlock.height &&
	lastBlock.id === currentBlock.previousBlockId;

export const isIdenticalBlock = (
	lastBlock: BlockHeaderWithID,
	currentBlock: BlockHeaderWithID,
): boolean => lastBlock.id === currentBlock.id;

export const isDuplicateBlock = (
	lastBlock: BlockHeaderWithID,
	currentBlock: BlockHeaderWithID,
): boolean =>
	lastBlock.height === currentBlock.height &&
	lastBlock.maxHeightPrevoted === currentBlock.maxHeightPrevoted &&
	lastBlock.previousBlockId === currentBlock.previousBlockId;

export const isDoubleForging = (
	lastBlock: BlockHeaderWithID,
	currentBlock: BlockHeaderWithID,
): boolean =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey === currentBlock.generatorPublicKey;

export const isTieBreak = ({
	slots,
	lastAppliedBlock,
	receivedBlock,
}: {
	readonly slots: Slots;
	readonly lastAppliedBlock: BlockHeaderWithID;
	readonly receivedBlock: BlockHeaderWithID;
}): boolean =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

export const isDifferentChain = (
	lastBlock: BlockHeaderWithID,
	currentBlock: BlockHeaderWithID,
): boolean => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const maxHeightPrevoted = lastBlock.maxHeightPrevoted || 0;

	return (
		maxHeightPrevoted < currentBlock.maxHeightPrevoted ||
		(lastBlock.height < currentBlock.height &&
			maxHeightPrevoted === currentBlock.maxHeightPrevoted)
	);
};
