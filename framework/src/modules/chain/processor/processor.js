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

const { cloneDeep } = require('lodash');
const {
	StateStore,
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
} = require('../blocks');
const { Sequence } = require('../utils/sequence');

const forkStatusList = [
	FORK_STATUS_IDENTICAL_BLOCK,
	FORK_STATUS_VALID_BLOCK,
	FORK_STATUS_DOUBLE_FORGING,
	FORK_STATUS_TIE_BREAK,
	FORK_STATUS_DIFFERENT_CHAIN,
	FORK_STATUS_DISCARD,
];

class Processor {
	constructor({ channel, storage, logger, blocksModule }) {
		this.channel = channel;
		this.storage = storage;
		this.logger = logger;
		this.blocksModule = blocksModule;
		this.sequence = new Sequence();
		this.processors = {};
		this.matchers = {};
	}

	// register a block processor with particular version
	register(processor, { matcher } = {}) {
		if (typeof processor.version !== 'number') {
			throw new Error('version property must exist for processor');
		}
		this.processors[processor.version] = processor;
		this.matchers[processor.version] = matcher || (() => true);
	}

	// eslint-disable-next-line no-unused-vars,class-methods-use-this
	async init(genesisBlock) {
		this.logger.debug(
			{ id: genesisBlock.id, payloadHash: genesisBlock.payloadHash },
			'Initializing processor',
		);
		// do init check for block state. We need to load the blockchain
		const blockProcessor = this._getBlockProcessor(genesisBlock);
		await this._processGenesis(genesisBlock, blockProcessor, {
			skipSave: false,
		});
		await this.blocksModule.init();
		for (const processor of Object.values(this.processors)) {
			await processor.init.run();
		}
		this.logger.info('Blockchain ready');
	}

	// Serialize a block instance to a JSON format of the block
	async serialize(blockInstance) {
		const blockProcessor = this._getBlockProcessor(blockInstance);
		return blockProcessor.serialize.run({ block: blockInstance });
	}

	// DeSerialize a block instance to a JSON format of the block
	async deserialize(blockJSON) {
		const blockProcessor = this._getBlockProcessor(blockJSON);
		return blockProcessor.deserialize.run({ block: blockJSON });
	}

	// process is for standard processing of block, especially when received from network
	async process(block, { peerId } = {}) {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.id, height: block.height },
				'Starting to process block',
			);
			const blockProcessor = this._getBlockProcessor(block);
			const { lastBlock } = this.blocksModule;

			const forkStatus = await blockProcessor.forkStatus.run({
				block,
				lastBlock,
			});

			if (!forkStatusList.includes(forkStatus)) {
				this.logger.debug(
					{ status: forkStatus, blockId: block.id },
					'Unknown fork status',
				);
				throw new Error('Unknown fork status');
			}

			// Discarding block
			if (forkStatus === FORK_STATUS_DISCARD) {
				this.logger.debug(
					{ id: block.id, height: block.height },
					'Discarding block',
				);
				return;
			}
			if (forkStatus === FORK_STATUS_IDENTICAL_BLOCK) {
				this.logger.debug(
					{ id: block.id, height: block.height },
					'Block already processed',
				);
				return;
			}
			if (forkStatus === FORK_STATUS_DOUBLE_FORGING) {
				this.logger.warn(
					{ id: block.id, generatorPublicKey: block.generatorPublicKey },
					'Discarding block due to double forging',
				);
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === FORK_STATUS_DIFFERENT_CHAIN) {
				this.logger.debug(
					{ id: block.id, height: block.height },
					'Detected different chain to sync',
				);
				this.channel.publish('chain:processor:sync', { block, peerId });
				return;
			}
			// Replacing a block
			if (forkStatus === FORK_STATUS_TIE_BREAK) {
				this.logger.info(
					{ id: lastBlock.id, height: lastBlock.height },
					'Received tie breaking block',
				);
				await blockProcessor.validate.run({
					block,
					lastBlock,
				});
				const previousLastBlock = cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock, blockProcessor);
				const newLastBlock = this.blocksModule.lastBlock;
				try {
					await this._processValidated(block, newLastBlock, blockProcessor);
				} catch (err) {
					this.logger.error(
						{ id: block.id, previousBlockId: previousLastBlock.id, err },
						'Failed to apply newly received block. restoring previous block.',
					);
					await this._processValidated(
						previousLastBlock,
						newLastBlock,
						blockProcessor,
						{ skipBroadcast: true },
					);
				}
				return;
			}

			this.logger.debug(
				{ id: block.id, height: block.height },
				'Processing valid block',
			);
			await blockProcessor.validate.run({
				block,
				lastBlock,
			});
			await this._processValidated(block, lastBlock, blockProcessor);
		});
	}

	async forkStatus(receivedBlock, lastBlock) {
		const blockProcessor = this._getBlockProcessor(receivedBlock);

		return blockProcessor.forkStatus.run({
			block: receivedBlock,
			lastBlock: lastBlock || this.blocksModule.lastBlock,
		});
	}

	async create(values) {
		this.logger.trace({ data: values }, 'Creating block');
		const highestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[highestVersion];
		return processor.create.run(values);
	}

	// validate checks the block statically
	async validate(block, { lastBlock } = this.blocksModule) {
		this.logger.debug(
			{ id: block.id, height: block.height },
			'Validating block',
		);
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validate.run({
			block,
			lastBlock,
		});
	}

	async validateDetached(block) {
		this.logger.debug(
			{ id: block.id, height: block.height },
			'Validating detached block',
		);
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validateDetached.run({
			block,
		});
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block, { removeFromTempTable = false } = {}) {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.id, height: block.height },
				'Processing validated block',
			);
			const { lastBlock } = this.blocksModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipBroadcast: true,
				removeFromTempTable,
			});
		});
	}

	// apply processes a block assuming that statically it's valid without saving a block
	async apply(block) {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.id, height: block.height },
				'Applying block',
			);
			const { lastBlock } = this.blocksModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipSave: true,
				skipBroadcast: true,
			});
		});
	}

	async deleteLastBlock({ saveTempBlock = false } = {}) {
		return this.sequence.add(async () => {
			const { lastBlock } = this.blocksModule;
			this.logger.debug(
				{ id: lastBlock.id, height: lastBlock.height },
				'Deleting last block',
			);
			const blockProcessor = this._getBlockProcessor(lastBlock);
			await this._deleteBlock(lastBlock, blockProcessor, saveTempBlock);
			return this.blocksModule.lastBlock;
		});
	}

	async applyGenesisBlock(block) {
		this.logger.info({ id: block.id }, 'Applying genesis block');
		const blockProcessor = this._getBlockProcessor(block);
		return this._processGenesis(block, blockProcessor, { skipSave: true });
	}

	async _processValidated(
		block,
		lastBlock,
		processor,
		{ skipSave, skipBroadcast, removeFromTempTable = false } = {},
	) {
		await this.storage.entities.Block.begin('Chain:processBlock', async tx => {
			const stateStore = new StateStore(this.storage, { tx });
			await processor.verify.run({
				block,
				lastBlock,
				skipExistingCheck: skipSave,
				stateStore,
				tx,
			});

			if (!skipBroadcast) {
				this.channel.publish('chain:processor:broadcast', {
					block: cloneDeep(block),
				});
			}

			if (!skipSave) {
				const blockJSON = await this.serialize(block);
				// TODO: After moving everything to state store, save should get the state store and finalize the state store
				await this.blocksModule.save(blockJSON, tx);
			}

			// Apply should always be executed after save as it performs database calculations
			// i.e. Dpos.apply expects to have this processing block in the database
			await processor.apply.run({
				block,
				lastBlock,
				skipExistingCheck: skipSave,
				stateStore,
				tx,
			});

			if (removeFromTempTable) {
				await this.blocksModule.removeBlockFromTempTable(block.id, tx);
				this.logger.debug(
					{ id: block.id, height: block.height },
					'Removed block from temp_block table',
				);
			}

			// Should only publish 'chain:processor:newBlock' if saved AND applied successfully
			if (!skipSave) {
				this.channel.publish('chain:processor:newBlock', {
					block: cloneDeep(block),
				});
			}

			return block;
		});
	}

	async _processGenesis(block, processor, { skipSave } = { skipSave: false }) {
		return this.storage.entities.Block.begin(
			'Chain:processGenesisBlock',
			async tx => {
				const stateStore = new StateStore(this.storage, { tx });
				// Check if genesis block ID already exists in the database
				const isPersisted = await this.blocksModule.exists(block);

				if (skipSave && !isPersisted) {
					throw new Error(
						'Genesis block is not persisted but skipping to save',
					);
				}

				// If block is persisted and we don't want to save, it means that we are rebuilding. Therefore, don't return without applying block.
				if (isPersisted && !skipSave) {
					return block;
				}

				await processor.applyGenesis.run({
					block,
					stateStore,
					tx,
				});

				if (!skipSave) {
					const blockJSON = await this.serialize(block);
					// TODO: After moving everything to state store, save should get the state store and finalize the state store
					await this.blocksModule.save(blockJSON, tx);
				}

				return block;
			},
		);
	}

	async _deleteBlock(block, processor, saveTempBlock = false) {
		await this.storage.entities.Block.begin('Chain:revertBlock', async tx => {
			const stateStore = new StateStore(this.storage, { tx });
			await processor.undo.run({
				block,
				stateStore,
				tx,
			});
			const blockJSON = await this.serialize(block);
			await this.blocksModule.remove(block, blockJSON, tx, { saveTempBlock });
			this.channel.publish('chain:processor:deleteBlock', {
				block: cloneDeep(block),
			});
		});
	}

	_getBlockProcessor(block) {
		const { version } = block;
		if (!this.processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		// Sort in asc order
		const matcherVersions = Object.keys(this.matchers).sort((a, b) => a - b);
		// eslint-disable-next-line no-restricted-syntax
		for (const matcherVersion of matcherVersions) {
			const matcher = this.matchers[matcherVersion];
			if (matcher(block)) {
				return this.processors[matcherVersion];
			}
		}
		throw new Error('No matching block processor found');
	}
}

module.exports = {
	Processor,
};
