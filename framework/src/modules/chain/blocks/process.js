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

const blocksUtils = require('./utils');

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
		const lastBlock = await blocksUtils.loadBlockByHeight(
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

	async reload(targetHeight, isCleaning, onProgress, loadPerIteration = 1000) {
		await this.storage.entities.Account.resetMemTables();
		const lastBlock = await this._rebuild(
			1,
			undefined,
			targetHeight,
			isCleaning,
			onProgress,
			loadPerIteration,
		);
		return lastBlock;
	}

	async _rebuild(
		currentHeight,
		initialBlock,
		targetHeight,
		isCleaning,
		onProgress,
		loadPerIteration,
	) {
		const limit = loadPerIteration;
		const blocks = await blocksUtils.loadBlocksWithOffset(
			this.storage,
			this.interfaceAdapters,
			this.genesisBlock,
			limit,
			currentHeight,
		);
		let lastBlock = initialBlock;
		// eslint-disable-next-line no-restricted-syntax
		for (const block of blocks) {
			if (isCleaning() || block.height > targetHeight) {
				return lastBlock;
			}
			if (block.id === this.genesisBlock.id) {
				// eslint-disable-next-line no-await-in-loop
				lastBlock = await this.blocksChain.applyGenesisBlock(block);
				onProgress(lastBlock);
				// eslint-disable-next-line no-continue
				continue;
			}
			// eslint-disable-next-line no-await-in-loop
			lastBlock = await this.applyBlock(block, lastBlock);
			onProgress(lastBlock);
		}
		const nextCurrentHeight = lastBlock.height + 1;
		if (nextCurrentHeight < targetHeight) {
			return this._rebuild(
				nextCurrentHeight,
				lastBlock,
				targetHeight,
				isCleaning,
				onProgress,
				loadPerIteration,
			);
		}
		return lastBlock;
	}
}

module.exports = {
	BlocksProcess,
};
