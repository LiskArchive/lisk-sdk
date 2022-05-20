/*
 * Copyright © 2021 Lisk Foundation
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

import { KVStore } from '@liskhq/lisk-db';
import { Chain } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { Logger } from '../../logger';
import { Network } from '../network';
import {
	NETWORK_RPC_GET_BLOCKS_FROM_ID,
	NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK,
	NETWORK_RPC_GET_LAST_BLOCK,
	NETWORK_RPC_GET_SINGLE_COMMIT_FROM_ID,
} from './constants';
import {
	getBlocksFromIdRequestSchema,
	getBlocksFromIdResponseSchema,
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
	getSingleCommitEventSchema,
	RPCBlocksByIdData,
	RPCHighestCommonBlockRequest,
	SingleCommitData,
} from './schema';
import { CommitPool } from './certificate_generation/commit_pool';
import { singleCommitSchema } from './certificate_generation/schema';
import { APIContext } from '../../state_machine/types';
import { createNewAPIContext } from '../../state_machine/api_context';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';

export interface EndpointArgs {
	logger: Logger;
	chain: Chain;
	network: Network;
	commitPool: CommitPool;
	db: KVStore;
}

const DEFAULT_SINGLE_COMMIT_FROM_IDS_RATE_LIMIT_FREQUENCY = 10;
const DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY = 10;
const DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY = 10;
const DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;

export class NetworkEndpoint extends BaseNetworkEndpoint {
	private readonly _logger: Logger;
	private readonly _chain: Chain;
	private readonly _network: Network;
	private readonly _commitPool: CommitPool;
	private readonly _apiContext: APIContext;

	public constructor(args: EndpointArgs) {
		super(args.network);
		this._logger = args.logger;
		this._chain = args.chain;
		this._network = args.network;
		this._commitPool = args.commitPool;
		this._apiContext = createNewAPIContext(args.db);
	}

	public handleRPCGetLastBlock(peerId: string): Buffer {
		this.addRateLimit(NETWORK_RPC_GET_LAST_BLOCK, peerId, DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY);
		return this._chain.lastBlock.getBytes();
	}

	public async handleRPCGetBlocksFromId(data: unknown, peerId: string): Promise<Buffer> {
		this.addRateLimit(
			NETWORK_RPC_GET_BLOCKS_FROM_ID,
			peerId,
			DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY,
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
				`${NETWORK_RPC_GET_BLOCKS_FROM_ID} response failed on decoding`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}
		const errors = validator.validate(getBlocksFromIdRequestSchema, decodedData);

		if (errors.length) {
			const error = new LiskValidationError(errors);
			this._logger.warn(
				{
					err: error,
					req: data,
					peerID: peerId,
				},
				`${NETWORK_RPC_GET_BLOCKS_FROM_ID} response failed on validation`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const { blockId } = decodedData;

		// Get height of block with supplied ID
		const lastBlock = await this._chain.dataAccess.getBlockHeaderByID(blockId);

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		// 15kb * 103 is about 1.5MB where it's half of 3MB transactions limit
		const fetchUntilHeight = lastBlockHeight + 103;

		const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);
		const encodedBlocks = blocks.map(block => block.getBytes());

		return codec.encode(getBlocksFromIdResponseSchema, { blocks: encodedBlocks });
	}

	public async handleRPCGetHighestCommonBlock(
		data: unknown,
		peerId: string,
	): Promise<Buffer | undefined> {
		this.addRateLimit(
			NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK,
			peerId,
			DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY,
		);
		const blockIds = codec.decode<RPCHighestCommonBlockRequest>(
			getHighestCommonBlockRequestSchema,
			data as never,
		);
		const errors = validator.validate(getHighestCommonBlockRequestSchema, blockIds);

		if (errors.length || !objects.bufferArrayUniqueItems(blockIds.ids)) {
			const error = new LiskValidationError(errors);
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			this._logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const commonBlockHeaderID = await this._chain.dataAccess.getHighestCommonBlockID(blockIds.ids);

		return codec.encode(getHighestCommonBlockResponseSchema, {
			id: commonBlockHeaderID ?? Buffer.alloc(0),
		});
	}

	public async handleEventSingleCommit(data: unknown, peerId: string): Promise<void> {
		this.addRateLimit(
			NETWORK_RPC_GET_SINGLE_COMMIT_FROM_ID,
			peerId,
			DEFAULT_SINGLE_COMMIT_FROM_IDS_RATE_LIMIT_FREQUENCY,
		);
		let decodedData: SingleCommitData;

		try {
			decodedData = codec.decode<SingleCommitData>(getSingleCommitEventSchema, data as never);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID: peerId,
				},
				`${NETWORK_RPC_GET_SINGLE_COMMIT_FROM_ID} response failed on decoding`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});

			throw error;
		}

		const errors = validator.validate(singleCommitSchema, decodedData.singleCommit);

		if (errors.length) {
			const error = new LiskValidationError(errors);
			this._logger.debug(
				{ peerId, penalty: 100 },
				'Adding penalty on peer for invalid single commit',
			);

			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		try {
			const isValidCommit = await this._commitPool.validateCommit(
				this._apiContext,
				decodedData.singleCommit,
			);

			if (!isValidCommit) {
				return;
			}
		} catch (error) {
			this._logger.debug(
				{ peerId, penalty: 100 },
				'Adding penalty on peer for invalid single commit',
			);

			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		this._commitPool.addCommit(decodedData.singleCommit);
	}
}
