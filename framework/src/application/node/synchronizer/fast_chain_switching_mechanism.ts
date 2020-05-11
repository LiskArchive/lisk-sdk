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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { BFT } from '@liskhq/lisk-bft';
import { Chain, BlockInstance, BlockJSON } from '@liskhq/lisk-chain';
import { Dpos } from '@liskhq/lisk-dpos';
import { BaseSynchronizer } from './base_synchronizer';
import {
	clearBlocksTempTable,
	restoreBlocks,
	deleteBlocksAfterHeight,
} from './utils';
import {
	ApplyPenaltyAndAbortError,
	AbortError,
	BlockProcessingError,
	RestartError,
} from './errors';
import { Processor } from '../processor';
import { Logger } from '../../../types';
import { InMemoryChannel } from '../../../controller/channels';

interface FastChainSwitchingMechanismInput {
	readonly logger: Logger;
	readonly channel: InMemoryChannel;
	readonly bft: BFT;
	readonly dpos: Dpos;
	readonly chain: Chain;
	readonly processor: Processor;
}

export class FastChainSwitchingMechanism extends BaseSynchronizer {
	public active: boolean;
	private readonly bft: BFT;
	private readonly dpos: Dpos;
	private readonly chain: Chain;
	private readonly processor: Processor;

	public constructor({
		logger,
		channel,
		chain,
		bft,
		processor,
		dpos,
	}: FastChainSwitchingMechanismInput) {
		super(logger, channel);
		this.dpos = dpos;
		this.chain = chain;
		this.bft = bft;
		this.processor = processor;
		this.active = false;
	}

	public async run(
		receivedBlock: BlockInstance,
		peerId: string,
	): Promise<void> {
		this.active = true;

		try {
			const highestCommonBlock = await this._requestLastCommonBlock(peerId);
			const blocks = await this._queryBlocks(
				receivedBlock,
				highestCommonBlock,
				peerId,
			);
			await this._validateBlocks(blocks, peerId);
			await this._switchChain(
				highestCommonBlock as BlockInstance,
				blocks,
				peerId,
			);
		} catch (err) {
			if (err instanceof ApplyPenaltyAndAbortError) {
				this.logger.info(
					{ err, peerId, reason: err.reason },
					'Applying penalty to peer and aborting synchronization mechanism',
				);
				await this.channel.invoke('app:applyPenaltyOnPeer', {
					peerId,
					penalty: 100,
				});
			}

			if (err instanceof RestartError) {
				this.logger.info(
					{ err, reason: err.reason },
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					`Restarting synchronization mechanism with reason: ${err.reason}`,
				);
				this.channel.publish('app:chain:sync', {
					block: receivedBlock,
				});
				return;
			}

			if (err instanceof AbortError) {
				this.logger.info(
					{ err, reason: err.reason },
					`Aborting synchronization mechanism with reason: ${err.reason}`,
				);
				return;
			}

			throw err;
		} finally {
			this.active = false;
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async isValidFor(
		receivedBlock: BlockInstance,
		peerId: string,
	): Promise<boolean> {
		if (!peerId) {
			// If peerId is not specified, fast chain switching cannot be done
			return false;
		}
		const { lastBlock } = this.chain;

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const twoRounds = this.dpos.delegatesPerRound * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > twoRounds) {
			return false;
		}

		const generatorAddress = getAddressFromPublicKey(
			receivedBlock.generatorPublicKey,
		);

		return this.dpos.isActiveDelegate(generatorAddress, receivedBlock.height);
	}

	private async _requestBlocksWithinIDs(
		peerId: string,
		fromId: string,
		toId: string,
	): Promise<BlockJSON[]> {
		const maxFailedAttempts = 10; // TODO: Probably expose this to the configuration layer?
		const blocks = [];
		let failedAttempts = 0; // Failed attempt === the peer doesn't return any block or there is a network failure (no response or takes too long to answer)
		let lastFetchedID = fromId;
		while (failedAttempts < maxFailedAttempts) {
			const { data: chunkOfBlocks } = await this.channel.invokeFromNetwork<{
				data: BlockJSON[] | undefined;
			}>('requestFromPeer', {
				procedure: 'getBlocksFromId',
				peerId,
				data: {
					blockId: lastFetchedID,
				},
			}); // Note that the block matching lastFetchedID is not returned but only higher blocks.

			if (chunkOfBlocks?.length) {
				// Sort blocks with height in ascending order because blocks are returned in descending order
				chunkOfBlocks.sort((a, b) => a.height - b.height);
				blocks.push(...chunkOfBlocks);
				[{ id: lastFetchedID }] = chunkOfBlocks.slice(-1);
				const index = blocks.findIndex(block => block.id === toId);
				if (index > -1) {
					return blocks.splice(0, index + 1); // Removes unwanted extra blocks
				}
			} else {
				failedAttempts += 1; // It's only considered a failed attempt if the target peer doesn't provide any blocks on a single request
			}
		}

		return blocks;
	}

	private async _queryBlocks(
		receivedBlock: BlockInstance,
		highestCommonBlock: BlockInstance | undefined,
		peerId: string,
	): Promise<BlockJSON[]> {
		if (!highestCommonBlock) {
			throw new ApplyPenaltyAndAbortError(
				peerId,
				"Peer didn't return a common block",
			);
		}

		if (highestCommonBlock.height < this.bft.finalizedHeight) {
			throw new ApplyPenaltyAndAbortError(
				peerId,
				`Common block height ${highestCommonBlock.height} is lower than the finalized height of the chain ${this.bft.finalizedHeight}`,
			);
		}

		if (
			this.chain.lastBlock.height - highestCommonBlock.height >
				this.dpos.delegatesPerRound * 2 ||
			receivedBlock.height - highestCommonBlock.height >
				this.dpos.delegatesPerRound * 2
		) {
			throw new AbortError(
				`Height difference between both chains is higher than ${this.dpos
					.delegatesPerRound * 2}`,
			);
		}

		this.logger.debug(
			{
				peerId,
				fromBlockId: highestCommonBlock.id,
				toBlockId: receivedBlock.id,
			},
			'Requesting blocks within ID range from peer',
		);

		const blocks = await this._requestBlocksWithinIDs(
			peerId,
			highestCommonBlock.id,
			receivedBlock.id,
		);

		if (!blocks.length) {
			throw new ApplyPenaltyAndAbortError(
				peerId,
				`Peer didn't return any requested block within IDs ${highestCommonBlock.id} and ${receivedBlock.id}`,
			);
		}

		return blocks;
	}

	private async _validateBlocks(
		blocks: ReadonlyArray<BlockJSON>,
		peerId: string,
	): Promise<void> {
		this.logger.debug(
			{
				blocks: blocks.map(block => ({
					blockId: block.id,
					height: block.height,
				})),
			},
			'Validating blocks',
		);
		try {
			for (const block of blocks) {
				this.logger.trace(
					{ blockId: block.id, height: block.height },
					'Validating block',
				);
				const blockInstance = await this.processor.deserialize(block);
				await this.processor.validate(blockInstance);
			}
		} catch (err) {
			throw new ApplyPenaltyAndAbortError(peerId, 'Block validation failed');
		}
		this.logger.debug('Successfully validated blocks');
	}

	private async _applyBlocks(
		blocksToApply: ReadonlyArray<BlockJSON>,
	): Promise<void> {
		try {
			for (const block of blocksToApply) {
				this.logger.trace(
					{
						blockId: block.id,
						height: block.height,
					},
					'Applying blocks',
				);
				const blockInstance = await this.processor.deserialize(block);
				await this.processor.processValidated(blockInstance);
			}
		} catch (e) {
			throw new BlockProcessingError();
		}
	}

	private async _handleBlockProcessingFailure(
		error: Error,
		highestCommonBlock: BlockInstance,
		peerId: string,
	): Promise<void> {
		this.logger.error({ err: error }, 'Error while processing blocks');
		this.logger.debug(
			{ height: highestCommonBlock.height },
			'Deleting blocks after height',
		);
		await deleteBlocksAfterHeight(
			this.processor,
			this.chain,
			this.logger,
			highestCommonBlock.height,
		);
		this.logger.debug('Restoring blocks from temporary table');
		await restoreBlocks(this.chain, this.processor);
		throw new ApplyPenaltyAndAbortError(
			peerId,
			'Detected invalid block while processing list of requested blocks',
		);
	}

	private async _switchChain(
		highestCommonBlock: BlockInstance,
		blocksToApply: ReadonlyArray<BlockJSON>,
		peerId: string,
	): Promise<void> {
		this.logger.info('Switching chain');
		this.logger.debug(
			{ height: highestCommonBlock.height },
			`Deleting blocks after height ${highestCommonBlock.height}`,
		);

		await deleteBlocksAfterHeight(
			this.processor,
			this.chain,
			this.logger,
			highestCommonBlock.height,
			true,
		);

		try {
			this.logger.debug(
				{
					blocks: blocksToApply.map(block => ({
						blockId: block.id,
						height: block.height,
					})),
				},
				'Applying blocks',
			);
			await this._applyBlocks(blocksToApply);
			this.logger.info(
				{
					currentHeight: this.chain.lastBlock.height,
					highestCommonBlockHeight: highestCommonBlock.height,
				},
				'Successfully switched chains. Node is now up to date',
			);
		} catch (err) {
			if (err instanceof BlockProcessingError) {
				await this._handleBlockProcessingFailure(
					err,
					highestCommonBlock,
					peerId,
				);
			} else {
				throw err;
			}
		} finally {
			this.logger.debug('Cleaning blocks temp table');
			await clearBlocksTempTable(this.chain);
		}
	}

	private _computeLastTwoRoundsHeights(): number[] {
		return new Array(
			Math.min(this.dpos.delegatesPerRound * 2, this.chain.lastBlock.height),
		)
			.fill(0)
			.map((_, index) => this.chain.lastBlock.height - index);
	}

	/**
	 * Requests the last common block in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one).
	 */
	private async _requestLastCommonBlock(
		peerId: string,
	): Promise<BlockInstance | undefined> {
		this.logger.debug({ peerId }, 'Requesting the last common block with peer');
		const requestLimit = 10; // Maximum number of requests to be made to the remote peer
		let numberOfRequests = 1; // Keeps track of the number of requests made to the remote peer

		const heightList = this._computeLastTwoRoundsHeights();

		while (numberOfRequests < requestLimit) {
			const blockIds = (
				await this.chain.dataAccess.getBlockHeadersWithHeights(heightList)
			).map(block => block.id);

			// Request the highest common block with the previously computed list
			// to the given peer
			try {
				const { data } = await this.channel.invokeFromNetwork<{
					data: BlockJSON | undefined;
				}>('requestFromPeer', {
					procedure: 'getHighestCommonBlock',
					peerId,
					data: {
						ids: blockIds,
					},
				});

				if (data) {
					this.logger.debug(
						{ blockId: data.id, height: data.height },
						'Common block found',
					);
					return this.chain.deserialize(data);
				}
			} finally {
				numberOfRequests += 1;
			}
		}

		return undefined;
	}
}
