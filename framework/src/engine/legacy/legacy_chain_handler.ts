/*
 * Copyright © 2022 Lisk Foundation
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

import { codec } from '@liskhq/lisk-codec';
import { P2PRequestPacket } from '@liskhq/lisk-p2p/dist-node/types';
import { Database, NotFoundError } from '@liskhq/lisk-db';
import { LegacyConfig } from '../../types';
import { Network } from '../network';
import { getBlocksFromIdResponseSchema } from '../consensus/schema';
import { Storage } from './storage';
import { LegacyBlock, LegacyBlockBracket, Peer } from './types';
import { decodeBlock, encodeBlockHeader } from './codec';
import { FailAndAttemptSyncError } from './errors';
import { validateLegacyBlock } from './validate';
import { Logger } from '../../logger';
import {
	FAILED_SYNC_RETRY_TIMEOUT,
	MAX_NUMBER_OF_FAILED_ATTEMPTS,
	SUCCESS_SYNC_RETRY_TIMEOUT,
} from './constants';
import { getLegacyBlocksFromIdRequestSchema } from './schemas';
import { NETWORK_LEGACY_GET_BLOCKS_FROM_ID } from '../consensus/constants';

interface LegacyChainHandlerArgs {
	legacyConfig: LegacyConfig;
	network: Network;
	logger: Logger;
}

interface LegacyHandlerInitArgs {
	db: Database;
}

export class LegacyChainHandler {
	private readonly _network: Network;
	private _storage!: Storage;
	private readonly _legacyConfig: LegacyConfig;
	private readonly _logger: Logger;
	private _syncTimeout!: NodeJS.Timeout;
	private readonly _syncedBrackets: Buffer[] = [];

	public constructor(args: LegacyChainHandlerArgs) {
		this._legacyConfig = args.legacyConfig;
		this._network = args.network;
		this._logger = args.logger;
	}

	public async init(args: LegacyHandlerInitArgs): Promise<void> {
		this._storage = new Storage(args.db);

		for (const bracket of this._legacyConfig.brackets) {
			try {
				const bracketStorageKey = Buffer.from(bracket.snapshotBlockID, 'hex');
				const bracketExists = await this._storage.legacyChainBracketInfoExist(bracketStorageKey);

				if (!bracketExists) {
					await this._storage.setLegacyChainBracketInfo(bracketStorageKey, {
						startHeight: bracket.startHeight,
						snapshotBlockHeight: bracket.snapshotHeight,
						// if start block already exists then assign to lastBlockHeight
						lastBlockHeight: bracket.snapshotHeight,
					});
					continue;
				}

				const storedBracketInfo = await this._storage.getLegacyChainBracketInfo(bracketStorageKey);
				const startBlock = await this._storage.getBlockByHeight(bracket.startHeight);

				// In case a user wants to indirectly update the bracketInfo stored in legacyDB
				await this._storage.setLegacyChainBracketInfo(bracketStorageKey, {
					...storedBracketInfo,
					startHeight: bracket.startHeight,
					snapshotBlockHeight: bracket.snapshotHeight,
					// if start block already exists then assign to lastBlockHeight
					lastBlockHeight: startBlock ? bracket.startHeight : bracket.snapshotHeight,
				});
			} catch (error) {
				if (!(error instanceof NotFoundError)) {
					throw error;
				}
			}
		}
	}

	public async sync() {
		for (const bracket of this._legacyConfig.brackets) {
			const bracketInfo = await this._storage.getLegacyChainBracketInfo(
				Buffer.from(bracket.snapshotBlockID, 'hex'),
			);

			// means this bracket is already synced/parsed (in next `syncBlocks` step)
			if (bracket.startHeight === bracketInfo.lastBlockHeight) {
				this._syncedBrackets.push(Buffer.from(bracket.snapshotBlockID, 'hex'));
				this._network.applyNodeInfo({
					legacy: [...this._syncedBrackets],
				});
				continue;
			}
			let lastBlockID;
			try {
				const lastBlock = decodeBlock(
					await this._storage.getBlockByHeight(bracketInfo.lastBlockHeight),
				).block;
				lastBlockID = lastBlock.header.id;
			} catch (error) {
				if (!(error instanceof NotFoundError)) {
					throw error;
				}
				// If lastBlock does not exist then sync from the beginning
				lastBlockID = Buffer.from(bracket.snapshotBlockID, 'hex');
			}

			this._logger.info(
				{ engineModule: 'legacy' },
				`Started syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
			);
			// start parsing bracket from `lastBlock` height`
			await this._trySyncBlocks(bracket, lastBlockID);
		}
	}

	private async _trySyncBlocks(
		bracket: LegacyBlockBracket,
		lastBlockID: Buffer,
		syncRetryCounter = 0,
	) {
		try {
			await this._syncBlocks(bracket, lastBlockID, syncRetryCounter);
		} catch (err) {
			if (err instanceof FailAndAttemptSyncError) {
				this._logger.debug(
					{ engineModule: 'legacy' },
					`Retrying syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
				);
				clearTimeout(this._syncTimeout);
				// eslint-disable-next-line @typescript-eslint/no-misused-promises
				this._syncTimeout = setTimeout(async () => {
					await this._trySyncBlocks(bracket, lastBlockID);
				}, FAILED_SYNC_RETRY_TIMEOUT); // 2 minutes
			} else {
				throw err;
			}
		}
	}

	/**
	 * Flow of syncing legacy blocks
	 *
	 * Check if we have `sync` property `true` in configuration (already done in engine.ts)
	 * call getConnectedPeers from network
	 * Filter peers having their `legacy` buffer array contains `snapshotBlockID`
	 * If there is no peer, throw error, this error will be used in outside function to retry calling `syncBlocks` after x amount of time
	 * Get a random peer from list of filtered peers with legacy info
	 * Make a request to that random peer by calling its `getLegacyBlocksFromId` method with `data` property set to `legacyBlock.header.id`
	 * Try to decode response data buffer using getBlocksFromIdResponseSchema, apply penalty in case of error & retry syncBlocks
	 * Validate `blocks: Buffer[]`, apply penalty in case of error & retry syncBlocks
	 * Decode `blocks: Buffer[]` into LegacyBlock[] & start saving one by one
	 * If last block height is still higher than bracket.startHeight, save bracket with `lastBlockHeight: lastBlock?.header.height` & repeat syncBlocks
	 * If last block height equals bracket.startHeight, simply save bracket with `lastBlockHeight: lastBlock?.header.height`
	 */
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public async _syncBlocks(
		bracket: LegacyBlockBracket,
		lastBlockID: Buffer,
		failedAttempts = 0,
	): Promise<void> {
		const connectedPeers = this._network.getConnectedPeers() as unknown as Peer[];
		const peersWithLegacyInfo = connectedPeers.filter(
			peer =>
				!!(peer.options as { legacy: string[] }).legacy.find(
					snapshotBlockID => snapshotBlockID === bracket.snapshotBlockID,
				),
		);
		if (peersWithLegacyInfo.length === 0) {
			const errorMessage = 'No peer found with legacy info.';
			this._logger.warn({ engineModule: 'legacy', method: 'syncBlocks' }, errorMessage);
			throw new FailAndAttemptSyncError(errorMessage);
		}

		const randomPeerIndex = Math.trunc(Math.random() * peersWithLegacyInfo.length - 1);
		const { peerId } = peersWithLegacyInfo[randomPeerIndex];

		const requestData = codec.encode(getLegacyBlocksFromIdRequestSchema, {
			blockID: lastBlockID,
			snapshotBlockID: Buffer.from(bracket.snapshotBlockID, 'hex'),
		});
		const p2PRequestPacket: P2PRequestPacket = {
			procedure: NETWORK_LEGACY_GET_BLOCKS_FROM_ID,
			data: requestData,
		};

		let syncRetryCounter = failedAttempts;
		let response;
		try {
			response = await this._network.requestFromPeer({ ...p2PRequestPacket, peerId });
			// Reset counter on success
			syncRetryCounter = 0;
		} catch (error) {
			// eslint-disable-next-line no-param-reassign
			syncRetryCounter += 1;
			if (syncRetryCounter > MAX_NUMBER_OF_FAILED_ATTEMPTS) {
				const errorMessage = `Failed ${MAX_NUMBER_OF_FAILED_ATTEMPTS} times to request from peer.`;
				this._logger.warn(
					{ engineModule: 'legacy', peerId, method: 'requestFromPeer' },
					errorMessage,
				);

				throw new FailAndAttemptSyncError(errorMessage);
			}
			return this._trySyncBlocks(bracket, lastBlockID, syncRetryCounter);
		}

		// `data` is expected to hold blocks in DESC order
		const { data } = response as { data: Buffer };
		let legacyBlocks: LegacyBlock[];

		try {
			// this part is needed to make sure `data` returns ONLY `{ blocks: Buffer[] }` & not any extra field(s)
			const { blocks } = codec.decode<{ blocks: Buffer[] }>(getBlocksFromIdResponseSchema, data);
			if (blocks.length === 0) {
				this.applyPenaltyAndRetrySync('Received empty response', peerId);

				return this._trySyncBlocks(bracket, lastBlockID, syncRetryCounter);
			}

			this._applyValidation(blocks);

			legacyBlocks = blocks.map(block => decodeBlock(block).block);
		} catch (err) {
			this.applyPenaltyAndRetrySync((err as Error).message, peerId);

			return this._trySyncBlocks(bracket, lastBlockID, syncRetryCounter);
		}

		for (const block of legacyBlocks) {
			if (block.header.height >= bracket.startHeight) {
				const payload = block.payload.length ? block.payload : [];
				await this._storage.saveBlock(
					block.header.id as Buffer,
					block.header.height,
					encodeBlockHeader(block.header),
					payload,
				);
			}
		}

		const lastBlock = legacyBlocks[legacyBlocks.length - 1];
		this._logger.debug(
			{ engineModule: 'legacy' },
			`Saved blocks from ${legacyBlocks[0].header.height} to ${lastBlock.header.height}`,
		);
		if (lastBlock && lastBlock.header.height > bracket.startHeight) {
			await this._updateBracketInfo(lastBlock, bracket);
			clearTimeout(this._syncTimeout);
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			this._syncTimeout = setTimeout(async () => {
				await this._trySyncBlocks(bracket, lastBlock.header.id as Buffer, syncRetryCounter);
			}, SUCCESS_SYNC_RETRY_TIMEOUT);
		} else {
			// Syncing is finished
			clearTimeout(this._syncTimeout);
			this._logger.info(
				{ engineModule: 'legacy' },
				`Finished syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
			);

			// After successful sync of a bracket, communicate to the network
			this._syncedBrackets.push(Buffer.from(bracket.snapshotBlockID, 'hex'));
			this._network.applyNodeInfo({
				legacy: [...this._syncedBrackets],
			});
		}

		return this._updateBracketInfo(lastBlock, bracket);
	}

	private async _updateBracketInfo(lastBlock: LegacyBlock, bracket: LegacyBlockBracket) {
		await this._storage.setLegacyChainBracketInfo(Buffer.from(bracket.snapshotBlockID, 'hex'), {
			startHeight: bracket.startHeight,
			lastBlockHeight: lastBlock?.header.height,
			snapshotBlockHeight: bracket.snapshotHeight,
		});
	}

	private applyPenaltyAndRetrySync(msg: string, peerId: string) {
		this._logger.warn({ engineModule: 'legacy', peerId }, `${msg}: Applying a penalty to the peer`);
		this._network.applyPenaltyOnPeer({ peerId, penalty: 100 });
	}

	private _applyValidation(blocks: Buffer[]) {
		const sortedBlocks = [];
		for (let i = blocks.length - 1; i >= 0; i -= 1) {
			sortedBlocks.push(blocks[i]);
		}

		const sortedLegacyBlocks = sortedBlocks.map(block => decodeBlock(block).block);

		sortedBlocks.forEach((block, index) => {
			if (index < sortedBlocks.length - 1) {
				// skip the last block, since we don't have its next block available yet
				validateLegacyBlock(block, sortedLegacyBlocks[index + 1]);
			}
		});
	}
}
