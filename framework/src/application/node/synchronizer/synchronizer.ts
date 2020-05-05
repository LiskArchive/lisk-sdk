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

import * as assert from 'assert';
import { validator } from '@liskhq/lisk-validator';
import {
	Status as TransactionStatus,
	TransactionJSON,
	TransactionError,
	BaseTransaction,
} from '@liskhq/lisk-transactions';
import { Chain, BlockInstance, BlockJSON } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import * as definitions from './schema';
import * as utils from './utils';
import { Logger, Channel } from '../../../types';
import { Processor } from '../processor';
import { BaseSynchronizer } from './base_synchronizer';

interface SynchronizerInput {
	readonly logger: Logger;
	readonly channel: Channel;
	readonly chainModule: Chain;
	readonly processorModule: Processor;
	readonly transactionPoolModule: TransactionPool;
	readonly mechanisms: BaseSynchronizer[];
}

interface TransactionPoolTransaction extends BaseTransaction {
	asset: { [key: string]: string | number | readonly string[] | undefined };
}

export class Synchronizer {
	public active: boolean;
	protected logger: Logger;
	protected channel: Channel;
	private readonly chainModule: Chain;
	private readonly processorModule: Processor;
	private readonly transactionPoolModule: TransactionPool;
	private readonly mechanisms: BaseSynchronizer[];
	private readonly loadTransactionsRetries: number;

	public constructor({
		channel,
		logger,
		chainModule,
		processorModule,
		transactionPoolModule,
		mechanisms = [],
	}: SynchronizerInput) {
		assert(
			Array.isArray(mechanisms),
			'mechanisms should be an array of mechanisms',
		);
		this.mechanisms = mechanisms;
		this.channel = channel;
		this.logger = logger;
		this.chainModule = chainModule;
		this.processorModule = processorModule;
		this.transactionPoolModule = transactionPoolModule;
		this.active = false;
		this.loadTransactionsRetries = 5;

		this._checkMechanismsInterfaces();
	}

	public async init(): Promise<void> {
		const isEmpty = await this.chainModule.dataAccess.isTempBlockEmpty();
		if (!isEmpty) {
			try {
				await utils.restoreBlocksUponStartup(
					this.logger,
					this.chainModule,
					this.processorModule,
				);
			} catch (err) {
				this.logger.error(
					{ err: err as Error },
					'Failed to restore blocks from temp table upon startup',
				);
			}
		}
	}

	public async run(receivedBlock: BlockJSON, peerId: string): Promise<void> {
		if (this.isActive) {
			throw new Error('Synchronizer is already running');
		}
		try {
			this.active = true;
			assert(
				receivedBlock,
				'A block must be provided to the Synchronizer in order to run',
			);
			this.logger.info(
				{ blockId: receivedBlock.id, height: receivedBlock.height },
				'Starting synchronizer',
			);
			const receivedBlockInstance = await this.processorModule.deserialize(
				receivedBlock,
			);

			// Moving to a Different Chain
			// 1. Step: Validate new tip of chain
			await this.processorModule.validate(receivedBlockInstance);

			// Choose the right mechanism to sync
			const validMechanism = await this._determineSyncMechanism(
				receivedBlockInstance,
				peerId,
			);

			if (!validMechanism) {
				return this.logger.info(
					{ blockId: receivedBlockInstance.id },
					'Syncing mechanism could not be determined for the given block',
				);
			}

			this.logger.info(`Triggering: ${validMechanism.constructor.name}`);

			await validMechanism.run(receivedBlockInstance, peerId);

			return this.logger.info(
				{
					lastBlockHeight: this.chainModule.lastBlock.height,
					lastBlockId: this.chainModule.lastBlock.id,
					mechanism: validMechanism.constructor.name,
				},
				'Synchronization finished',
			);
		} finally {
			this.active = false;
		}
	}

	public get isActive(): boolean {
		return this.active;
	}

	public async loadUnconfirmedTransactions(): Promise<void> {
		for (let retry = 0; retry < this.loadTransactionsRetries; retry += 1) {
			try {
				await this._getUnconfirmedTransactionsFromNetwork();

				break;
			} catch (err) {
				if (err && retry === this.loadTransactionsRetries - 1) {
					this.logger.error(
						{ err: err as Error },
						`Failed to get transactions from network after ${this.loadTransactionsRetries} retries`,
					);
				}
			}
		}
	}

	private async _determineSyncMechanism(
		receivedBlock: BlockInstance,
		peerId: string,
	): Promise<BaseSynchronizer | undefined> {
		for (const mechanism of this.mechanisms) {
			if (await mechanism.isValidFor(receivedBlock, peerId)) {
				return mechanism;
			}
		}

		return undefined;
	}

	/**
	 * Loads transactions from the network:
	 * - Validates each transaction from the network and applies a penalty if invalid.
	 * - Calls processUnconfirmedTransaction for each transaction.
	 */
	private async _getUnconfirmedTransactionsFromNetwork(): Promise<void> {
		this.logger.info('Loading transactions from the network');

		// TODO: Add target module to procedure name. E.g. chain:getTransactions
		const { data: result } = await this.channel.invokeFromNetwork<{
			data: { transactions: TransactionJSON[] };
		}>('requestFromNetwork', {
			procedure: 'getTransactions',
		});

		const validatorErrors = validator.validate(
			definitions.WSTransactionsResponse,
			result,
		);
		if (validatorErrors.length) {
			throw validatorErrors;
		}

		const transactions = result.transactions.map(tx =>
			this.chainModule.deserializeTransaction(tx),
		);

		try {
			const transactionsResponses = await this.chainModule.validateTransactions(
				transactions,
			);
			const invalidTransactionResponse = transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidTransactionResponse) {
				throw invalidTransactionResponse.errors;
			}
		} catch (errors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const error: TransactionError =
				Array.isArray(errors) && errors.length > 0 ? errors[0] : errors;
			this.logger.error(
				{
					id: error.id,
					err: error.toString(),
				},
				'Transaction normalization failed',
			);
			throw error;
		}

		const transactionCount = transactions.length;
		for (let i = 0; i < transactionCount; i += 1) {
			const { errors } = await this.transactionPoolModule.add(
				transactions[i] as TransactionPoolTransaction,
			);

			if (errors.length) {
				this.logger.error({ errors }, 'Failed to add transaction to pool');
				throw errors;
			}
		}
	}

	private _checkMechanismsInterfaces(): void {
		for (const mechanism of this.mechanisms) {
			assert(
				typeof mechanism.isValidFor === 'function',
				`Mechanism ${mechanism.constructor.name} should implement "isValidFor" method`,
			);
			assert(
				typeof mechanism.run === 'function',
				`Mechanism ${mechanism.constructor.name} should implement "run" method`,
			);
		}
	}
}
