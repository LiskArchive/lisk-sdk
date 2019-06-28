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

const blockHeaderSchema = require('./block_header_schema');
const { validate } = require('../../../../src/controller/validator');
const {
	verifySignature,
	verifyVersion,
	verifyReward,
	verifyId,
	verifyPayload,
	verifyForkOne,
	verifyBlockSlot,
} = require('../blocks/verify');

/**
 * Validate schema of block header
 *
 * @param {BlockHeader} blockHeader
 * @return {boolean}
 */
const validateBlockHeader = blockHeader =>
	validate(blockHeaderSchema, blockHeader);

/**
 * Perform all checks outlined in Step 1 of the section "Processing Blocks" except for checking height, parentBlockID and delegate slot (block B may be in the future and assume different delegates that are not active in the round of block A). If any check fails, the peer that sent block B is banned and the node aborts the process of moving to a different chain.
 *
 * https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#moving-to-a-different-chain
 *
 * @param lastBlock
 * @param block
 */
const verifyBlockForChainSwitching = (lastBlock, block) => {
	let result = { verified: false, errors: [] };

	result = verifySignature(block, result);
	result = verifyVersion(block, this.exceptions, result);
	result = verifyReward(this.blockReward, block, this.exceptions, result);
	result = verifyId(block, result);
	result = verifyPayload(
		block,
		this.constants.maxTransactionsPerBlock,
		this.constants.maxPayloadLength,
		result
	);

	result = verifyForkOne(this.roundsModule, block, lastBlock, result);
	result = verifyBlockSlot(this.slots, block, lastBlock, result);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

module.exports = {
	validateBlockHeader,
	verifyBlockForChainSwitching,
};
