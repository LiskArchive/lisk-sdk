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

import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { Chain, Block, Transaction } from '@liskhq/lisk-chain';
import { p2pTypes } from '@liskhq/lisk-p2p';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { InvalidTransactionError } from './errors';
import { schemas } from './schemas';
import { Synchronizer } from '../synchronizer';
import { Processor } from '../processor';
import { Logger } from '../../logger';
import {
	RPCBlocksByIdData,
	RPCHighestCommonBlockData,
	EventPostBlockData,
	RPCTransactionsByIdData,
	EventPostTransactionData,
	EventPostTransactionsAnnouncementData,
} from '../../types';
import { Broadcaster } from './broadcaster';
import { InMemoryChannel } from '../../controller/channels';
import { Network } from '../network';
import { ApplyPenaltyError } from '../../errors';
import { APP_EVENT_TRANSACTION_NEW } from '../../constants';

const DEFAULT_RATE_RESET_TIME = 10000;
const DEFAULT_RATE_LIMIT_FREQUENCY = 3;
const DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY = 10;
const DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY = 10;
const DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;
const DEFAULT_RELEASE_LIMIT = 100;
const DEFAULT_RELEASE_INTERVAL = 5000;

export interface TransportConstructor {
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly synchronizer: Synchronizer;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly processorModule: Processor;
	readonly networkModule: Network;
}

export interface handlePostTransactionReturn {
	transactionId: string;
}

interface HandleRPCGetTransactionsReturn {
	transactions: string[];
}

interface RateTracker {
	[key: string]: { [key: string]: number };
}

export class Transport {
	private _rateTracker: RateTracker;
	private readonly _channel: InMemoryChannel;
	private readonly _logger: Logger;
	private readonly _synchronizerModule: Synchronizer;
	private readonly _transactionPoolModule: TransactionPool;
	private readonly _chainModule: Chain;
	private readonly _processorModule: Processor;
	private readonly _broadcaster: Broadcaster;
	private readonly _networkModule: Network;

	public constructor({
		channel,
		logger,
		// Unique requirements
		// Modules
		synchronizer,
		transactionPoolModule,
		chainModule,
		processorModule,
		networkModule,
	}: TransportConstructor) {
		this._channel = channel;
		this._logger = logger;
		this._synchronizerModule = synchronizer;

		this._transactionPoolModule = transactionPoolModule;
		this._chainModule = chainModule;
		this._processorModule = processorModule;
		this._networkModule = networkModule;

		this._broadcaster = new Broadcaster({
			transactionPool: this._transactionPoolModule,
			logger: this._logger,
			releaseLimit: DEFAULT_RELEASE_LIMIT,
			interval: DEFAULT_RELEASE_INTERVAL,
			networkModule: this._networkModule,
		});

		// Rate limit for certain endpoints
		this._rateTracker = {};
		setInterval(() => {
			this._rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	public handleBroadcastTransaction(transaction: Transaction): void {
		this._broadcaster.enqueueTransactionId(transaction.id);
		this._channel.publish(APP_EVENT_TRANSACTION_NEW, {
			transaction: transaction.getBytes().toString('hex'),
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async handleBroadcastBlock(block: Block): Promise<unknown> {
		if (this._synchronizerModule.isActive) {
			this._logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return this._networkModule.send({
			event: 'postBlock',
			data: {
				block: this._chainModule.dataAccess.encode(block).toString('hex'),
			},
		});
	}

	public handleRPCGetLastBlock(peerId: string): string {
		this._addRateLimit('getLastBlock', peerId, DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY);
		return this._chainModule.dataAccess.encode(this._chainModule.lastBlock).toString('hex');
	}

	public async handleRPCGetBlocksFromId(data: unknown, peerId: string): Promise<string[]> {
		this._addRateLimit('getBlocksFromId', peerId, DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY);
		const errors = validator.validate(schemas.getBlocksFromIdRequest, data as object);

		if (errors.length) {
			const error = new LiskValidationError(errors);
			this._logger.warn(
				{
					err: error,
					req: data,
				},
				'getBlocksFromID request validation failed',
			);
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const blockID = Buffer.from((data as RPCBlocksByIdData).blockId, 'hex');

		// Get height of block with supplied ID
		const lastBlock = await this._chainModule.dataAccess.getBlockHeaderByID(blockID);

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		// 15kb * 103 is about 1.5MB where it's half of 3MB payload limit
		const fetchUntilHeight = lastBlockHeight + 103;

		const blocks = await this._chainModule.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);

		return blocks.map(block => this._chainModule.dataAccess.encode(block).toString('hex'));
	}

	public async handleRPCGetHighestCommonBlock(
		data: unknown,
		peerId: string,
	): Promise<string | undefined> {
		this._addRateLimit('getHighestCommonBlock', peerId, DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY);
		const errors = validator.validate(schemas.getHighestCommonBlockRequest, data as object);

		if (errors.length) {
			const error = new LiskValidationError(errors);
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			this._logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const blockIDs = (data as RPCHighestCommonBlockData).ids.map(id => Buffer.from(id, 'hex'));

		const commonBlockHeader = await this._chainModule.dataAccess.getHighestCommonBlockHeader(
			blockIDs,
		);

		return commonBlockHeader
			? this._chainModule.dataAccess.encodeBlockHeader(commonBlockHeader).toString('hex')
			: undefined;
	}

	public async handleEventPostBlock(data: unknown, peerId: string): Promise<void> {
		// Should ignore received block if syncing
		if (this._synchronizerModule.isActive) {
			this._logger.debug("Client is syncing. Can't process new block at the moment.");
			return;
		}

		const errors = validator.validate(schemas.postBlockEvent, data as object);

		if (errors.length) {
			this._logger.warn(
				{
					errors,
					module: 'transport',
					data,
				},
				'Received post block broadcast request in unexpected format',
			);
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw new LiskValidationError(errors);
		}

		const blockBytes = Buffer.from((data as EventPostBlockData).block, 'hex');

		let block: Block;
		try {
			block = this._chainModule.dataAccess.decode(blockBytes);
		} catch (error) {
			this._logger.warn(
				{
					err: error as Error,
					data,
				},
				'Received post block broadcast request in not decodable format',
			);
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		try {
			await this._processorModule.process(block, {
				peerId,
			} as p2pTypes.P2PPeerInfo);
		} catch (error) {
			if (error instanceof ApplyPenaltyError) {
				this._logger.warn(
					{
						err: error as Error,
						data,
					},
					'Received post block broadcast request with invalid block',
				);
				this._networkModule.applyPenaltyOnPeer({
					peerId,
					penalty: 100,
				});
			}
			throw error;
		}
	}

	public async handleRPCGetTransactions(
		// eslint-disable-next-line @typescript-eslint/default-param-last
		data: unknown = { transactionIds: [] },
		peerId: string,
	): Promise<HandleRPCGetTransactionsReturn> {
		this._addRateLimit('getTransactions', peerId, DEFAULT_RATE_LIMIT_FREQUENCY);
		const errors = validator.validate(schemas.getTransactionsRequest, data as object);
		if (errors.length) {
			this._logger.warn({ err: errors, peerId }, 'Received invalid transactions body');
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw new LiskValidationError(errors);
		}

		const { transactionIds } = data as RPCTransactionsByIdData;
		if (!transactionIds?.length) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this._transactionPoolModule.getProcessableTransactions();
			const transactions = transactionsBySender
				.values()
				.flat()
				.map(tx => tx.getBytes().toString('hex'));
			transactions.splice(DEFAULT_RELEASE_LIMIT);

			return {
				transactions,
			};
		}

		if (transactionIds.length > DEFAULT_RELEASE_LIMIT) {
			const error = new Error(
				`Requested number of transactions ${transactionIds.length} exceeds maximum allowed.`,
			);
			this._logger.warn({ err: error, peerId }, 'Received invalid request.');
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const idStr of transactionIds) {
			// Check if any transaction is in the queues.
			const id = Buffer.from(idStr, 'hex');
			const transaction = this._transactionPoolModule.get(id);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (transaction) {
				transactionsFromQueues.push(transaction.getBytes().toString('hex'));
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this._chainModule.dataAccess.getTransactionsByIDs(
				idsNotInPool,
			);

			return {
				transactions: transactionsFromQueues.concat(
					transactionsFromDatabase.map(t => t.getBytes().toString('hex')),
				),
			};
		}

		return {
			transactions: transactionsFromQueues,
		};
	}

	public async handleEventPostTransaction(
		data: EventPostTransactionData,
	): Promise<handlePostTransactionReturn> {
		const tx = this._chainModule.dataAccess.decodeTransaction(Buffer.from(data.transaction, 'hex'));
		const id = await this._receiveTransaction(tx);
		return {
			transactionId: id.toString('hex'),
		};
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 */
	public async handleEventPostTransactionsAnnouncement(
		data: unknown,
		peerId: string,
	): Promise<null> {
		this._addRateLimit('postTransactionsAnnouncement', peerId, DEFAULT_RATE_LIMIT_FREQUENCY);
		const errors = validator.validate(schemas.postTransactionsAnnouncementEvent, data as object);

		if (errors.length) {
			this._logger.warn({ err: errors, peerId }, 'Received invalid transactions body');
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw new LiskValidationError(errors);
		}

		const ids = (data as EventPostTransactionsAnnouncementData).transactionIds.map(idStr =>
			Buffer.from(idStr, 'hex'),
		);

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(ids);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = (await this._networkModule.requestFromPeer({
				procedure: 'getTransactions',
				data: {
					transactionIds: unknownTransactionIDs.map(id => id.toString('hex')),
				},
				peerId,
			})) as {
				data: { transactions: string[] };
			};

			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				for (const transaction of result.transactions) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					const tx = this._chainModule.dataAccess.decodeTransaction(
						Buffer.from(transaction, 'hex'),
					);
					await this._receiveTransaction(tx);
				}
			} catch (err) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this._logger.warn({ err, peerId }, 'Received invalid transactions.');
				if (err instanceof InvalidTransactionError) {
					this._networkModule.applyPenaltyOnPeer({
						peerId,
						penalty: 100,
					});
				}
			}
		}

		return null;
	}

	private async _obtainUnknownTransactionIDs(ids: Buffer[]): Promise<Buffer[]> {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(id => !this._transactionPoolModule.contains(id));

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions: Transaction[] = await this._chainModule.dataAccess.getTransactionsByIDs(
				unknownTransactionsIDs,
			);

			return unknownTransactionsIDs.filter(
				id =>
					existingTransactions.find(existingTransaction => existingTransaction.id.equals(id)) ===
					undefined,
			);
		}

		return unknownTransactionsIDs;
	}

	private async _receiveTransaction(transaction: Transaction): Promise<Buffer> {
		try {
			this._processorModule.validateTransaction(transaction);
		} catch (err) {
			throw new InvalidTransactionError((err as Error).toString(), transaction.id);
		}
		if (this._transactionPoolModule.contains(transaction.id)) {
			return transaction.id;
		}

		// Broadcast transaction to network if not present in pool
		this.handleBroadcastTransaction(transaction);

		const { error } = await this._transactionPoolModule.add(transaction);

		if (!error) {
			this._logger.info(
				{
					id: transaction.id,
					nonce: transaction.nonce.toString(),
					senderPublicKey: transaction.senderPublicKey,
				},
				'Added transaction to pool',
			);
			return transaction.id;
		}

		this._logger.error({ err: error }, 'Failed to add transaction to pool.');
		throw error;
	}

	private _addRateLimit(procedure: string, peerId: string, limit: number): void {
		if (this._rateTracker[procedure] === undefined) {
			this._rateTracker[procedure] = { [peerId]: 0 };
		}
		this._rateTracker[procedure][peerId] = this._rateTracker[procedure][peerId]
			? this._rateTracker[procedure][peerId] + 1
			: 1;
		if (this._rateTracker[procedure][peerId] > limit) {
			this._networkModule.applyPenaltyOnPeer({
				peerId,
				penalty: 10,
			});
		}
	}
}
