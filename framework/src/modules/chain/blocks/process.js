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

const blocksLogic = require('./block');

class BlocksProcess {
	constructor({
		blocksVerify,
		blocksChain,
		storage,
		exceptions,
		slots,
		interfaceAdapters,
		genesisBlock,
		blockReward,
		constants,
	}) {
		this.blocksVerify = blocksVerify;
		this.blocksChain = blocksChain;
		this.storage = storage;
		this.interfaceAdapters = interfaceAdapters;
		this.slots = slots;
		this.exceptions = exceptions;
		this.blockReward = blockReward;
		this.constants = constants;
		this.genesisBlock = genesisBlock;
	}

	async recoverInvalidOwnChain(currentBlock, onDelete) {
		const lastBlock = await blocksLogic.loadBlockByHeight(
			this.storage,
			currentBlock.height - 1,
			this.interfaceAdapters,
			this.genesisBlock,
		);
		const { verified } = this.blocksVerify.verifyBlock(currentBlock, lastBlock);
		if (!verified) {
			await this.blocksChain.deleteLastBlock(currentBlock);
			onDelete(currentBlock, lastBlock);
			return this.recoverInvalidOwnChain(lastBlock, onDelete);
		}
		return currentBlock;
	}
}

module.exports = {
	BlocksProcess,
};
