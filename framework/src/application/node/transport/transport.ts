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
import { Chain, Block } from '@liskhq/lisk-chain';
import { p2pTypes } from '@liskhq/lisk-p2p';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { BaseTransaction, TransactionJSON } from '@liskhq/lisk-transactions';
import { NotFoundError } from '@liskhq/lisk-db';
import { convertErrorsToString } from '../utils/error_handlers';
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
} from '../../../types';
import { Broadcaster } from './broadcaster';
import { InMemoryChannel } from '../../../controller/channels';

const DEFAULT_RATE_RESET_TIME = 10000;
const DEFAULT_RATE_LIMIT_FREQUENCY = 3;
const DEFAULT_RELEASE_LIMIT = 100;
const DEFAULT_RELEASE_INTERVAL = 5000;

interface TransactionPoolTransaction extends BaseTransaction {
	asset: { [key: string]: string | number | readonly string[] | undefined };
}

export interface TransportConstructor {
	readonly channel: InMemoryChannel;
	readonly logger: Logger;
	readonly synchronizer: Synchronizer;
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
	transactions: string[];
}

export interface RPCGetTransactionsReturn {
	data: { transactions: TransactionJSON[] };
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

	public constructor({
		channel,
		logger,
		// Unique requirements
		// Modules
		synchronizer,
		transactionPoolModule,
		chainModule,
		processorModule,
	}: TransportConstructor) {
		this._channel = channel;
		this._logger = logger;
		this._synchronizerModule = synchronizer;

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
		this._channel.publish('app:transaction:new', {
			transaction: transaction.getBytes().toString('base64'),
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
		return this._channel.publishToNetwork('sendToNetwork', {
			event: 'postBlock',
			data: {
				block: this._chainModule.dataAccess.encode(block).toString('base64'),
			},
		});
	}

	public async handleRPCGetBlocksFromId(
		data: unknown,
		peerId: string,
	): Promise<string[]> {
		const errors = validator.validate(
			schemas.getBlocksFromIdRequest,
			data as object,
		);

		if (errors.length) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

		const blockID = Buffer.from((data as RPCBlocksByIdData).blockId, 'base64');

		// Get height of block with supplied ID
		const lastBlock = await this._chainModule.dataAccess.getBlockHeaderByID(
			blockID,
		);

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		// 15kb * 103 is about 1.5MB where it's half of 3MB payload limit
		const fetchUntilHeight = lastBlockHeight + 103;

		const blocks = await this._chainModule.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);

		return blocks.map(block =>
			this._chainModule.dataAccess.encode(block).toString('base64'),
		);
	}

	public async handleRPCGetGetHighestCommonBlock(
		data: unknown,
		peerId: string,
	): Promise<string | undefined> {
		const valid = validator.validate(
			schemas.getHighestCommonBlockRequest,
			data as object,
		);

		if (valid.length) {
			const err = valid;
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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

		const blockIDs = (data as RPCHighestCommonBlockData).ids.map(id =>
			Buffer.from(id, 'base64'),
		);

		const commonBlockHeader = await this._chainModule.dataAccess.getHighestCommonBlockHeader(
			blockIDs,
		);

		return commonBlockHeader
			? this._chainModule.dataAccess
					.encodeBlockHeader(commonBlockHeader)
					.toString('base64')
			: undefined;
	}

	public async handleEventPostBlock(
		data: unknown,
		peerId: string,
	): Promise<void> {
		// Should ignore received block if syncing
		if (this._synchronizerModule.isActive) {
			return this._logger.debug(
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

		const blockBytes = Buffer.from(
			(data as EventPostBlockData).block,
			'base64',
		);

		const block = this._chainModule.dataAccess.decode(blockBytes);

		return this._processorModule.process(block, {
			peerId,
		} as p2pTypes.P2PPeerInfo);
	}

	public async handleRPCGetTransactions(
		// eslint-disable-next-line @typescript-eslint/default-param-last
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!transactionIds) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this._transactionPoolModule.getProcessableTransactions();
			const transactions = transactionsBySender
				.values()
				.flat()
				.map(tx => tx.getBytes().toString('base64'));
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

		for (const idStr of transactionIds) {
			// Check if any transaction is in the queues.
			const id = Buffer.from(idStr, 'base64');
			const transaction = this._transactionPoolModule.get(
				id,
			) as BaseTransaction;

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (transaction) {
				transactionsFromQueues.push(transaction.getBytes().toString('base64'));
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
					transactionsFromDatabase.map(t => t.getBytes().toString('base64')),
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
			const tx = this._chainModule.dataAccess.decodeTransaction(
				Buffer.from(data.transaction, 'base64'),
			);
			const id = await this._receiveTransaction(tx);
			return {
				transactionId: id.toString('base64'),
			};
		} catch (err) {
			return {
				message: 'Transaction was rejected with errors',
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
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

		const ids = (data as EventPostTransactionsAnnouncementData).transactionIds.map(
			idStr => Buffer.from(idStr, 'base64'),
		);

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(ids);
		if (unknownTransactionIDs.length > 0) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { data: result } = await this._channel.invokeFromNetwork<{
				data: { transactions: string[] };
			}>('requestFromPeer', {
				procedure: 'getTransactions',
				data: {
					transactionIds: unknownTransactionIDs.map(id =>
						id.toString('base64'),
					),
				},
				peerId,
			});
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				for (const transaction of result.transactions) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					const tx = this._chainModule.dataAccess.decodeTransaction(
						Buffer.from(transaction, 'base64'),
					);
					await this._receiveTransaction(tx);
				}
			} catch (err) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

	private async _obtainUnknownTransactionIDs(ids: Buffer[]): Promise<Buffer[]> {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this._transactionPoolModule.contains(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions: BaseTransaction[] = [];
			for (const id of unknownTransactionsIDs) {
				try {
					const tx = await this._chainModule.dataAccess.getTransactionByID(id);
					existingTransactions.push(tx);
				} catch (error) {
					if (!(error instanceof NotFoundError)) {
						throw error;
					}
				}
			}

			return unknownTransactionsIDs.filter(
				id =>
					existingTransactions.find(existingTransaction =>
						existingTransaction.id.equals(id),
					) === undefined,
			);
		}

		return unknownTransactionsIDs;
	}

	private async _receiveTransaction(
		transaction: BaseTransaction,
	): Promise<Buffer> {
		try {
			// Composed transaction checks are all static, so it does not need state store
			const transactionsResponses = this._chainModule.validateTransactions([
				transaction,
			]);

			if (transactionsResponses[0].errors.length > 0) {
				throw transactionsResponses[0].errors;
			}
		} catch (errors) {
			const errString = convertErrorsToString(errors);
			const err = new InvalidTransactionError(
				errString,
				transaction.id,
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
