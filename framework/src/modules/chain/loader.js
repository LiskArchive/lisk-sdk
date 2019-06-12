/*
 * Copyright © 2018 Lisk Foundation
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
const { promisify } = require('util');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const { validateTransactions } = require('./transactions');
const { convertErrorsToString } = require('./helpers/error_handlers');
const definitions = require('./schema/definitions');

// Private fields
let components;
let modules;
let library;
const __private = {};

__private.isActive = false;
__private.lastBlock = null;
__private.genesisBlock = null;
__private.total = 0;
__private.blocksToSync = 0;
__private.retries = 5;

/**
 * Main loader methods. Initializes library with scope content.
 * Calls private function initialize.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires helpers/jobs_queue
 * @requires logic/peer
 * @param {function} cb - Callback function
 * @param {scope} scope - App instance
 */
class Loader {
	constructor(scope) {
		library = {
			channel: scope.channel,
			logger: scope.components.logger,
			storage: scope.components.storage,
			schema: scope.schema,
			sequence: scope.sequence,
			bus: scope.bus,
			genesisBlock: scope.genesisBlock,
			balancesSequence: scope.balancesSequence,
			config: {
				loading: {
					loadPerIteration: scope.config.loading.loadPerIteration,
					rebuildUpToRound: scope.config.loading.rebuildUpToRound,
				},
				syncing: {
					active: scope.config.syncing.active,
				},
			},
		};
		__private.lastBlock = library.genesisBlock;
		__private.genesisBlock = library.genesisBlock;
	}

	/**
	 * Checks if private constant syncIntervalId has value.
	 *
	 * @returns {boolean} True if syncIntervalId has value
	 */
	// eslint-disable-next-line class-methods-use-this
	syncing() {
		return !!__private.isActive;
	}

	/**
	 * Checks if `modules` is loaded.
	 *
	 * @returns {boolean} True if `modules` is loaded
	 */
	// eslint-disable-next-line class-methods-use-this
	isLoaded() {
		return !!modules;
	}

	/**
	 * Checks private constant active.
	 *
	 * @returns {boolean} False if not loaded
	 */
	// eslint-disable-next-line class-methods-use-this
	isActive() {
		return !!__private.isActive;
	}

	/**
	 * Pulls Transactions and signatures.
	 */
	// eslint-disable-next-line class-methods-use-this
	loadTransactionsAndSignatures() {
		async.series(
			{
				loadTransactions(seriesCb) {
					return async.retry(
						__private.retries,
						__private.getTransactionsFromNetwork,
						err => {
							if (err) {
								library.logger.error('Unconfirmed transactions loader', err);
							}

							return setImmediate(seriesCb);
						}
					);
				},
				loadSignatures(seriesCb) {
					return async.retry(
						__private.retries,
						__private.getSignaturesFromNetwork,
						err => {
							if (err) {
								library.logger.error('Signatures loader', err);
							}

							return setImmediate(seriesCb);
						}
					);
				},
			},
			err => {
				library.logger.trace('Transactions and signatures pulled', err);
			}
		);
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
	// eslint-disable-next-line class-methods-use-this
	async sync() {
		library.logger.info('Starting sync');
		if (components.cache.ready) {
			components.cache.disable();
		}

		__private.isActive = true;

		const consensusBefore = await modules.peers.calculateConsensus();

		library.logger.debug(
			`Establishing broadhash consensus before sync: ${consensusBefore} %`
		);

		await __private.loadBlocksFromNetwork();

		const consensusAfter = await modules.peers.calculateConsensus();

		library.logger.debug(
			`Establishing broadhash consensus after sync: ${consensusAfter} %`
		);
		__private.isActive = false;
		__private.blocksToSync = 0;

		library.logger.info('Finished sync');

		if (components.cache.ready) {
			components.cache.enable();
		}
	}

	/**
	 * It assigns components & modules from scope to private constants.
	 *
	 * @param {components, modules} scope modules & components
	 * @returns {function} Calling __private.loadBlockChain
	 * @todo Add description for the params
	 */
	// eslint-disable-next-line class-methods-use-this
	onBind(scope) {
		components = {
			cache: scope.components ? scope.components.cache : undefined,
		};

		modules = {
			transactionPool: scope.modules.transactionPool,
			interfaceAdapters: scope.modules.interfaceAdapters,
			blocks: scope.modules.blocks,
			peers: scope.modules.peers,
		};
	}
}

/**
 * Loads signatures from network.
 * Processes each signature from the network.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 */
__private.getSignaturesFromNetwork = async () => {
	library.logger.info('Loading signatures from the network');

	// TODO: Add target module to procedure name. E.g. chain:getSignatures
	const { data: result } = await library.channel.invoke('network:request', {
		procedure: 'getSignatures',
	});

	const validate = promisify(library.schema.validate.bind(library.schema));
	await validate(result, definitions.WSSignaturesResponse);

	const { signatures } = result;
	const sequenceAdd = promisify(library.sequence.add.bind(library.sequence));

	await sequenceAdd(async addSequenceCb => {
		const signatureCount = signatures.length;
		for (let i = 0; i < signatureCount; i++) {
			const signaturePacket = signatures[i];
			const subSignatureCount = signaturePacket.signatures.length;
			for (let j = 0; j < subSignatureCount; j++) {
				const signature = signaturePacket.signatures[j];

				// eslint-disable-next-line no-await-in-loop
				await modules.transactionPool.getTransactionAndProcessSignature({
					signature,
					transactionId: signature.transactionId,
				});
			}
		}
		addSequenceCb();
	});
};

/**
 * Loads transactions from the network:
 * - Validates each transaction from the network and applies a penalty if invalid.
 * - Calls processUnconfirmedTransaction for each transaction.
 *
 * @private
 * @param {function} cb
 * @returns {setImmediateCallback} cb, err
 * @todo Add description for the params
 * @todo Missing error propagation when calling balancesSequence.add
 */
__private.getTransactionsFromNetwork = async () => {
	library.logger.info('Loading transactions from the network');

	// TODO: Add target module to procedure name. E.g. chain:getTransactions
	const { data: result } = await library.channel.invoke('network:request', {
		procedure: 'getTransactions',
	});

	const validate = promisify(library.schema.validate.bind(library.schema));
	await validate(result, definitions.WSTransactionsResponse);

	const transactions = result.transactions.map(tx =>
		modules.interfaceAdapters.transactions.fromJson(tx)
	);

	try {
		const { transactionsResponses } = validateTransactions()(transactions);
		const invalidTransactionResponse = transactionsResponses.find(
			transactionResponse => transactionResponse.status !== TransactionStatus.OK
		);
		if (invalidTransactionResponse) {
			throw invalidTransactionResponse.errors;
		}
	} catch (errors) {
		const error =
			Array.isArray(errors) && errors.length > 0 ? errors[0] : errors;
		library.logger.debug('Transaction normalization failed', {
			id: error.id,
			err: error.toString(),
			module: 'loader',
		});
		throw error;
	}

	const transactionCount = transactions.length;
	for (let i = 0; i < transactionCount; i++) {
		const transaction = transactions[i];

		const balancesSequenceAdd = promisify(
			library.balancesSequence.add.bind(library.balancesSequence)
		);
		try {
			/* eslint-disable-next-line */
			await balancesSequenceAdd(async addSequenceCb => {
				transaction.bundled = true;
				try {
					await modules.transactionPool.processUnconfirmedTransaction(
						transaction
					);
					setImmediate(addSequenceCb);
				} catch (err) {
					setImmediate(addSequenceCb, err);
				}
			});
		} catch (error) {
			library.logger.error(error);
			throw error;
		}
	}
};

/**
 * Loads blocks from network.
 *
 * @private
 * @returns {Promise} void
 * @todo Add description for the params
 */
__private.getBlocksFromNetwork = async () => {
	const lastBlock = modules.blocks.lastBlock;
	// TODO: If there is an error, invoke the applyPenalty action on the Network module once it is implemented.
	// TODO: Rename procedure to include target module name. E.g. chain:blocks
	let data;
	try {
		const response = await library.channel.invoke('network:request', {
			procedure: 'blocks',
			data: {
				lastBlockId: lastBlock.id,
			},
		});
		data = response.data;
	} catch (p2pError) {
		library.logger.error('Failed to load block from network', p2pError);
		return [];
	}

	if (!data) {
		throw new Error('Received an invalid blocks response from the network');
	}
	// Check for strict equality for backwards compatibility reasons.
	// The misspelled data.sucess is required to support v1 nodes.
	// TODO: Remove the misspelled data.sucess === false condition once enough nodes have migrated to v2.
	if (data.success === false || data.sucess === false) {
		throw new Error(
			`Peer did not have a matching lastBlockId. ${data.message}`
		);
	}
	return data.blocks;
};

/**
 * Validate blocks from the network.
 *
 * @private
 * @returns {Promise} void
 * @todo Add description for the params
 */
__private.validateBlocks = async blocks => {
	const report = library.schema.validate(blocks, definitions.WSBlocksList);

	if (!report) {
		throw new Error('Received invalid blocks data');
	}

	return blocks;
};

/**
 * Loads valided blocks from network.
 *
 * @private
 * @returns {Promise} void
 * @todo Add description for the params
 */
__private.getValidatedBlocksFromNetwork = async blocks => {
	const lastBlock = modules.blocks.lastBlock;
	try {
		const lastValidBlock = await modules.blocks.loadBlocksFromNetwork(blocks);
		__private.blocksToSync = lastValidBlock.height;

		return lastValidBlock.id === lastBlock.id;
	} catch (loadBlocksFromNetworkErr) {
		if (modules.peers.isPoorConsensus()) {
			library.logger.debug('Perform chain recovery due to poor consensus');
			try {
				await modules.blocks.deleteLastBlockAndGet();
			} catch (recoveryError) {
				throw new Error(
					`Failed chain recovery after failing to load blocks while network consensus was low. ${recoveryError}`
				);
			}
			throw new Error(
				'Failed chain recovery after failing to load blocks while network consensus was low.'
			);
		}
		library.logger.error(
			'Failed to process block from network',
			loadBlocksFromNetworkErr
		);
		throw new Error(
			`Failed to load blocks from the network. ${loadBlocksFromNetworkErr}`
		);
	}
};
/**
 * Loads blocks from network.
 *
 * @private
 * @returns {Promise} void
 * @todo Add description for the params
 */
__private.loadBlocksFromNetwork = async () => {
	// Number of failed attempts to load from the network.
	let failedAttemptsToLoad = 0;
	// If True, own node's db contains all the blocks from the last block request.
	let loaded = false;
	while (!loaded && failedAttemptsToLoad < 5) {
		try {
			// eslint-disable-next-line no-await-in-loop
			const blocksFromNetwork = await __private.getBlocksFromNetwork();
			// eslint-disable-next-line no-await-in-loop
			const blocksAfterValidate = await __private.validateBlocks(
				blocksFromNetwork
			);
			// eslint-disable-next-line no-await-in-loop
			loaded = await __private.getValidatedBlocksFromNetwork(
				blocksAfterValidate
			);
			// Reset counter after a batch of blocks was successfully loaded from the network
			failedAttemptsToLoad = 0;
		} catch (err) {
			if (err) {
				failedAttemptsToLoad += 1;
				library.logger.error(convertErrorsToString(err));
			}
		}
	}
};

// Export
module.exports = Loader;
