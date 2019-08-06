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

const { BlockProcessorV0 } = require('./block_processor_v0');

// Block version 0 and 1 is essentially the same
class BlockProcessorV1 extends BlockProcessorV0 {}

BlockProcessorV1.VERSION = 1;

module.exports = {
	BlockProcessorV1,
};
