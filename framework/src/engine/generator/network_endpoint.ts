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

import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { Chain, Transaction } from '@liskhq/lisk-chain';
import { EventEmitter } from 'events';
import { Logger } from '../../logger';
import { Network } from '../network';
import { BaseNetworkEndpoint } from '../network/base_network_endpoint';
import {
	NETWORK_RPC_GET_TRANSACTIONS,
	DEFAULT_RATE_LIMIT_FREQUENCY,
	DEFAULT_RELEASE_LIMIT,
	NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
	EMPTY_BUFFER,
	GENERATOR_EVENT_NEW_TRANSACTION_ANNOUNCEMENT,
	GENERATOR_EVENT_NEW_TRANSACTION,
} from './constants';
import {
	GetTransactionRequest,
	getTransactionRequestSchema,
	GetTransactionResponse,
	getTransactionsResponseSchema,
	PostTransactionsAnnouncement,
	postTransactionsAnnouncementSchema,
} from './schemas';
import { InvalidTransactionError } from './errors';
import { Broadcaster } from './broadcaster';
import { ABI, TransactionVerifyResult } from '../../abi';

interface NetworkEndpointArgs {
	network: Network;
	pool: TransactionPool;
	chain: Chain;
	abi: ABI;
	broadcaster: Broadcaster;
}

interface NetworkEndpointInitArgs {
	logger: Logger;
}

export class NetworkEndpoint extends BaseNetworkEndpoint {
	public event = new EventEmitter();
	private readonly _pool: TransactionPool;
	private readonly _chain: Chain;
	private readonly _broadcaster: Broadcaster;
	private readonly _abi: ABI;

	private _logger!: Logger;

	public constructor(args: NetworkEndpointArgs) {
		super(args.network);
		this._pool = args.pool;
		this._chain = args.chain;
		this._abi = args.abi;
		this._broadcaster = args.broadcaster;
	}

	public init(args: NetworkEndpointInitArgs): void {
		this._logger = args.logger;
	}

	public async handleRPCGetTransactions(data: unknown, peerId: string): Promise<Buffer> {
		this.addRateLimit(NETWORK_RPC_GET_TRANSACTIONS, peerId, DEFAULT_RATE_LIMIT_FREQUENCY);
		let decodedData: GetTransactionRequest = { transactionIds: [] };

		if (Buffer.isBuffer(data)) {
			decodedData = codec.decode<GetTransactionRequest>(getTransactionRequestSchema, data);

			try {
				validator.validate(getTransactionRequestSchema, decodedData);
			} catch (error) {
				this._logger.warn(
					{ err: error as Error, peerId },
					'Received invalid getTransactions body. Applying a penalty to the peer',
				);
				this.network.applyPenaltyOnPeer({
					peerId,
					penalty: 100,
				});
				throw error;
			}

			if (!objectUtils.bufferArrayUniqueItems(decodedData.transactionIds)) {
				this._logger.warn(
					{ peerId },
					'Received invalid getTransactions body. Applying a penalty to the peer',
				);
				this.network.applyPenaltyOnPeer({
					peerId,
					penalty: 100,
				});

				throw new Error('Received invalid getTransactions body');
			}
		}

		const { transactionIds } = decodedData;
		if (!transactionIds?.length) {
			// Get processable transactions from pool and collect transactions across accounts
			// Limit the transactions to send based on releaseLimit
			const transactionsBySender = this._pool.getProcessableTransactions();
			const transactions = transactionsBySender
				.values()
				.flat()
				.map(tx => tx.getBytes());
			transactions.splice(DEFAULT_RELEASE_LIMIT);

			return codec.encode(getTransactionsResponseSchema, {
				transactions,
			});
		}

		if (transactionIds.length > DEFAULT_RELEASE_LIMIT) {
			const error = new Error(
				`Requested number of transactions ${transactionIds.length} exceeds maximum allowed.`,
			);
			this._logger.warn(
				{ err: error, peerId },
				'Received invalid request. Applying a penalty to the peer',
			);
			this.network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		const transactionsFromQueues = [];
		const idsNotInPool = [];

		for (const id of transactionIds) {
			// Check if any transaction is in the queues.
			const transaction = this._pool.get(id);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (transaction) {
				transactionsFromQueues.push(transaction.getBytes());
			} else {
				idsNotInPool.push(id);
			}
		}

		if (idsNotInPool.length) {
			// Check if any transaction that was not in the queues, is in the database instead.
			const transactionsFromDatabase = await this._chain.dataAccess.getTransactionsByIDs(
				idsNotInPool,
			);

			return codec.encode(getTransactionsResponseSchema, {
				transactions: transactionsFromQueues.concat(
					transactionsFromDatabase.map(t => t.getBytes()),
				),
			});
		}

		return codec.encode(getTransactionsResponseSchema, {
			transactions: transactionsFromQueues,
		});
	}

	/**
	 * Process transactions IDs announcement. First validates, filter the known transactions
	 * and finally ask to the emitter the ones that are unknown.
	 */
	public async handleEventPostTransactionsAnnouncement(
		data: unknown,
		peerId: string,
	): Promise<void> {
		this.addRateLimit(
			NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
			peerId,
			DEFAULT_RATE_LIMIT_FREQUENCY,
		);
		if (!Buffer.isBuffer(data)) {
			const errorMessage =
				'Received invalid transaction announcement data. Applying a penalty to the peer';
			this._logger.warn({ peerId }, errorMessage);
			this.network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw new Error(errorMessage);
		}

		const decodedData = codec.decode<PostTransactionsAnnouncement>(
			postTransactionsAnnouncementSchema,
			data,
		);

		// Validate the data received from the peer.
		try {
			validator.validate(postTransactionsAnnouncementSchema, decodedData);
		} catch (error) {
			this._logger.warn(
				{ err: error as Error, peerId },
				'Received invalid transactions body. Applying a penalty to the peer',
			);
			this.network.applyPenaltyOnPeer({
				peerId,
				penalty: 100,
			});
			throw error;
		}

		this.event.emit(GENERATOR_EVENT_NEW_TRANSACTION_ANNOUNCEMENT, decodedData);

		const unknownTransactionIDs = await this._obtainUnknownTransactionIDs(
			decodedData.transactionIds,
		);

		if (unknownTransactionIDs.length > 0) {
			const transactionIdsBuffer = codec.encode(getTransactionRequestSchema, {
				transactionIds: unknownTransactionIDs,
			});

			const encodedData = (await this.network.requestFromPeer({
				procedure: NETWORK_RPC_GET_TRANSACTIONS,
				data: transactionIdsBuffer,
				peerId,
			})) as {
				data: Buffer;
			};

			const transactionsData = codec.decode<GetTransactionResponse>(
				getTransactionsResponseSchema,
				encodedData.data,
			);

			try {
				for (const transactionBytes of transactionsData.transactions) {
					const transaction = Transaction.fromBytes(transactionBytes);

					transaction.validate();

					await this._receiveTransaction(transaction);
				}
			} catch (err) {
				if (err instanceof InvalidTransactionError) {
					this._logger.debug({ err, peerId }, 'Received invalid transactions.');
					return;
				}
				this._logger.warn(
					{ err, peerId },
					'Received invalid transactions. Applying a penalty to the peer',
				);
				this.network.applyPenaltyOnPeer({
					peerId,
					penalty: 100,
				});
			}
		}
	}

	private async _receiveTransaction(transaction: Transaction) {
		const { result } = await this._abi.verifyTransaction({
			contextID: EMPTY_BUFFER,
			transaction: transaction.toObject(),
			header: this._chain.lastBlock.header.toObject(),
		});
		if (result === TransactionVerifyResult.INVALID) {
			throw new InvalidTransactionError('Transaction verification failed.', transaction.id);
		}
		if (this._pool.contains(transaction.id)) {
			return;
		}

		// Broadcast transaction to network if not present in pool
		this._broadcaster.enqueueTransactionId(transaction.id);

		const { error } = await this._pool.add(transaction);

		if (!error) {
			this.event.emit(GENERATOR_EVENT_NEW_TRANSACTION, { transaction: transaction.toJSON() });
			this._logger.info(
				{
					id: transaction.id,
					nonce: transaction.nonce.toString(),
					senderPublicKey: transaction.senderPublicKey,
				},
				'Added transaction to pool',
			);
			return;
		}

		this._logger.error({ err: error }, 'Failed to add transaction to pool.');
		throw new InvalidTransactionError(
			error.message ?? 'Transaction verification failed.',
			transaction.id,
		);
	}

	private async _obtainUnknownTransactionIDs(ids: Buffer[]): Promise<Buffer[]> {
		// Check if any transaction is in the queues.
		const unknownTransactionsIDs = ids.filter(id => !this._pool.contains(id));

		if (unknownTransactionsIDs.length) {
			// Check if any transaction exists in the database.
			const existingTransactions: Transaction[] = await this._chain.dataAccess.getTransactionsByIDs(
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
}
