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

/**
 * Rebuild a blockchain
 * deletes and recalculates all the states from the blocks up to the specified round
 */
class Rebuilder {
	constructor({
		// components
		channel,
		logger,
		// Unique requirements
		genesisBlock,
		// Modules
		processorModule,
		chainModule,
		dposModule,
		bftModule,
	}) {
		this.isActive = false;
		this.isCleaning = false;

		this.channel = channel;
		this.logger = logger;
		this.genesisBlock = genesisBlock;

		this.processorModule = processorModule;
		this.chainModule = chainModule;
		this.dposModule = dposModule;
		this.bftModule = bftModule;
	}

	cleanup() {
		this.isCleaning = true;
	}

	async rebuild(rebuildUpToRound, loadPerIteration = 1000) {
		this.isActive = true;
		const blocksCount = await this.chainModule.dataAccess.getBlocksCount();
		this.logger.info(
			{ rebuildUpToRound, blocksCount },
			'Rebuild process started',
		);
		if (blocksCount < this.dposModule.delegatesPerRound) {
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
			blocksCount / this.dposModule.delegatesPerRound,
		);
		const targetRound =
			parseInt(rebuildUpToRound, 10) === 0
				? totalRounds
				: Math.min(totalRounds, parseInt(rebuildUpToRound, 10));
		const targetHeight = targetRound * this.dposModule.delegatesPerRound;

		const limit = loadPerIteration;
		await this.chainModule.resetState();

		// Need to reset the BFT to rebuild from start of the chain
		this.bftModule.reset();

		let { lastBlock } = this.chainModule;
		for (
			let currentHeight = 0;
			currentHeight < targetHeight;
			currentHeight += loadPerIteration
		) {
			if (this.isCleaning) {
				break;
			}
			// if rebuildUptoRound is undefined, use the highest height
			const blocks = await this.chainModule.dataAccess.getBlocksWithLimitAndOffset(
				limit,
				currentHeight,
			);

			for (const block of blocks) {
				if (this.isCleaning || block.height > targetHeight) {
					break;
				}

				if (block.id === this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					await this.processorModule.applyGenesisBlock(block);
					({ lastBlock } = this.chainModule);
					this.channel.publish('app:rebuild', { block: lastBlock });
				}

				if (block.id !== this.genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					await this.processorModule.apply(block);
					({ lastBlock } = this.chainModule);
				}
				this.channel.publish('app:rebuild', { block: lastBlock });
			}
		}

		await this.chainModule.dataAccess.deleteBlocksWithHeightGreaterThan(
			lastBlock.height,
		);

		return lastBlock;
	}
}

// Export
module.exports = { Rebuilder };
