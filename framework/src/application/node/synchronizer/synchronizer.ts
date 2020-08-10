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
import { Chain, Block } from '@liskhq/lisk-chain';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { BFT } from '@liskhq/lisk-bft';
import * as definitions from './schema';
import * as utils from './utils';
import { Logger } from '../../logger';
import { Processor } from '../processor';
import { BaseSynchronizer } from './base_synchronizer';
import { InMemoryChannel } from '../../../controller/channels';
import { Network } from '../../network';

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
		if (this.isActive) {
			throw new Error('Synchronizer is already running');
		}
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
			return this.logger.info(
				{ blockId: receivedBlock.header.id },
				'Syncing mechanism could not be determined for the given block',
			);
		}

		this.logger.info(`Triggering: ${validMechanism.constructor.name}`);

		await validMechanism.run(receivedBlock, peerId);

		return this.logger.info(
			{
				lastBlockHeight: this.chainModule.lastBlock.header.height,
				lastBlockID: this.chainModule.lastBlock.header.id,
				mechanism: validMechanism.constructor.name,
			},
			'Synchronization finished',
		);
	}

	public get isActive(): boolean {
		return this.mechanisms.some(m => m.active);
	}

	public async stop(): Promise<void> {
		for (const mechanism of this.mechanisms) {
			await mechanism.stop();
		}
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

		// TODO: Add target module to procedure name. E.g. chain:getTransactions
		const { data: result } = (await this._networkModule.request({
			procedure: 'getTransactions',
		})) as {
			data: { transactions: string[] };
		};

		const validatorErrors = validator.validate(definitions.WSTransactionsResponse, result);
		if (validatorErrors.length) {
			throw validatorErrors;
		}

		const transactions = result.transactions.map(txStr =>
			this.chainModule.dataAccess.decodeTransaction(Buffer.from(txStr, 'base64')),
		);

		for (const transaction of transactions) {
			this.processorModule.validateTransaction(transaction);
		}

		const transactionCount = transactions.length;
		for (let i = 0; i < transactionCount; i += 1) {
			const { errors } = await this.transactionPoolModule.add(
				// FIXME: #5619 any should be removed
				transactions[i] as any,
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
