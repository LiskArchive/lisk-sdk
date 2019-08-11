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
const { objectNormalize } = require('./block');
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
} = require('./blocks');
const {
	FORK_STATUS_PROCESS,
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
} = require('./fork_choice_rule');
const { baseBlockSchema } = require('./schema');

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
	FORK_STATUS_PROCESS,
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
	objectNormalize,
	addBlockProperties,
};
