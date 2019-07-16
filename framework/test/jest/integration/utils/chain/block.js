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
 *
 */

'use strict';

const blocksLogic = require('../../../../../src/modules/chain/blocks/block');

const createBlock = (
	chainModule,
	lastBlock,
	transactions,
	keypair,
	timestamp
) =>
	blocksLogic.create({
		blockReward: chainModule.blocks.blockReward,
		previousBlock: lastBlock,
		transactions,
		maxPayloadLength: chainModule.constants.maxPayloadLength,
		keypair,
		timestamp,
	});

const processBlock = async (chainModule, block) =>
	chainModule.blocks.processBlock(block);

const deleteLastBlock = async chainModule => chainModule.blocks.recoverChain();

const getBlock = async (storage, blockId) =>
	storage.blocks.getOne({ id: blockId }, { extended: true });

module.exports = {
	createBlock,
	processBlock,
	deleteLastBlock,
	getBlock,
};
