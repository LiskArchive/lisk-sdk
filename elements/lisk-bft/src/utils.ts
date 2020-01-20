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

import { validator } from '@liskhq/lisk-validator';

import { blockHeaderSchema } from './schema';
import { Block, BlockHeader } from './types';

export const validateBlockHeader = (blockHeader: BlockHeader): boolean => {
	const errors = validator.validate(blockHeaderSchema, blockHeader);
	if (errors.length) {
		throw new Error(errors[0].message);
	}

	return true;
};

export const extractBFTBlockHeaderFromBlock = (block: Block): BlockHeader => ({
	blockId: block.id,
	height: block.height,
	maxHeightPreviouslyForged: block.maxHeightPreviouslyForged || 0,
	maxHeightPrevoted: block.maxHeightPrevoted,
	delegatePublicKey: block.generatorPublicKey,
	/* This parameter injected to block object to avoid big refactoring
	 for the moment. `delegateMinHeightActive` will be removed from the block
	 object with https://github.com/LiskHQ/lisk-sdk/issues/4413 */
	delegateMinHeightActive: block.delegateMinHeightActive || 0,
});
