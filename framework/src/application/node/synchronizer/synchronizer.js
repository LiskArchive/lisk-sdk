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

'use strict';

const assert = require('assert');
const { validator } = require('@liskhq/lisk-validator');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const definitions = require('../schema/definitions');
const utils = require('./utils');

class Synchronizer {
	constructor({
		channel,
		logger,
		blocksModule,
		processorModule,
		storageModule,
		transactionPoolModule,
		mechanisms = [],
	}) {
		assert(
			Array.isArray(mechanisms),
			'mechanisms should be an array of mechanisms',
		);
		this.mechanisms = mechanisms;
		this.channel = channel;
		this.logger = logger;
		this.blocksModule = blocksModule;
		this.processorModule = processorModule;
		this.transactionPoolModule = transactionPoolModule;
		this.storageModule = storageModule;
		this.active = false;
		this.loadTransactionsRetries = 5;

		this._checkMechanismsInterfaces();
	}

	_checkMechanismsInterfaces() {
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

	async init() {
		const isEmpty = await this.storageModule.entities.TempBlock.isEmpty();
		if (!isEmpty) {
			try {
				await utils.restoreBlocksUponStartup(
					this.logger,
					this.blocksModule,
					this.processorModule,
					this.storageModule,
				);
			} catch (err) {
				this.logger.error(
					{ err },
					'Failed to restore blocks from temp table upon startup',
				);
			}
		}
	}

	async run(receivedBlock, peerId) {
		if (this.isActive) {
			throw new Error('Synchronizer is already running');
		}
		try {
			this.active = true;
			assert(
				receivedBlock,
				'A block must be provided to the Synchronizer in order to run',
			);
			assert(
				peerId,
				'A peer ID from the peer sending the block must be provided to the Synchronizer in order to run',
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
			await this.processorModule.validateDetached(receivedBlockInstance);

			// Choose the right mechanism to sync
			const validMechanism = await this._determineSyncMechanism(
				receivedBlockInstance,
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
					lastBlockHeight: this.blocksModule.lastBlock.height,
					lastBlockId: this.blocksModule.lastBlock.id,
					mechanism: validMechanism.constructor.name,
				},
				'Synchronization finished',
			);
		} finally {
			this.active = false;
		}
	}

	get isActive() {
		return this.active;
	}

	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _determineSyncMechanism(receivedBlock) {
		for (const mechanism of this.mechanisms) {
			if (await mechanism.isValidFor(receivedBlock)) {
				return mechanism;
			}
		}

		return undefined;
	}

	async loadUnconfirmedTransactions() {
		await new Promise(resolve => {
			async.retry(
				this.retries,
				async () => this._getUnconfirmedTransactionsFromNetwork(),
				err => {
					if (err) {
						this.logger.error(
							{ err },
							'Failed to get transactions from network',
						);
					}
					resolve();
				},
			);
		});
	}

	/**
	 * Loads transactions from the network:
	 * - Validates each transaction from the network and applies a penalty if invalid.
	 * - Calls processUnconfirmedTransaction for each transaction.
	 */
	async _getUnconfirmedTransactionsFromNetwork() {
		this.logger.info('Loading transactions from the network');

		// TODO: Add target module to procedure name. E.g. chain:getTransactions
		const { data: result } = await this.channel.invokeFromNetwork(
			'requestFromNetwork',
			{
				procedure: 'getTransactions',
			},
		);

		const validatorErrors = validator.validate(
			definitions.WSTransactionsResponse,
			result,
		);
		if (validatorErrors.length) {
			throw validatorErrors;
		}

		const transactions = result.transactions.map(tx =>
			this.blocksModule.deserializeTransaction(tx),
		);

		try {
			const {
				transactionsResponses,
			} = await this.blocksModule.validateTransactions(transactions);
			const invalidTransactionResponse = transactionsResponses.find(
				transactionResponse =>
					transactionResponse.status !== TransactionStatus.OK,
			);
			if (invalidTransactionResponse) {
				throw invalidTransactionResponse.errors;
			}
		} catch (errors) {
			const error =
				Array.isArray(errors) && errors.length > 0 ? errors[0] : errors;
			this.logger.error(
				{
					id: error.id,
					err: error.toString(),
					module: 'loader',
				},
				'Transaction normalization failed',
			);
			throw error;
		}

		const transactionCount = transactions.length;
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < transactionCount; i++) {
			const transaction = transactions[i];

			try {
				/* eslint-disable-next-line */
				transaction.bundled = true;
				await this.transactionPoolModule.processUnconfirmedTransaction(
					transaction,
				);
			} catch (error) {
				this.logger.error(error);
				throw error;
			}
		}
	}
}

module.exports = { Synchronizer };
