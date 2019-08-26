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

const { loadBlocksWithOffset } = require('./blocks');

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
		activeDelegates,
	}) {
		this.isActive = false;
		this.isCleaning = false;

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		this.genesisBlock = genesisBlock;

		this.processorModule = processorModule;
		this.blocksModule = blocksModule;
		this.interfaceAdapters = interfaceAdapters;
		this.constants = {
			activeDelegates,
		};
	}

	cleanup() {
		this.isCleaning = true;
	}

	async rebuild(rebuildUpToRound, loadPerIteration = 1000) {
		const blocksCount = await this.storage.entities.Block.count({}, {});
		this.logger.info(
			{ rebuildUpToRound, blocksCount },
			'Rebuild process started',
		);
		if (blocksCount < this.constants.activeDelegates) {
			throw new Error(
				'Unable to rebuild, blockchain should contain at least one round of blocks',
			);
		}
		if (
			Number.isNaN(parseInt(rebuildUpToRound, 10)) ||
			parseInt(rebuildUpToRound, 10) < 0
		) {
			throw new Error(
				'Unable to rebuild, "--rebuild" parameter should be an integer equal to or greater than zero',
			);
		}
		const totalRounds = Math.floor(
			blocksCount / this.constants.activeDelegates,
		);
		const targetRound =
			parseInt(rebuildUpToRound, 10) === 0
				? totalRounds
				: Math.min(totalRounds, parseInt(rebuildUpToRound, 10));
		const targetHeight = targetRound * this.constants.activeDelegates;

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
			const blocks = await loadBlocksWithOffset(
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
					await this.processorModule.applyGenesisBlock(block, true);
					({ lastBlock } = this.blocksModule);
					this.channel.publish('chain:rebuild', { block: lastBlock });
				}

				if (block.id !== this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					await this.processorModule.apply(block);
					({ lastBlock } = this.blocksModule);
				}
				this.channel.publish('chain:rebuild', { block: lastBlock });
			}
		}

		return lastBlock;
	}
}

// Export
module.exports = { Rebuilder };
