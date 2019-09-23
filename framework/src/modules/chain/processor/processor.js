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
			'initializing processor',
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

	// process is for standard processing of block, especially when received from network
	async process(block) {
		return this.sequence.add(async () => {
			this.logger.debug({ id: block.id }, 'starting to process block');
			const blockProcessor = this._getBlockProcessor(block);
			const { lastBlock } = this.blocksModule;

			const forkStatus = await blockProcessor.forkStatus.run({
				block,
				lastBlock,
			});

			if (!forkStatusList.includes(forkStatus)) {
				throw new Error('Unknown fork status');
			}

			// Discarding block
			if (forkStatus === FORK_STATUS_IDENTICAL_BLOCK) {
				this.logger.debug({ id: block.id }, 'Block already processed');
				return;
			}
			if (forkStatus === FORK_STATUS_DISCARD) {
				this.logger.debug({ id: block.id }, 'Discarding block');
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
				this.logger.debug({ id: block.id }, 'Detected different chain to sync');
				this.channel.publish('chain:processor:sync');
				return;
			}
			// Replacing a block
			if (forkStatus === FORK_STATUS_TIE_BREAK) {
				this.logger.info({ id: lastBlock.id }, 'Received tie breaking block');
				await blockProcessor.validateNew.run({
					block,
					lastBlock,
				});
				await blockProcessor.validate.run({
					block,
					lastBlock,
				});
				const previousLastBlock = cloneDeep(lastBlock);
				await this._deleteBlock(lastBlock, blockProcessor);
				const newLastBlock = this.blocksModule.lastBlock;
				try {
					await this._processValidated(block, newLastBlock, blockProcessor);
				} catch (error) {
					this.logger.error(
						{ id: block.id, previousBlockId: previousLastBlock.id, error },
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
			// Process block as it's valid: FORK_STATUS_VALID_BLOCK
			await blockProcessor.validateNew.run({
				block,
				lastBlock,
			});
			await blockProcessor.validate.run({
				block,
				lastBlock,
			});
			await this._processValidated(block, lastBlock, blockProcessor);
		});
	}

	async create(values) {
		this.logger.debug({ data: values }, 'creating block');
		const highestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[highestVersion];
		return processor.create.run(values);
	}

	// validate checks the block statically
	async validate(block, { lastBlock } = this.blocksModule) {
		this.logger.debug(
			{ id: block.id, height: block.height },
			'validating block',
		);
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validate.run({
			block,
			lastBlock,
		});
	}

	async validateDetached(block) {
		this.logger.debug({ id: block.id }, 'validating detached block');
		const blockProcessor = this._getBlockProcessor(block);
		await blockProcessor.validateDetached.run({
			block,
		});
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block) {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.id, height: block.height },
				'processing validated block',
			);
			const { lastBlock } = this.blocksModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipBroadcast: true,
			});
		});
	}

	// apply processes a block assuming that statically it's valid without saving a block
	async apply(block) {
		return this.sequence.add(async () => {
			this.logger.debug(
				{ id: block.id, height: block.height },
				'applying block',
			);
			const { lastBlock } = this.blocksModule;
			const blockProcessor = this._getBlockProcessor(block);
			return this._processValidated(block, lastBlock, blockProcessor, {
				skipSave: true,
				skipBroadcast: true,
			});
		});
	}

	async deleteLastBlock() {
		return this.sequence.add(async () => {
			const { lastBlock } = this.blocksModule;
			this.logger.debug(
				{ id: lastBlock.id, height: lastBlock.height },
				'deleting last block',
			);
			const blockProcessor = this._getBlockProcessor(lastBlock);
			await this._deleteBlock(lastBlock, blockProcessor);
		});
	}

	async applyGenesisBlock(block) {
		this.logger.info({ id: block.id }, 'applying genesis block');
		const blockProcessor = this._getBlockProcessor(block);
		return this._processGenesis(block, blockProcessor, { skipSave: true });
	}

	async _processValidated(
		block,
		lastBlock,
		processor,
		{ skipSave, skipBroadcast } = {},
	) {
		await this.storage.entities.Block.begin('Chain:processBlock', async tx => {
			await processor.verify.run({
				block,
				lastBlock,
				skipExistingCheck: skipSave,
				tx,
			});
			if (!skipBroadcast) {
				this.channel.publish('chain:processor:broadcast', {
					block: cloneDeep(block),
				});
			}
			await processor.apply.run({
				block,
				lastBlock,
				skipExistingCheck: skipSave,
				tx,
			});
			// TODO: move save to inside below condition after moving tick to the block_processor
			await this.blocksModule.save({ block, tx, skipSave });
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
					tx,
				});

				await this.blocksModule.save({
					block,
					tx,
					skipSave,
				});

				return block;
			},
		);
	}

	async _deleteBlock(block, processor) {
		await this.storage.entities.Block.begin('Chain:revertBlock', async tx => {
			await processor.undo.run({
				block,
				tx,
			});
			await this.blocksModule.remove({ block, tx });
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
