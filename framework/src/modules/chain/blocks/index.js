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

const { addBlockProperties } = require('./utils');
const { objectNormalize, storageRead } = require('./block');
const {
	calculateMilestone,
	calculateReward,
	calculateSupply,
} = require('./block_reward');
const {
	Blocks,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
	EVENT_PRIORITY_CHAIN_DETECTED,
	BLOCKCHAIN_STATUS_REBUILD,
	BLOCKCHAIN_STATUS_RECOVERY,
	BLOCKCHAIN_STATUS_READY,
} = require('./blocks');
const {
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
} = require('./fork_choice_rule');
const { baseBlockSchema } = require('./schema');
const { loadBlocksWithOffset } = require('./block');

module.exports = {
	Blocks,
	baseBlockSchema,
	calculateMilestone,
	calculateReward,
	calculateSupply,
	EVENT_NEW_BLOCK,
	EVENT_DELETE_BLOCK,
	EVENT_BROADCAST_BLOCK,
	EVENT_NEW_BROADHASH,
	EVENT_PRIORITY_CHAIN_DETECTED,
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
	BLOCKCHAIN_STATUS_REBUILD,
	BLOCKCHAIN_STATUS_RECOVERY,
	BLOCKCHAIN_STATUS_READY,
	loadBlocksWithOffset,
	objectNormalize,
	addBlockProperties,
	storageRead,
};
