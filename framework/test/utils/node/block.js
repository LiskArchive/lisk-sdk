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

const {
	getDelegateKeypairForCurrentSlot,
} = require('../../../src/application/node/forger/forger');

const createBlock = async (node, transactions = [], options = {}) => {
	const lastBlock = options.lastBlock
		? options.lastBlock
		: node.chain.lastBlock;
	const currentSlot = node.chain.slots.getSlotNumber(lastBlock.timestamp) + 1;
	const timestamp = node.chain.slots.getSlotTime(currentSlot);
	const round = node.dpos.rounds.calcRound(lastBlock.height + 1);
	const currentKeypair = await getDelegateKeypairForCurrentSlot(
		node.dpos,
		node.forger.keypairs,
		currentSlot,
		round,
		node.forger.constants.activeDelegates,
	);
	return node.processor.create({
		keypair: options.keypair ? options.keypair : currentKeypair,
		timestamp,
		transactions,
		previousBlock: lastBlock,
	});
};

module.exports = {
	createBlock,
};
