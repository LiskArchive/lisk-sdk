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
import { BFT } from '@liskhq/lisk-bft';
import { codec } from '@liskhq/lisk-codec';
import { Chain, Block } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { jobHandlers } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';

import { BaseSynchronizer } from './base_synchronizer';
import { InMemoryChannel } from '../../controller/channels';
import { Logger } from '../../logger';
import { Network } from '../network';
import { Processor } from '../processor';
import { transactionsSchema } from '../transport/schemas';
import * as utils from './utils';

interface SynchronizerInput {
	readonly logger: Logger;
	readonly channel: InMemoryChannel;
	readonly chainModule: Chain;
	readonly bftModule: BFT;
	readonly processorModule: Processor;
	readonly transactionPoolModule: TransactionPool;
	readonly mechanisms: BaseSynchronizer[];
	readonly networkModule: Network;
}

export class Synchronizer {
	protected logger: Logger;
	protected channel: InMemoryChannel;
	private readonly chainModule: Chain;
	private readonly bftModule: BFT;
	private readonly _mutex: jobHandlers.Mutex;
	private readonly processorModule: Processor;
	private readonly transactionPoolModule: TransactionPool;
	private readonly _networkModule: Network;
	private readonly mechanisms: BaseSynchronizer[];
	private readonly loadTransactionsRetries: number;

	public constructor({
		channel,
		logger,
		chainModule,
		bftModule,
		processorModule,
		transactionPoolModule,
		mechanisms = [],
		networkModule,
	}: SynchronizerInput) {
		assert(Array.isArray(mechanisms), 'mechanisms should be an array of mechanisms');
		this.mechanisms = mechanisms;
		this.channel = channel;
		this.logger = logger;
		this.chainModule = chainModule;
		this.bftModule = bftModule;
		this.processorModule = processorModule;
		this.transactionPoolModule = transactionPoolModule;
		this._networkModule = networkModule;
		this.loadTransactionsRetries = 5;

		this._checkMechanismsInterfaces();
		this._mutex = new jobHandlers.Mutex();
	}

	public async init(): Promise<void> {
		const isEmpty = await this.chainModule.dataAccess.isTempBlockEmpty();
		if (!isEmpty) {
			try {
				await utils.restoreBlocksUponStartup(
					this.logger,
					this.chainModule,
					this.bftModule,
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

	public async run(receivedBlock: Block, peerId: string): Promise<void> {
		if (this._mutex.isLocked()) {
			this.logger.debug('Synchronizer is already running.');
			return;
		}
		await this._mutex.runExclusive(async () => {
			assert(receivedBlock, 'A block must be provided to the Synchronizer in order to run');
			this.logger.info(
				{
					blockId: receivedBlock.header.id,
					height: receivedBlock.header.height,
				},
				'Starting synchronizer',
			);
			// Moving to a Different Chain
			// 1. Step: Validate new tip of chain
			this.processorModule.validate(receivedBlock);

			// Choose the right mechanism to sync
			const validMechanism = await this._determineSyncMechanism(receivedBlock, peerId);

			if (!validMechanism) {
				this.logger.info(
					{ blockId: receivedBlock.header.id },
					'Syncing mechanism could not be determined for the given block',
				);
				return;
			}

			this.logger.info(`Triggering: ${validMechanism.constructor.name}`);

			await validMechanism.run(receivedBlock, peerId);

			this.logger.info(
				{
					lastBlockHeight: this.chainModule.lastBlock.header.height,
					lastBlockID: this.chainModule.lastBlock.header.id,
					mechanism: validMechanism.constructor.name,
				},
				'Synchronization finished.',
			);
		});
	}

	public get isActive(): boolean {
		return this._mutex.isLocked();
	}

	public async stop(): Promise<void> {
		for (const mechanism of this.mechanisms) {
			mechanism.stop();
		}
		// Add mutex to wait for the current mutex to finish
		await this._mutex.acquire();
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
		receivedBlock: Block,
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

		const { data } = ((await this._networkModule.request({
			procedure: 'getTransactions',
		})) as unknown) as {
			data: Buffer;
		};
		const encodedData = codec.decode<{ transactions: Buffer[] }>(transactionsSchema, data);

		const validatorErrors = validator.validate(transactionsSchema, encodedData);
		if (validatorErrors.length) {
			throw new LiskValidationError(validatorErrors);
		}

		const transactions = encodedData.transactions.map(transaction =>
			this.chainModule.dataAccess.decodeTransaction(transaction),
		);

		for (const transaction of transactions) {
			this.processorModule.validateTransaction(transaction);
		}

		const transactionCount = transactions.length;
		for (let i = 0; i < transactionCount; i += 1) {
			const { error } = await this.transactionPoolModule.add(transactions[i]);

			if (error) {
				this.logger.error({ err: error }, 'Failed to add transaction to pool.');
				throw error;
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
