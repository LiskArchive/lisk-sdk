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

const async = require('async');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const { validator } = require('@liskhq/lisk-validator');
const { CommonBlockError } = require('./utils/error_handlers');
const definitions = require('./schema/definitions');

class Loader {
	constructor({
		// components
		channel,
		logger,
		// Modules
		processorModule,
		transactionPoolModule,
		blocksModule,
		// Constants
		loadPerIteration,
		syncingActive,
	}) {
		this.isActive = false;
		this.total = 0;
		this.blocksToSync = 0;
		this.retries = 5;

		this.channel = channel;
		this.logger = logger;

		this.constants = {
			loadPerIteration,
			syncingActive,
		};

		this.processorModule = processorModule;
		this.transactionPoolModule = transactionPoolModule;
		this.blocksModule = blocksModule;
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
		const { data: result } = await this.channel.invoke('network:request', {
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

	async _getBlocksFromNetwork() {
		const { lastBlock } = this.blocksModule;
		// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
		// TODO: Rename procedure to include target module name. E.g. chain:blocks
		const { data } = await this.channel.invoke('network:request', {
			procedure: 'blocks',
			data: {
				lastBlockId: lastBlock.id,
			},
		});

		if (!data) {
			throw new Error('Received an invalid blocks response from the network');
		}
		// Check for strict equality for backwards compatibility reasons.
		if (data.success === false) {
			throw new CommonBlockError(
				'Peer did not have a matching lastBlockId.',
				lastBlock.id,
			);
		}
		return data.blocks;
	}

	// eslint-disable-next-line class-methods-use-this
	async _validateBlocks(blocks) {
		const errors = validator.validate(definitions.WSBlocksList, blocks);

		if (errors.length) {
			throw new Error('Received invalid blocks data');
		}

		return blocks;
	}

	async _getValidatedBlocksFromNetwork(blocks) {
		const { lastBlock } = this.blocksModule;
		let lastValidBlock = lastBlock;
		for (const block of blocks) {
			const parsedBlock = await this.processorModule.deserialize(block);
			await this.processorModule.validate(parsedBlock);
			await this.processorModule.processValidated(parsedBlock);
			lastValidBlock = parsedBlock;
		}
		this.blocksToSync = lastValidBlock.height;

		return lastValidBlock.id === lastBlock.id;
	}

	async _loadBlocksFromNetwork() {
		// Number of failed attempts to load from the network.
		let failedAttemptsToLoad = 0;
		// If True, own node's db contains all the blocks from the last block request.
		let loaded = false;
		while (!loaded && failedAttemptsToLoad < 5) {
			try {
				const blocksFromNetwork = await this._getBlocksFromNetwork();
				const blocksAfterValidate = await this._validateBlocks(
					blocksFromNetwork,
				);
				loaded = await this._getValidatedBlocksFromNetwork(blocksAfterValidate);
				// Reset counter after a batch of blocks was successfully loaded from the network
				failedAttemptsToLoad = 0;
			} catch (err) {
				failedAttemptsToLoad += 1;
				await this._handleCommonBlockError(err);
				this.logger.warn({ err }, 'Failed to load blocks from the network.');
			}
		}
	}

	// eslint-disable-next-line class-methods-use-this
	async _handleCommonBlockError(error) {
		if (!(error instanceof CommonBlockError)) {
			return;
		}
		throw error;
	}
}

// Export
module.exports = { Loader };
