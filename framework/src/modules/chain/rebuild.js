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

class Rebuilder {
	constructor({
		// components
		channel,
		logger,
		storage,
		// Unique requirements
		genesisBlock,
		// Modules
		processorModule,
		blocksModule,
		interfaceAdapters,
		// Constants
		loadPerIteration,
		rebuildUpToRound,
	}) {
		this.isActive = false;
		this.isCleaning = false;

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.genesisBlock = genesisBlock;

		this.constants = {
			loadPerIteration,
			rebuildUpToRound,
		};

		this.processorModule = processorModule;
		this.blocksModule = blocksModule;
		this.interfaceAdapters = interfaceAdapters;
	}

	cleanup() {
		this.isCleaning = true;
	}

	async rebuild(targetHeight, loadPerIteration = 1000) {
		const limit = loadPerIteration;
		await this.storage.entities.Account.resetMemTables();
		let { lastBlock } = this.blocksModule;
		for (
			let currentHeight = 0;
			currentHeight < targetHeight;
			currentHeight += loadPerIteration
		) {
			if (this.isCleaning) {
				break;
			}
			// if rebuildUptoRound is undefined, use the highest height
			// eslint-disable-next-line no-await-in-loop
			const blocks = await this.blocksModule.blocksUtils.loadBlocksWithOffset(
				this.storage,
				this.interfaceAdapters,
				this.genesisBlock,
				limit,
				currentHeight,
			);
			// eslint-disable-next-line no-restricted-syntax
			for (const block of blocks) {
				if (this.isCleaning || block.height > targetHeight) {
					break;
				}
				if (block.id === this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					lastBlock = await this.processorModule.applyGenesisBlock(block, true);
					this.channel.publish('chain:rebuild', { block: lastBlock });
				}

				if (block.id !== this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					lastBlock = await this.processorModule.applyBlock(block, lastBlock);
				}
				this.channel.publish('chain:rebuild', { block: lastBlock });
			}
		}

		return lastBlock;
	}
}

// Export
module.exports = { Rebuilder };
