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
import { FailSyncError } from './errors';
import { validateLegacyBlock } from './validate';
import { Logger } from '../../logger';
import {
	FAILED_SYNC_RETRY_TIMEOUT,
	LOG_OBJECT_ENGINE_LEGACY_MODULE,
	MAX_FAILED_ATTEMPTS,
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

const wait = async (duration: number): Promise<NodeJS.Timeout> =>
	new Promise(resolve => {
		const timeout = setTimeout(() => {
			resolve(timeout);
		}, duration);
	});

export class LegacyChainHandler {
	private readonly _network: Network;
	private _storage!: Storage;
	private readonly _legacyConfig: LegacyConfig;
	private readonly _logger: Logger;
	private readonly _syncedBrackets: Buffer[] = [];
	private _syncTimeout!: NodeJS.Timeout;

	public constructor(args: LegacyChainHandlerArgs) {
		this._legacyConfig = args.legacyConfig;
		this._network = args.network;
		this._logger = args.logger;
	}

	public async init(args: LegacyHandlerInitArgs): Promise<void> {
		this._storage = new Storage(args.db);

		for (const bracketInfo of this._legacyConfig.brackets) {
			try {
				const bracketStorageKey = Buffer.from(bracketInfo.snapshotBlockID, 'hex');
				const bracketExists = await this._storage.hasBracketInfo(bracketStorageKey);

				if (!bracketExists) {
					await this._storage.setBracketInfo(bracketStorageKey, {
						startHeight: bracketInfo.startHeight,
						snapshotBlockHeight: bracketInfo.snapshotHeight,
						// if start block already exists then assign to lastBlockHeight
						lastBlockHeight: bracketInfo.snapshotHeight,
					});
					continue;
				}

				const storedBracketInfo = await this._storage.getBracketInfo(bracketStorageKey);
				const startBlock = await this._storage.getBlockByHeight(bracketInfo.startHeight);

				// In case a user wants to indirectly update the bracketInfo stored in legacyDB
				await this._storage.setBracketInfo(bracketStorageKey, {
					...storedBracketInfo,
					startHeight: bracketInfo.startHeight,
					snapshotBlockHeight: bracketInfo.snapshotHeight,
					// if start block already exists then assign to lastBlockHeight
					lastBlockHeight: startBlock ? bracketInfo.startHeight : bracketInfo.snapshotHeight,
				});
			} catch (error) {
				if (!(error instanceof NotFoundError)) {
					throw error;
				}
			}
		}
	}

	public stop() {
		clearTimeout(this._syncTimeout);
	}

	public async sync() {
		for (const bracket of this._legacyConfig.brackets) {
			const bracketInfo = await this._storage.getBracketInfo(
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
				LOG_OBJECT_ENGINE_LEGACY_MODULE,
				`Started syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
			);
			// start parsing bracket from `lastBlock` height`
			this._trySyncBlocks(bracket, lastBlockID).catch((err: Error) =>
				this._logger.error({ err }, 'Failed to sync block with error'),
			);
		}
	}

	private async _trySyncBlocks(
		bracket: LegacyBlockBracket,
		lastBlockID: Buffer,
		syncRetryCounter = 0,
	) {
		try {
			await this._syncBlocks(bracket, lastBlockID, syncRetryCounter);
		} catch (error) {
			if (error instanceof FailSyncError) {
				this._logger.debug(
					LOG_OBJECT_ENGINE_LEGACY_MODULE,
					`Retrying syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
				);
				clearTimeout(this._syncTimeout);
				this._syncTimeout = await wait(FAILED_SYNC_RETRY_TIMEOUT);
			} else {
				this._logger.debug(
					{ ...LOG_OBJECT_ENGINE_LEGACY_MODULE, error: (error as Error).message },
					`Retrying syncing legacy blocks for bracket with snapshotBlockID ${bracket.snapshotBlockID}`,
				);
			}
			await this._trySyncBlocks(bracket, lastBlockID);
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
	private async _syncBlocks(
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
			this._logger.warn({ ...LOG_OBJECT_ENGINE_LEGACY_MODULE, method: 'syncBlocks' }, errorMessage);
			throw new FailSyncError(errorMessage);
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
			if (syncRetryCounter > MAX_FAILED_ATTEMPTS) {
				const errorMessage = `Failed ${MAX_FAILED_ATTEMPTS} times to request from peer.`;
				this._logger.warn(
					{ ...LOG_OBJECT_ENGINE_LEGACY_MODULE, peerId, method: 'requestFromPeer' },
					errorMessage,
				);

				throw new FailSyncError(errorMessage);
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
				this.applyPenaltyOnSyncFailure('Received empty response', peerId);

				return this._trySyncBlocks(bracket, lastBlockID, syncRetryCounter);
			}

			this._applyValidation(blocks);

			legacyBlocks = blocks.map(block => decodeBlock(block).block);
		} catch (err) {
			this.applyPenaltyOnSyncFailure((err as Error).message, peerId);

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
		if (lastBlock && lastBlock.header.height > bracket.startHeight) {
			this._logger.debug(
				LOG_OBJECT_ENGINE_LEGACY_MODULE,
				`Saved blocks from ${legacyBlocks[0].header.height} to ${lastBlock.header.height}`,
			);
			await this._updateBracketInfo(lastBlock, bracket);
			clearTimeout(this._syncTimeout);
			this._syncTimeout = await wait(SUCCESS_SYNC_RETRY_TIMEOUT);
			await this._trySyncBlocks(bracket, lastBlock.header.id as Buffer, syncRetryCounter);
		} else {
			// Syncing is finished
			this._logger.info(
				LOG_OBJECT_ENGINE_LEGACY_MODULE,
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
		await this._storage.setBracketInfo(Buffer.from(bracket.snapshotBlockID, 'hex'), {
			startHeight: bracket.startHeight,
			lastBlockHeight: lastBlock?.header.height,
			snapshotBlockHeight: bracket.snapshotHeight,
		});
	}

	private applyPenaltyOnSyncFailure(msg: string, peerId: string) {
		this._logger.warn(
			{ ...LOG_OBJECT_ENGINE_LEGACY_MODULE, peerId },
			`${msg}: Applying a penalty to the peer`,
		);
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
