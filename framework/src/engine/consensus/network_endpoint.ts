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

import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { Chain, StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { address } from '@liskhq/lisk-cryptography';
import { Logger } from '../../logger';
import { Network } from '../network';
import {
	NETWORK_RPC_GET_BLOCKS_FROM_ID,
	NETWORK_RPC_GET_HIGHEST_COMMON_BLOCK,
	NETWORK_RPC_GET_LAST_BLOCK,
} from './constants';
import {
	getBlocksFromIdRequestSchema,
	getBlocksFromIdResponseSchema,
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
	RPCBlocksByIdData,
	RPCHighestCommonBlockRequest,
} from './schema';
import { CommitPool } from './certificate_generation/commit_pool';
import {
	singleCommitSchema,
	SingleCommitsNetworkPacket,
	singleCommitsNetworkPacketSchema,
} from './certificate_generation/schema';
import { SingleCommit } from './certificate_generation/types';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';
import { NETWORK_EVENT_COMMIT_MESSAGES } from './certificate_generation/constants';

export interface EndpointArgs {
	logger: Logger;
	chain: Chain;
	network: Network;
	commitPool: CommitPool;
	db: Database;
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
	private readonly _db: Database | InMemoryDatabase;

	public constructor(args: EndpointArgs) {
		super(args.network);
		this._logger = args.logger;
		this._chain = args.chain;
		this._network = args.network;
		this._commitPool = args.commitPool;
		this._db = args.db;
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

		try {
			validator.validate(getBlocksFromIdRequestSchema, decodedData);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
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

		const logDataAndApplyPenalty = (errData?: unknown) => {
			this._logger.warn(errData, 'getHighestCommonBlock request validation failed');
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
		};

		try {
			validator.validate(getHighestCommonBlockRequestSchema, blockIds);
		} catch (error) {
			logDataAndApplyPenalty({ err: error as Error, req: data });
			throw error;
		}

		if (!objects.bufferArrayUniqueItems(blockIds.ids)) {
			logDataAndApplyPenalty({ req: data });
		}

		const commonBlockHeaderID = await this._chain.dataAccess.getHighestCommonBlockID(blockIds.ids);

		return codec.encode(getHighestCommonBlockResponseSchema, {
			id: commonBlockHeaderID ?? Buffer.alloc(0),
		});
	}

	public async handleEventSingleCommit(data: unknown, peerId: string): Promise<void> {
		this.addRateLimit(
			NETWORK_EVENT_COMMIT_MESSAGES,
			peerId,
			DEFAULT_SINGLE_COMMIT_FROM_IDS_RATE_LIMIT_FREQUENCY,
		);
		if (!Buffer.isBuffer(data)) {
			const errorMessage = 'Received invalid single commit data';
			this._logger.warn({ peerId }, errorMessage);
			this.network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw new Error(errorMessage);
		}

		const stateStore = new StateStore(this._db);

		try {
			const receivedSingleCommits = codec.decode<SingleCommitsNetworkPacket>(
				singleCommitsNetworkPacketSchema,
				data as never,
			);
			for (const encodedCommit of receivedSingleCommits.commits) {
				const decodedSingleCommit = codec.decode<SingleCommit>(singleCommitSchema, encodedCommit);
				validator.validate(singleCommitSchema, decodedSingleCommit);
				// in case of critical error, it will throw an error, which will result in banning
				const isValidCommit = await this._commitPool.validateCommit(
					stateStore,
					decodedSingleCommit,
				);
				if (!isValidCommit) {
					this._logger.debug(
						{
							validatorAddress: address.getLisk32AddressFromAddress(
								decodedSingleCommit.validatorAddress,
							),
							height: decodedSingleCommit.height,
						},
						'Received commit is invalid',
					);
					continue;
				}
				this._commitPool.addCommit(decodedSingleCommit);
			}
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					req: data,
					peerID: peerId,
				},
				`${NETWORK_EVENT_COMMIT_MESSAGES} fail to verify single commit`,
			);
			this._network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});

			throw error;
		}
	}
}
