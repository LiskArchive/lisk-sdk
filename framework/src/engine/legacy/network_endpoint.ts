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
import { DataAccess } from '@liskhq/lisk-chain';
import {
	DEFAULT_KEEP_EVENTS_FOR_HEIGHTS,
	DEFAULT_MAX_BLOCK_HEADER_CACHE,
	DEFAULT_MIN_BLOCK_HEADER_CACHE,
} from '@liskhq/lisk-chain/dist-node/constants';
import { Logger } from '../../logger';
import { Network } from '../network';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';
import { NETWORK_LEGACY_GET_BLOCKS } from '../consensus/constants';
import {
	getBlocksFromIdRequestSchema,
	getBlocksFromIdResponseSchema,
	RPCBlocksByIdData,
} from '../consensus/schema';

const LEGACY_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;

export interface EndpointArgs {
	logger: Logger;
	network: Network;
	db: Database;
}

export class LegacyNetworkEndpoint extends BaseNetworkEndpoint {
	public readonly _dataAccess: DataAccess;
	private readonly _logger: Logger;
	private readonly _network: Network;

	public constructor(args: EndpointArgs) {
		super(args.network);
		this._logger = args.logger;
		this._network = args.network;
		// this._db = args.db;
		this._dataAccess = new DataAccess({
			db: args.db,
			keepEventsForHeights: DEFAULT_KEEP_EVENTS_FOR_HEIGHTS,
			minBlockHeaderCache: DEFAULT_MIN_BLOCK_HEADER_CACHE,
			maxBlockHeaderCache: DEFAULT_MAX_BLOCK_HEADER_CACHE,
		});
	}

	// return 100 blocks desc starting from the id
	// eslint-disable-next-line @typescript-eslint/require-await
	public async handleRPCGetLegacyBlocksFromId(data: unknown, peerId: string): Promise<Buffer> {
		this.addRateLimit(
			NETWORK_LEGACY_GET_BLOCKS,
			peerId,
			LEGACY_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY,
		);

		let decodedData: RPCBlocksByIdData;
		try {
			decodedData = codec.decode<RPCBlocksByIdData>(getBlocksFromIdRequestSchema, data as never);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID: peerId,
				},
				`${NETWORK_LEGACY_GET_BLOCKS} response failed on decoding`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		try {
			validator.validate(getBlocksFromIdRequestSchema, decodedData);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID: peerId,
				},
				`${NETWORK_LEGACY_GET_BLOCKS} response failed on validation`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}
		const { blockId } = decodedData;

		let lastBlock;
		try {
			lastBlock = await this._dataAccess.getBlockHeaderByID(blockId);
		} catch (errors) {
			return codec.encode(getBlocksFromIdResponseSchema, { blocks: [] });
		}

		const lastBlockHeight = lastBlock.height;
		const fetchUntilHeight = lastBlockHeight + 100;

		const blocks = await this._dataAccess.getBlocksByHeightBetween(
			lastBlockHeight,
			fetchUntilHeight,
		);
		const encodedBlocks = blocks.map(block => block.getBytes());

		return codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks });
	}
}
