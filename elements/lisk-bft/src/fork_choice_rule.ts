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

import { Chain } from '@liskhq/lisk-chain';
import { BlockHeaderWithReceivedAt as BlockHeader } from './types';

type Slots = Chain['slots'];

export const forgingSlot = (slots: Slots, block: BlockHeader): number =>
	slots.getSlotNumber(block.timestamp);

export const isBlockReceivedWithinForgingSlot = (
	slots: Slots,
	{ timestamp, receivedAt }: BlockHeader,
): boolean => slots.isWithinTimeslot(slots.getSlotNumber(timestamp), receivedAt);

export const isLastAppliedBlockReceivedWithinForgingSlot = (
	slots: Slots,
	lastAppliedBlock: BlockHeader,
): boolean => {
	/* If the block doesn't have the property `receivedAt` it means it was forged
	 or synced, therefore we assume it was "received in the correct slot" */
	if (!lastAppliedBlock.receivedAt) {
		return true;
	}

	return isBlockReceivedWithinForgingSlot(slots, lastAppliedBlock);
};

export const isValidBlock = (lastBlock: BlockHeader, currentBlock: BlockHeader): boolean =>
	lastBlock.height + 1 === currentBlock.height && lastBlock.id.equals(currentBlock.previousBlockID);

export const isIdenticalBlock = (lastBlock: BlockHeader, currentBlock: BlockHeader): boolean =>
	lastBlock.id.equals(currentBlock.id);

export const isDuplicateBlock = (lastBlock: BlockHeader, currentBlock: BlockHeader): boolean =>
	lastBlock.height === currentBlock.height &&
	lastBlock.asset.maxHeightPrevoted === currentBlock.asset.maxHeightPrevoted &&
	lastBlock.previousBlockID.equals(currentBlock.previousBlockID);

export const isDoubleForging = (lastBlock: BlockHeader, currentBlock: BlockHeader): boolean =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey.equals(currentBlock.generatorPublicKey);

export const isTieBreak = ({
	slots,
	lastAppliedBlock,
	receivedBlock,
}: {
	readonly slots: Slots;
	readonly lastAppliedBlock: BlockHeader;
	readonly receivedBlock: BlockHeader;
}): boolean =>
	isDuplicateBlock(lastAppliedBlock, receivedBlock) &&
	forgingSlot(slots, lastAppliedBlock) < forgingSlot(slots, receivedBlock) &&
	!isLastAppliedBlockReceivedWithinForgingSlot(slots, lastAppliedBlock) &&
	isBlockReceivedWithinForgingSlot(slots, receivedBlock);

export const isDifferentChain = (lastBlock: BlockHeader, currentBlock: BlockHeader): boolean => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const maxHeightPrevoted = lastBlock.asset.maxHeightPrevoted || 0;

	return (
		maxHeightPrevoted < currentBlock.asset.maxHeightPrevoted ||
		(lastBlock.height < currentBlock.height &&
			maxHeightPrevoted === currentBlock.asset.maxHeightPrevoted)
	);
};
