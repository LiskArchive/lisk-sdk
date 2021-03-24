/* eslint-disable class-methods-use-this */
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
import { Block, Chain, BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { EventEmitter } from 'events';
import { Logger } from '../../logger';
import { InMemoryChannel } from '../../controller/channels';
import { ApplyPenaltyAndRestartError, ApplyPenaltyAndAbortError } from './errors';
import { Network } from '../network';
import {
	getBlocksFromIdRequestSchema,
	getHighestCommonBlockRequestSchema,
	getBlocksFromIdResponseSchema,
} from '../transport/schemas';

export const EVENT_SYNCHRONIZER_SYNC_REQUIRED = 'EVENT_SYNCHRONIZER_SYNC_REQUIRED';

export abstract class BaseSynchronizer {
	public events: EventEmitter;

	protected _logger: Logger;
	protected _channel: InMemoryChannel;
	protected _chain: Chain;
	protected _networkModule: Network;
	protected _stop = false;

	public constructor(logger: Logger, channel: InMemoryChannel, chain: Chain, network: Network) {
		this._logger = logger;
		this._channel = channel;
		this._chain = chain;
		this._networkModule = network;
		this.events = new EventEmitter();
	}

	public stop(): void {
		this._stop = true;
	}

	protected _restartSync(receivedBlock: Block, reason: string): void {
		this._logger.info({ reason }, `Restarting synchronization mechanism with reason: ${reason}`);
		this.events.emit(EVENT_SYNCHRONIZER_SYNC_REQUIRED, {
			block: receivedBlock,
		});
	}

	protected _applyPenaltyAndRestartSync(
		peerId: string,
		receivedBlock: Block,
		reason: string,
	): void {
		this._logger.info({ peerId, reason }, 'Applying penalty to peer and restarting synchronizer');

		this._networkModule.applyPenaltyOnPeer({
			peerId,
			penalty: 100,
		});
		this.events.emit(EVENT_SYNCHRONIZER_SYNC_REQUIRED, {
			block: receivedBlock,
			peerId,
		});
	}

	protected async _getLastBlockFromNetwork(peerId: string): Promise<Block> {
		const { data } = (await this._networkModule.requestFromPeer({
			procedure: 'getLastBlock',
			peerId,
		})) as {
			data: Buffer | undefined;
		};

		if (!data || !data.length) {
			throw new ApplyPenaltyAndRestartError(peerId, 'Peer did not provide its last block');
		}
		return this._chain.dataAccess.decode(data);
	}

	protected async _getHighestCommonBlockFromNetwork(
		peerId: string,
		ids: Buffer[],
	): Promise<BlockHeader> {
		const blockIds = codec.encode(getHighestCommonBlockRequestSchema, { ids });
		const { data } = (await this._networkModule.requestFromPeer({
			procedure: 'getHighestCommonBlock',
			peerId,
			data: blockIds,
		})) as {
			data: Buffer | undefined;
		};

		if (!data || !data.length) {
			throw new ApplyPenaltyAndAbortError(peerId, 'Peer did not return a common block');
		}
		return this._chain.dataAccess.decodeBlockHeader(data);
	}

	protected async _getBlocksFromNetwork(peerId: string, fromID: Buffer): Promise<Block[]> {
		const blockId = codec.encode(getBlocksFromIdRequestSchema, { blockId: fromID });
		const { data } = (await this._networkModule.requestFromPeer({
			procedure: 'getBlocksFromId',
			peerId,
			data: blockId,
		})) as {
			data: Buffer;
		}; // Note that the block matching lastFetchedID is not returned but only higher blocks.

		if (!data || !data.length) {
			throw new Error('Peer did not respond with block');
		}
		const encodedData = codec.decode<{ blocks: Buffer[] }>(getBlocksFromIdResponseSchema, data);
		return encodedData.blocks.map(block => this._chain.dataAccess.decode(block));
	}

	public abstract run(receivedBlock: Block, peerId: string): Promise<void>;
	public abstract isValidFor(receivedBlock: Block, peerId: string): Promise<boolean>;
}
