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

import { BlockInstance, Chain } from '@liskhq/lisk-chain';
import { Dpos } from '@liskhq/lisk-dpos';
import { BFT } from '@liskhq/lisk-bft';
import { Channel, Logger } from '../../types';
import { Processor } from './processor';

interface RebuilderConstructor {
	readonly channel: Channel;
	readonly logger: Logger;
	readonly genesisBlock: BlockInstance;
	readonly processorModule: Processor;
	readonly chainModule: Chain;
	readonly dposModule: Dpos;
	readonly bftModule: BFT;
}
/**
 * Rebuild a blockchain
 * deletes and recalculates all the states from the blocks up to the specified round
 */
export class Rebuilder {
	private _isCleaning: boolean;
	private readonly _channel: Channel;
	private readonly _logger: Logger;
	private readonly _genesisBlock: BlockInstance;
	private readonly _processorModule: Processor;
	private readonly _chainModule: Chain;
	private readonly _dposModule: Dpos;
	private readonly _bftModule: BFT;

	public constructor({
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
	}: RebuilderConstructor) {
		this._isCleaning = false;

		this._channel = channel;
		this._logger = logger;
		this._genesisBlock = genesisBlock;

		this._processorModule = processorModule;
		this._chainModule = chainModule;
		this._dposModule = dposModule;
		this._bftModule = bftModule;
	}

	public cleanup(): void {
		this._isCleaning = true;
	}

	public async rebuild(
		rebuildUpToRound: string,
		loadPerIteration = 1000,
	): Promise<BlockInstance> {
		const blocksCount = await this._chainModule.dataAccess.getBlocksCount();
		this._logger.info(
			{ rebuildUpToRound, blocksCount },
			'Rebuild process started',
		);
		if (blocksCount < this._dposModule.delegatesPerRound) {
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
			blocksCount / this._dposModule.delegatesPerRound,
		);
		const targetRound =
			parseInt(rebuildUpToRound, 10) === 0
				? totalRounds
				: Math.min(totalRounds, parseInt(rebuildUpToRound, 10));
		const targetHeight = targetRound * this._dposModule.delegatesPerRound;

		const limit = loadPerIteration;
		await this._chainModule.resetState();

		// Need to reset the BFT to rebuild from start of the chain
		this._bftModule.reset();

		let { lastBlock } = this._chainModule;
		for (
			let currentHeight = 0;
			currentHeight < targetHeight;
			currentHeight += loadPerIteration
		) {
			if (this._isCleaning) {
				break;
			}
			// if rebuildUptoRound is undefined, use the highest height
			const blocks = await this._chainModule.dataAccess.getBlocksWithLimitAndOffset(
				limit,
				currentHeight,
			);

			for (const block of blocks) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (this._isCleaning || block.height > targetHeight) {
					break;
				}

				if (block.id === this._genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					await this._processorModule.applyGenesisBlock(block);
					({ lastBlock } = this._chainModule);
					this._channel.publish('app:chain:rebuild', { block: lastBlock });
				}

				if (block.id !== this._genesisBlock.id) {
					// eslint-disable-next-line no-await-in-loop
					await this._processorModule.apply(block);
					({ lastBlock } = this._chainModule);
				}
				this._channel.publish('app:chain:rebuild', { block: lastBlock });
			}
		}

		await this._chainModule.dataAccess.deleteBlocksWithHeightGreaterThan(
			lastBlock.height,
		);

		return lastBlock;
	}
}
