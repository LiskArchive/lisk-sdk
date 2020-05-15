/*
 * Copyright © 2020 Lisk Foundation
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


const createBlock = async (node, transactions = [], options = {}) => {
	const lastBlock = options.lastBlock
		? options.lastBlock
		: node._chain.lastBlock;
	const currentSlot = node._chain.slots.getSlotNumber(lastBlock.timestamp) + 1;
	const timestamp = node._chain.slots.getSlotTime(currentSlot);
	const round = node._dpos.rounds.calcRound(lastBlock.height + 1);
	const currentKeypair = await node._forger._getDelegateKeypairForCurrentSlot(
		currentSlot,
		round,
	);
	return node._processor.create({
		keypair: options.keypair ? options.keypair : currentKeypair,
		timestamp,
		seedReveal: '00000000000000000000000000000000',
		transactions,
		previousBlock: lastBlock,
	});
};

module.exports = {
	createBlock,
};
