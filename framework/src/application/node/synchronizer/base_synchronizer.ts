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
import { EventEmitter } from 'events';
import { Logger } from '../../logger';
import { InMemoryChannel } from '../../../controller/channels';
import { BlockHeaderAsset } from '../block_processor_v2';
import {
	ApplyPenaltyAndRestartError,
	ApplyPenaltyAndAbortError,
} from './errors';

export const EVENT_SYNCHRONIZER_SYNC_RQUIRED =
	'EVENT_SYNCHRONIZER_SYNC_RQUIRED';

export abstract class BaseSynchronizer {
	public events: EventEmitter;

	protected _logger: Logger;
	protected _channel: InMemoryChannel;
	protected _chain: Chain;

	public constructor(logger: Logger, channel: InMemoryChannel, chain: Chain) {
		this._logger = logger;
		this._channel = channel;
		this._chain = chain;
		this.events = new EventEmitter();
	}

	protected async _applyPenaltyAndRestartSync(
		peerId: string,
		receivedBlock: Block,
		reason: string,
	): Promise<void> {
		this._logger.info(
			{ peerId, reason },
			'Applying penalty to peer and restarting synchronizer',
		);
		await this._channel.invoke('app:applyPenaltyOnPeer', {
			peerId,
			penalty: 100,
		});
		this.events.emit(EVENT_SYNCHRONIZER_SYNC_RQUIRED, {
			block: receivedBlock,
			peerId,
		});
	}

	protected async _getLastBlockFromNetwork(
		peerId: string,
	): Promise<Block<BlockHeaderAsset>> {
		const { data } = await this._channel.invokeFromNetwork<{
			data: string | undefined;
		}>('requestFromPeer', {
			procedure: 'getLastBlock',
			peerId,
		});
		if (!data || !data.length) {
			throw new ApplyPenaltyAndRestartError(
				peerId,
				"Peer didn't provide its last block",
			);
		}
		return this._chain.dataAccess.decode<BlockHeaderAsset>(
			Buffer.from(data, 'base64'),
		);
	}

	protected async _getHighestCommonBlockFromNetwork(
		peerId: string,
		ids: Buffer[],
	): Promise<BlockHeader<BlockHeaderAsset>> {
		const { data } = await this._channel.invokeFromNetwork<{
			data: string | undefined;
		}>('requestFromPeer', {
			procedure: 'getHighestCommonBlock',
			peerId,
			data: {
				ids: ids.map(id => id.toString('base64')),
			},
		});
		if (!data || !data.length) {
			throw new ApplyPenaltyAndAbortError(
				peerId,
				"Peer didn't return a common block",
			);
		}
		return this._chain.dataAccess.decodeBlockHeader<BlockHeaderAsset>(
			Buffer.from(data, 'base64'),
		);
	}

	protected async _getBlocksFromNetwork(
		peerId: string,
		fromID: Buffer,
	): Promise<Block<BlockHeaderAsset>[]> {
		const { data } = await this._channel.invokeFromNetwork<{
			data: string[] | undefined;
		}>('requestFromPeer', {
			procedure: 'getBlocksFromId',
			peerId,
			data: {
				blockId: fromID.toString('base64'),
			},
		}); // Note that the block matching lastFetchedID is not returned but only higher blocks.
		if (!data || !data.length) {
			throw new Error('Peer did not respond with block');
		}
		return data.map(d =>
			this._chain.dataAccess.decode<BlockHeaderAsset>(Buffer.from(d, 'base64')),
		);
	}

	public abstract async run(
		receivedBlock: Block,
		peerId: string,
	): Promise<void>;
	public abstract async isValidFor(
		receivedBlock: Block,
		peerId: string,
	): Promise<boolean>;
}
