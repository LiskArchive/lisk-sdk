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
import { TransactionPool, Transaction } from '@liskhq/lisk-transaction-pool';
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

export interface TransportConstructor {
	readonly channel: Channel;
	readonly logger: Logger;
	readonly synchronizerModule: Synchronizer;
	readonly transactionPoolModule: TransactionPool;
	readonly chainModule: Chain;
	readonly processorModule: Processor;
}

interface RateTracker {
	[key: string]: { [key: string]: number };
}

export class Transport {
	private rateTracker: RateTracker;
	private readonly channel: Channel;
	private readonly logger: Logger;
	private readonly synchronizerModule: Synchronizer;
	private readonly transactionPoolModule: TransactionPool;
	private readonly chainModule: Chain;
	private readonly processorModule: Processor;
	private readonly broadcaster: Broadcaster;

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
		this.channel = channel;
		this.logger = logger;
		this.synchronizerModule = synchronizerModule;

		this.transactionPoolModule = transactionPoolModule;
		this.chainModule = chainModule;
		this.processorModule = processorModule;

		this.broadcaster = new Broadcaster({
			transactionPool: this.transactionPoolModule,
			logger: this.logger,
			channel: this.channel,
			releaseLimit: DEFAULT_RELEASE_LIMIT,
			interval: DEFAULT_RELEASE_INTERVAL,
		});

		// Rate limit for certain endpoints
		this.rateTracker = {};
		setInterval(() => {
			this.rateTracker = {};
		}, DEFAULT_RATE_RESET_TIME);
	}

	handleBroadcastTransaction(transaction: BaseTransaction): void {
		this.broadcaster.enqueueTransactionId(transaction.id);
		this.channel.publish('app:transaction:new', transaction.toJSON());
	}

	async handleBroadcastBlock(blockJSON: BlockJSON): Promise<unknown> {
		if (this.synchronizerModule.isActive) {
			this.logger.debug(
				'Transport->onBroadcastBlock: Aborted - blockchain synchronization in progress',
			);
			return null;
		}
		return this.channel.publishToNetwork('sendToNetwork', {
			event: 'postBlock',
			data: {
				block: blockJSON,
			},
		});
	}

	async handleRPCGetBlocksFromId(
		data: RPCBlocksByIdData,
		peerId: string,
	): Promise<BlockJSON[]> {
		const errors = validator.validate(schemas.getBlocksFromIdRequest, data);

		if (errors.length) {
			const error = `${errors[0].message}`;

			this.logger.warn(
				{
					err: error,
					req: data,
				},
				'getBlocksFromID request validation failed',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		// Get height of block with supplied ID
		const lastBlock = await this.chainModule.dataAccess.getBlockHeaderByID(
			data.blockId,
		);
		if (!lastBlock) {
			throw new Error(`Invalid blockId requested: ${data.blockId}`);
		}

		const lastBlockHeight = lastBlock.height;

		// Calculate max block height for database query
		// 15kb * 103 is about 1.5MB where it's half of 3MB payload limit
		const fetchUntilHeight = lastBlockHeight + 103;

		const blocks = await this.chainModule.dataAccess.getBlocksByHeightBetween(
			lastBlockHeight + 1,
			fetchUntilHeight,
		);

		return blocks && blocks.map(block => this.chainModule.serialize(block));
	}

	async handleRPCGetGetHighestCommonBlock(
		data: RPCHighestCommonBlockData,
		peerId: string,
	): Promise<BlockHeaderJSON | null> {
		const valid = validator.validate(
			schemas.getHighestCommonBlockRequest,
			data,
		);

		if (valid.length) {
			const err = valid;
			const error = `${err[0].message}: ${err[0].dataPath}`;
			this.logger.warn(
				{
					err: error,
					req: data,
				},
				'getHighestCommonBlock request validation failed',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw new Error(error);
		}

		const commonBlock = await this.chainModule.getHighestCommonBlock(data.ids);

		return commonBlock
			? this.chainModule.serializeBlockHeader(commonBlock)
			: null;
	}

	async handleEventPostBlock(
		data: EventPostBlockData,
		peerId: string,
	): Promise<void> {
		// Should ignore received block if syncing
		if (this.synchronizerModule.isActive) {
			return this.logger.debug(
				{ blockId: data.block.id, height: data.block.height },
				"Client is syncing. Can't process new block at the moment.",
			);
		}

		const errors = validator.validate(schemas.postBlockEvent, data);

		if (errors.length) {
			this.logger.warn(
				{
					errors,
					module: 'transport',
					data,
				},
				'Received post block broadcast request in unexpected format',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const block = await this.processorModule.deserialize(data.block);

		return this.processorModule.process(block, {
			peerId,
		} as p2pTypes.P2PPeerInfo);
	}

	async handleRPCGetTransactions(
		data: RPCTransactionsByIdData = { transactionIds: [] },
		peerId: string,
	): Promise<{ transactions: TransactionJSON[] }> {
		await this._addRateLimit(
			'getTransactions',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(schemas.getTransactionsRequest, data);
		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const { transactionIds } = data;
		if (!transactionIds) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this.transactionPoolModule.getProcessableTransactions();
			const transactions = Object.values(transactionsBySender).flat();
			transactions.splice(DEFAULT_RATE_RESET_TIME);

			return {
				transactions,
			};
		}

		if (transactionIds.length > DEFAULT_RELEASE_LIMIT) {
			const error = new Error('Received invalid request.');
			this.logger.warn({ err: error, peerId }, 'Received invalid request.');
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of transactionIds) {
			// Check if any transaction is in the queues.
			const transaction = this.transactionPoolModule.get(id) as BaseTransaction;

			if (transaction) {
				transactionsFromQueues.push(transaction.toJSON());
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this.chainModule.dataAccess.getTransactionsByIDs(
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

	async handleEventPostTransaction(
		data: EventPostTransactionData,
	): Promise<{ transactionId: string }> {
		try {
			const id = await this._receiveTransaction(data.transaction);
			return {
				transactionId: id,
			};
		} catch (err) {
			throw {
				message: 'Transaction was rejected with errors',
				errors: err.errors || err,
			};
		}
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 */
	async handleEventPostTransactionsAnnouncement(
		data: EventPostTransactionsAnnouncementData,
		peerId: string,
	): Promise<null> {
		await this._addRateLimit(
			'postTransactionsAnnouncement',
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		const errors = validator.validate(
			schemas.postTransactionsAnnouncementEvent,
			data,
		);

		if (errors.length) {
			this.logger.warn(
				{ err: errors, peerId },
				'Received invalid transactions body',
			);
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 100,
			});
			throw errors;
		}

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			data.transactionIds,
		);
		if (unknownTransactionIDs.length > 0) {
			const { data: result } = (await this.channel.invokeFromNetwork(
				'requestFromPeer',
				{
					procedure: 'getTransactions',
					data: { transactionIds: unknownTransactionIDs },
					peerId,
				},
			)) as { data: { transactions: TransactionJSON[] } };
			try {
				for (const transaction of result.transactions) {
					/* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
					(transaction as any).bundled = true;
					await this._receiveTransaction(transaction);
				}
			} catch (err) {
				this.logger.warn({ err, peerId }, 'Received invalid transactions.');
				if (err instanceof InvalidTransactionError) {
					await this.channel.invoke('app:applyPenaltyOnPeer', {
						peerId,
						penalty: 100,
					});
				}
			}
		}

		return null;
	}

	async _obtainUnknownTransactionIDs(ids: string[]): Promise<string[]> {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(
			id => !this.transactionPoolModule.contains(id),
		);

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions = await this.chainModule.dataAccess.getTransactionsByIDs(
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

	async _receiveTransaction(transactionJSON: TransactionJSON): Promise<string> {
		let transaction;
		try {
			transaction = this.chainModule.deserializeTransaction(transactionJSON);

			// Composed transaction checks are all static, so it does not need state store
			const transactionsResponses = await this.chainModule.validateTransactions(
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
			this.logger.error(
				{
					err,
					module: 'transport',
				},
				'Transaction normalization failed',
			);

			throw err;
		}

		if (this.transactionPoolModule.contains(transaction.id)) {
			return transaction.id;
		}

		// Broadcast transaction to network if not present in pool
		this.handleBroadcastTransaction(transaction);

		const { errors } = await this.transactionPoolModule.add(
			transaction as Transaction,
		);

		if (!errors.length) {
			this.logger.info(
				{
					id: transaction.id,
					nonce: transaction.nonce.toString(),
					senderPublicKey: transaction.senderPublicKey,
				},
				'Added transaction to pool',
			);
			return transaction.id;
		}

		this.logger.error({ errors }, 'Failed to add transaction to pool');
		throw errors;
	}

	async _addRateLimit(
		procedure: string,
		peerId: string,
		limit: number,
	): Promise<void> {
		if (this.rateTracker[procedure] === undefined) {
			this.rateTracker[procedure] = { [peerId]: 0 };
		}
		this.rateTracker[procedure][peerId] = this.rateTracker[procedure][peerId]
			? this.rateTracker[procedure][peerId] + 1
			: 1;
		if (this.rateTracker[procedure][peerId] > limit) {
			await this.channel.invoke('app:applyPenaltyOnPeer', {
				peerId,
				penalty: 10,
			});
		}
	}
}
