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

/**
 * Restore blocks from temp table and re-apply to chain
 * Steps:
 * 1. Read all blocks from temp_block table
 * 2. Apply blocks one by one to current chain
 * 3. Each block gets deleted from temp_block table when its being applied
 *
 * @param {Object} tx - database transaction
 * @return {Promise<Boolean>} - returns true when successfully restoring blocks, returns false if no blocks were found
 */
const restoreBlocks = async (blocksModule, processorModule, tx) => {
	const tempBlocks = await blocksModule.getTempBlocks(tx);

	if (tempBlocks.length === 0) {
		return false;
	}

	for (const block of tempBlocks) {
		await processorModule.processValidated(block, {
			removeFromTempTable: true,
		});
	}

	return true;
};

module.exports = {
	restoreBlocks,
};
