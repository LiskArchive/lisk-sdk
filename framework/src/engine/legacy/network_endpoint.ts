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

import { Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { Logger } from '../../logger';
import { Network } from '../network';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';
import { NETWORK_LEGACY_GET_BLOCKS_FROM_ID } from '../consensus/constants';
import {
	getBlocksFromIdRequestSchema,
	getBlocksFromIdResponseSchema,
	RPCBlocksByIdData,
} from '../consensus/schema';
import { Storage } from './storage';
import { decodeBlock } from './codec';

const LEGACY_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;

export interface EndpointArgs {
	logger: Logger;
	network: Network;
	db: Database;
}

export class LegacyNetworkEndpoint extends BaseNetworkEndpoint {
	public readonly _storage: Storage;
	private readonly _logger: Logger;
	private readonly _network: Network;

	public constructor(args: EndpointArgs) {
		super(args.network);
		this._logger = args.logger;
		this._network = args.network;
		this._storage = new Storage(args.db);
	}

	// return 100 blocks desc starting from the id
	// eslint-disable-next-line @typescript-eslint/require-await
	public async handleRPCGetLegacyBlocksFromID(data: unknown, peerID: string): Promise<Buffer> {
		this.addRateLimit(
			NETWORK_LEGACY_GET_BLOCKS_FROM_ID,
			peerID,
			LEGACY_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY,
		);

		let rpcBlocksByIdData: RPCBlocksByIdData;
		try {
			rpcBlocksByIdData = codec.decode<RPCBlocksByIdData>(
				getBlocksFromIdRequestSchema,
				data as never,
			);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID,
				},
				`${NETWORK_LEGACY_GET_BLOCKS_FROM_ID} response failed on decoding. Applying penalty on peer`,
			);
			this._network.applyPenaltyOnPeer({
				peerId: peerID,
				penalty: 100,
			});
			throw error;
		}

		try {
			validator.validate(getBlocksFromIdRequestSchema, rpcBlocksByIdData);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID,
				},
				`${NETWORK_LEGACY_GET_BLOCKS_FROM_ID} response failed on validation. Applying penalty on peer`,
			);
			this._network.applyPenaltyOnPeer({
				peerId: peerID,
				penalty: 100,
			});
			throw error;
		}
		const { blockId } = rpcBlocksByIdData;

		let lastBlockHeader;
		try {
			const block = await this._storage.getBlockByID(blockId);
			lastBlockHeader = decodeBlock(block).block.header;
		} catch (errors) {
			return codec.encode(getBlocksFromIdResponseSchema, { blocks: [] });
		}

		const lastBlockHeight = lastBlockHeader.height;
		const fetchUntilHeight = lastBlockHeight + 100;

		const encodedBlocks = await this._storage.getBlocksByHeightBetween(
			lastBlockHeight,
			fetchUntilHeight,
		);

		return codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks });
	}
}
