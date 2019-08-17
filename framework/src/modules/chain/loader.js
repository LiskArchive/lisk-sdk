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
const { validateTransactions } = require('./transactions');
const { CommonBlockError } = require('./utils/error_handlers');
const definitions = require('./schema/definitions');

/**
 * Main loader methods. Initializes this with scope content.
 * Calls private function initialize.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires utils/jobs_queue
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 */
class Loader {
	constructor({
		// components
		channel,
		logger,
		storage,
		cache,
		// Unique requirements
		genesisBlock,
		// Modules
		transactionPoolModule,
		blocksModule,
		peersModule,
		interfaceAdapters,
		// Constants
		loadPerIteration,
		rebuildUpToRound,
		syncingActive,
	}) {
		this.isActive = false;
		this.total = 0;
		this.blocksToSync = 0;
		this.retries = 5;

		this.channel = channel;
		this.logger = logger;
		this.storage = storage;
		// TODO: Remove cache
		this.cache = cache;
		this.genesisBlock = genesisBlock;

		this.constants = {
			loadPerIteration,
			rebuildUpToRound,
			syncingActive,
		};

		this.transactionPoolModule = transactionPoolModule;
		this.blocksModule = blocksModule;
		this.peersModule = peersModule;
		this.interfaceAdapters = interfaceAdapters;
	}

	/**
	 * Checks if private constant syncIntervalId has value.
	 *
	 * @returns {boolean} True if syncIntervalId has value
	 */
	syncing() {
		return !!this.isActive;
	}

	/**
	 * Pulls Transactions and signatures.
	 */
	async loadTransactionsAndSignatures() {
		await new Promise(resolve => {
			async.retry(
				this.retries,
				async () => this._getTransactionsFromNetwork(),
				err => {
					if (err) {
						this.logger.error('Unconfirmed transactions loader', err);
					}
					resolve();
				},
			);
		});
		await new Promise(resolve => {
			async.retry(
				this.retries,
				async () => this._getSignaturesFromNetwork(),
				err => {
					if (err) {
						this.logger.error('Signatures loader', err);
					}
					resolve();
				},
			);
		});
	}

	/**
	 * Performs sync operation:
	 * - Undoes unconfirmed transactions.
	 * - Establishes broadhash consensus before sync.
	 * - Performs sync operation: loads blocks from network.
	 * - Update headers: broadhash and height
	 * - Notify remote peers about our new headers
	 * - Establishes broadhash consensus after sync.
	 * - Applies unconfirmed transactions.
	 *
	 * @private
	 * @param {function} cb
	 * @todo Check err actions
	 * @todo Add description for the params
	 */
	async sync() {
		this.logger.info('Starting sync');
		if (this.cache.ready) {
			this.cache.disable();
		}

		this.isActive = true;

		const consensusBefore = await this.peersModule.calculateConsensus(
			this.blocksModule.broadhash,
		);

		this.logger.debug(
			`Establishing broadhash consensus before sync: ${consensusBefore} %`,
		);

		await this._loadBlocksFromNetwork();

		const consensusAfter = await this.peersModule.calculateConsensus(
			this.blocksModule.broadhash,
		);

		this.logger.debug(
			`Establishing broadhash consensus after sync: ${consensusAfter} %`,
		);
		this.isActive = false;
		this.blocksToSync = 0;

		this.logger.info('Finished sync');

		if (this.cache.ready) {
			this.cache.enable();
		}
	}

	/**
	 * Loads signatures from network.
	 * Processes each signature from the network.
	 *
	 * @private
	 * @returns {setImmediateCallback} cb, err
	 * @todo Add description for the params
	 */
	async _getSignaturesFromNetwork() {
		this.logger.info('Loading signatures from the network');

		// TODO: Add target module to procedure name. E.g. chain:getSignatures
		const { data: result } = await this.channel.invoke('network:request', {
			procedure: 'getSignatures',
		});

		const errors = validator.validate(definitions.WSSignaturesResponse, result);
		if (errors.length) {
			throw errors;
		}

		const { signatures } = result;

		const signatureCount = signatures.length;
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < signatureCount; i++) {
			const signaturePacket = signatures[i];
			const subSignatureCount = signaturePacket.signatures.length;
			// eslint-disable-next-line no-plusplus
			for (let j = 0; j < subSignatureCount; j++) {
				const signature = signaturePacket.signatures[j];

				// eslint-disable-next-line no-await-in-loop
				await this.transactionPoolModule.getTransactionAndProcessSignature({
					signature,
					transactionId: signature.transactionId,
				});
			}
		}
	}

	/**
	 * Loads transactions from the network:
	 * - Validates each transaction from the network and applies a penalty if invalid.
	 * - Calls processUnconfirmedTransaction for each transaction.
	 *
	 * @private
	 * @returns {setImmediateCallback} cb, err
	 * @todo Add description for the params
	 */
	async _getTransactionsFromNetwork() {
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
			this.interfaceAdapters.transactions.fromJson(tx),
		);

		try {
			const { transactionsResponses } = validateTransactions()(transactions);
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
			this.logger.debug('Transaction normalization failed', {
				id: error.id,
				err: error.toString(),
				module: 'loader',
			});
			throw error;
		}

		const transactionCount = transactions.length;
		// eslint-disable-next-line no-plusplus
		for (let i = 0; i < transactionCount; i++) {
			const transaction = transactions[i];

			try {
				/* eslint-disable-next-line */
				transaction.bundled = true;
				// eslint-disable-next-line no-await-in-loop
				await this.transactionPoolModule.processUnconfirmedTransaction(
					transaction,
				);
			} catch (error) {
				this.logger.error(error);
				throw error;
			}
		}
	}

	/**
	 * Loads blocks from network.
	 *
	 * @private
	 * @returns {Promise} void
	 * @todo Add description for the params
	 */
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
		// The misspelled data.sucess is required to support v1 nodes.
		// TODO: Remove the misspelled data.sucess === false condition once enough nodes have migrated to v2.
		if (data.success === false || data.sucess === false) {
			throw new CommonBlockError(
				'Peer did not have a matching lastBlockId.',
				lastBlock.id,
			);
		}
		return data.blocks;
	}

	/**
	 * Validate blocks from the network.
	 *
	 * @private
	 * @returns {Promise} void
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	async _validateBlocks(blocks) {
		const errors = validator.validate(definitions.WSBlocksList, blocks);

		if (errors.length) {
			throw new Error('Received invalid blocks data');
		}

		return blocks;
	}

	/**
	 * Loads valided blocks from network.
	 *
	 * @private
	 * @returns {Promise} void
	 * @todo Add description for the params
	 */
	async _getValidatedBlocksFromNetwork(blocks) {
		const { lastBlock } = this.blocksModule;
		const lastValidBlock = await this.blocksModule.loadBlocksFromNetwork(
			blocks,
		);
		this.blocksToSync = lastValidBlock.height;
		return lastValidBlock.id === lastBlock.id;
	}

	/**
	 * Loads blocks from network.
	 *
	 * @private
	 * @returns {Promise} void
	 * @todo Add description for the params
	 */
	async _loadBlocksFromNetwork() {
		// Number of failed attempts to load from the network.
		let failedAttemptsToLoad = 0;
		// If True, own node's db contains all the blocks from the last block request.
		let loaded = false;
		while (!loaded && failedAttemptsToLoad < 5) {
			try {
				// eslint-disable-next-line no-await-in-loop
				const blocksFromNetwork = await this._getBlocksFromNetwork();
				// eslint-disable-next-line no-await-in-loop
				const blocksAfterValidate = await this._validateBlocks(
					blocksFromNetwork,
				);
				// eslint-disable-next-line no-await-in-loop
				loaded = await this._getValidatedBlocksFromNetwork(blocksAfterValidate);
				// Reset counter after a batch of blocks was successfully loaded from the network
				failedAttemptsToLoad = 0;
			} catch (err) {
				failedAttemptsToLoad += 1;
				// eslint-disable-next-line no-await-in-loop
				await this._handleCommonBlockError(err);
				this.logger.warn(
					{ error: err },
					'Failed to load blocks from the network.',
				);
			}
		}
	}

	async _handleCommonBlockError(error) {
		if (!(error instanceof CommonBlockError)) {
			return;
		}
		if (this.peersModule.isPoorConsensus(this.blocksModule.broadhash)) {
			this.logger.debug('Perform chain recovery due to poor consensus');
			try {
				// eslint-disable-next-line no-await-in-loop
				await this.blocksModule.recoverChain();
			} catch (recoveryError) {
				this.logger.error(
					{ error: recoveryError },
					'Chain recovery failed after failing to load blocks while network consensus was low.',
				);
			}
		}
	}
}

// Export
module.exports = { Loader };
