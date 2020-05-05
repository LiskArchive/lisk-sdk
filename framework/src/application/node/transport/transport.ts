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

import { validator } from '@liskhq/lisk-validator';
import { Chain, BlockJSON, BlockHeaderJSON } from '@liskhq/lisk-chain';
import { p2pTypes } from '@liskhq/lisk-p2p';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { BaseTransaction, TransactionJSON } from '@liskhq/lisk-transactions';
import { convertErrorsToString } from '../utils/error_handlers';
import { InvalidTransactionError } from './errors';
import { schemas } from './schemas';
import {
	Channel,
	Logger,
	Synchronizer,
	Processor,
	RPCBlocksByIdData,
	RPCHighestCommonBlockData,
	EventPostBlockData,
	RPCTransactionsByIdData,
	EventPostTransactionData,
	EventPostTransactionsAnnouncementData,
} from '../../../types';
import { Broadcaster } from './broadcaster';

const DEFAULT_RATE_RESET_TIME = 10000;
const DEFAULT_RATE_LIMIT_FREQUENCY = 3;
const DEFAULT_RELEASE_LIMIT = 100;
const DEFAULT_RELEASE_INTERVAL = 5000;

interface TransactionPoolTransaction extends BaseTransaction {
	asset: { [key: string]: string | number | readonly string[] | undefined };
}

export interface TransportConstructor {
	readonly channel: Channel;
	readonly logger: Logger;
	readonly synchronizerModule: Synchronizer;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly processorModule: Processor;
}

export interface handlePostTransactionReturn {
	transactionId?: string;
	message?: string;
	errors?: Error[] | Error;
}
export interface HandleRPCGetTransactionsReturn {
	transactions: TransactionJSON[];
}

export interface RPCGetTransactionsReturn {
	data: { transactions: TransactionJSON[] };
}

interface RateTracker {
	[key: string]: { [key: string]: number };
}

export class Transport {
	private _rateTracker: RateTracker;
	private readonly _channel: Channel;
	private readonly _logger: Logger;
	private readonly _synchronizerModule: Synchronizer;
	private readonly _transactionPoolModule: TransactionPool;
	private readonly _chainModule: Chain;
	private readonly _processorModule: Processor;
	private readonly _broadcaster: Broadcaster;

	constructor({
		// components
		channel,
		logger,
		// Unique requirements
		// Modules
		synchronizerModule,
		transactionPoolModule,
		chainModule,
		processorModule,
	}: TransportConstructor) {
		this._channel = channel;
		this._logger = logger;
		this._synchronizerModule = synchronizerModule;

		this._transactionPoolModule = transactionPoolModule;
		this._chainModule = chainModule;
		this._processorModule = processorModule;

		this._broadcaster = new Broadcaster({
			transactionPool: this._transactionPoolModule,
			logger: this._logger,
			channel: this._channel,
			releaseLimit: DEFAULT_RELEASE_LIMIT,
			interval: DEFAULT_RELEASE_INTERVAL,
		});

		// Rate limit for certain endpoints
		this._rateTracker = {};
		setInterval(() => {
			this._rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	public handleBroadcastTransaction(transaction: BaseTransaction): void {
		this._broadcaster.enqueueTransactionId(transaction.id);
		this._channel.publish('app:transaction:new', transaction.toJSON());
	}

	public async handleBroadcastBlock(blockJSON: BlockJSON): Promise<unknown> {
		if (this._synchronizerModule.isActive) {
			this._logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}
		return this._channel.publishToNetwork('sendToNetwork', {
			event: 'postBlock',
			data: {
				block: blockJSON,
			},
		});
	}

	public async handleRPCGetBlocksFromId(
		data: unknown,
		peerId: string,
	): Promise<BlockJSON[]> {
		const errors = validator.validate(
			schemas.getBlocksFromIdRequest,
			data as object,
		);

		if (errors.length) {
			const error = `${errors[0].message}`;

			this._logger.warn(
				{
					err: error,
					req: data,
				},
				'getBlocksFromID request validation failed',
			);
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		// Get height of block with supplied ID
		const lastBlock = await this._chainModule.dataAccess.getBlockHeaderByID(
			(data as RPCBlocksByIdData).blockId,
		);
		if (!lastBlock) {
			throw new Error(
				`Invalid blockId requested: ${(data as RPCBlocksByIdData).blockId}`,
			);
		}

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		// 15kb * 103 is about 1.5MB where it's half of 3MB payload limit
		const fetchUntilHeight = lastBlockHeight + 103;

		const blocks = await this._chainModule.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);

		return blocks && blocks.map(block => this._chainModule.serialize(block));
	}

	public async handleRPCGetGetHighestCommonBlock(
		data: unknown,
		peerId: string,
	): Promise<BlockHeaderJSON | null> {
		const valid = validator.validate(
			schemas.getHighestCommonBlockRequest,
			data as object,
		);

		if (valid.length) {
			const err = valid;
			const error = `${err[0].message}: ${err[0].dataPath}`;
			this._logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		const commonBlock = await this._chainModule.getHighestCommonBlock(
			(data as RPCHighestCommonBlockData).ids,
		);

		return commonBlock
			? this._chainModule.serializeBlockHeader(commonBlock)
			: null;
	}

	public async handleEventPostBlock(
		data: unknown,
		peerId: string,
	): Promise<void> {
		// Should ignore received block if syncing
		if (this._synchronizerModule.isActive) {
			return this._logger.debug(
				{
					blockId: (data as EventPostBlockData)?.block.id,
					height: (data as EventPostBlockData)?.block.height,
				},
				"Client is syncing. Can't process new block at the moment.",
			);
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
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const block = await this._processorModule.deserialize(
			(data as EventPostBlockData).block,
		);

		return this._processorModule.process(block, {
			peerId,
		} as p2pTypes.P2PPeerInfo);
	}

	public async handleRPCGetTransactions(
		data: unknown = { transactionIds: [] },
		peerId: string,
	): Promise<HandleRPCGetTransactionsReturn> {
		await this._addRateLimit(
			'getTransactions',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(
			schemas.getTransactionsRequest,
			data as object,
		);
		if (errors.length) {
			this._logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const { transactionIds } = data as RPCTransactionsByIdData;
		if (!transactionIds) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this._transactionPoolModule.getProcessableTransactions();
			const transactions = Object.values(transactionsBySender).flat();
			transactions.splice(DEFAULT_RATE_RESET_TIME);

			return {
				transactions,
			};
		}

		if (transactionIds.length > DEFAULT_RELEASE_LIMIT) {
			const error = new Error('Received invalid request.');
			this._logger.warn({ err: error, peerId }, 'Received invalid request.');
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of transactionIds) {
			// Check if any transaction is in the queues.
			const transaction = this._transactionPoolModule.get(
				id,
			) as BaseTransaction;

			if (transaction) {
				transactionsFromQueues.push(transaction.toJSON());
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
					transactionsFromDatabase.map(t => t.toJSON()),
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
		try {
			const id = await this._receiveTransaction(data.transaction);
			return {
				transactionId: id,
			};
		} catch (err) {
			return {
				message: 'Transaction was rejected with errors',
				errors: err.errors || err,
			};
		}
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 */
	public async handleEventPostTransactionsAnnouncement(
		data: unknown,
		peerId: string,
	): Promise<null> {
		await this._addRateLimit(
			'postTransactionsAnnouncement',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(
			schemas.postTransactionsAnnouncementEvent,
			data as object,
		);

		if (errors.length) {
			this._logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			(data as EventPostTransactionsAnnouncementData).transactionIds,
		);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = await this._channel.invokeFromNetwork(
				'requestFromPeer',
				{
					procedure: 'getTransactions',
					data: { transactionIds: unknownTransactionIDs },
					peerId,
				},
			);
			try {
				for (const transaction of result.transactions) {
					/* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
					transaction.bundled = true;
					await this._receiveTransaction(transaction);
				}
			} catch (err) {
				this._logger.warn({ err, peerId }, 'Received invalid transactions.');
				if (err instanceof InvalidTransactionError) {
					await this._channel.invoke('app:applyPenaltyOnPeer', {
						peerId,
						penalty: 100,
					});
				}
			}
		}

		return null;
	}

	private async _obtainUnknownTransactionIDs(ids: string[]): Promise<string[]> {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this._transactionPoolModule.contains(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions = await this._chainModule.dataAccess.getTransactionsByIDs(
				unknownTransactionsIDs,
			);

			return unknownTransactionsIDs.filter(
				id =>
					existingTransactions.find(
						existingTransaction => existingTransaction.id === id,
					) === undefined,
			);
		}

		return unknownTransactionsIDs;
	}

	private async _receiveTransaction(
		transactionJSON: TransactionJSON,
	): Promise<string> {
		let transaction;
		try {
			transaction = this._chainModule.deserializeTransaction(transactionJSON);

			// Composed transaction checks are all static, so it does not need state store
			const transactionsResponses = await this._chainModule.validateTransactions(
				[transaction],
			);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			const err = new InvalidTransactionError(
				errString,
				transactionJSON.id as string,
				errors,
			);
			this._logger.error(
				{
					err,
					module: 'transport',
				},
				'Transaction normalization failed',
			);

			throw err;
		}

		if (this._transactionPoolModule.contains(transaction.id)) {
			return transaction.id;
		}

		// Broadcast transaction to network if not present in pool
		this.handleBroadcastTransaction(transaction);

		const { errors } = await this._transactionPoolModule.add(
			transaction as TransactionPoolTransaction,
		);

		if (!errors.length) {
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

		this._logger.error({ errors }, 'Failed to add transaction to pool');
		throw errors;
	}

	private async _addRateLimit(
		procedure: string,
		peerId: string,
		limit: number,
	): Promise<void> {
		if (this._rateTracker[procedure] === undefined) {
			this._rateTracker[procedure] = { [peerId]: 0 };
		}
		this._rateTracker[procedure][peerId] = this._rateTracker[procedure][peerId]
			? this._rateTracker[procedure][peerId] + 1
			: 1;
		if (this._rateTracker[procedure][peerId] > limit) {
			await this._channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 10,
			});
		}
	}
}
