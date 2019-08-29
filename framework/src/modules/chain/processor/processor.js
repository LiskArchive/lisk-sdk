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
		// do init check for block state. We need to load the blockchain
		const blockProcessor = this._getBlockProcessor(genesisBlock);
		await this._processGenesis(genesisBlock, blockProcessor, {
			skipSave: false,
		});
		await blockProcessor.init.run();
		this.logger.info('Blockchain ready');
	}

	// process is for standard processing of block, especially when received from network
	async process(block) {
		return this.sequence.add(async () => {
			const blockProcessor = this._getBlockProcessor(block);
			const { lastBlock } = this.blocksModule;

			const forkStatus = await blockProcessor.fork.run({
				block,
				lastBlock,
			});

			if (!forkStatusList.includes(forkStatus)) {
				throw new Error('Unknown fork status');
			}

			this.logger.debug({ id: block.id }, 'Received block');
			// Discarding block
			if (forkStatus === FORK_STATUS_IDENTICAL_BLOCK) {
				this.logger.debug({ id: block.id }, 'Block already processed');
				return;
			}
			if (forkStatus === FORK_STATUS_DISCARD) {
				this.logger.info({ id: block.id }, 'Discarding block');
				return;
			}
			if (forkStatus === FORK_STATUS_DOUBLE_FORGING) {
				this.logger.info(
					{ id: block.id, generatorPublicKey: block.generatorPublicKey },
					'Discarding block due to double forging',
				);
				return;
			}
			// Discard block and move to different chain
			if (forkStatus === FORK_STATUS_DIFFERENT_CHAIN) {
				this.channel.publish('chain:processor:sync');
				return;
			}
			// Replacing a block
			if (forkStatus === FORK_STATUS_TIE_BREAK) {
				this.logger.info({ id: lastBlock.id }, 'Reverting block');
				await blockProcessor.validateNew.run({
					block,
					lastBlock,
				});
				await this._validate(block, lastBlock, blockProcessor);
				const previousLastBlock = cloneDeep(lastBlock);
				await this._revert(lastBlock, blockProcessor);
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

			// Process block as it's valid: FORK_STATUS_VALID_BLOCK
			await blockProcessor.validateNew.run({
				block,
				lastBlock,
			});
			await this._validate(block, lastBlock, blockProcessor);
			await this._processValidated(block, lastBlock, blockProcessor);
		});
	}

	async create(values) {
		const heghestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[heghestVersion];
		return processor.create.run(values);
	}

	// validate checks the block statically
	async validate(block) {
		const blockProcessor = this._getBlockProcessor(block);
		const { lastBlock } = this.blocksModule;
		await this._validate(block, lastBlock, blockProcessor);
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block) {
		return this.sequence.add(async () => {
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
			const blockProcessor = this._getBlockProcessor(lastBlock);
			await this._revert(lastBlock, blockProcessor);
		});
	}

	async applyGenesisBlock(block, skipSave = false) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processGenesis(block, blockProcessor, { skipSave });
	}

	// eslint-disable-next-line class-methods-use-this
	async _validate(block, lastBlock, processor) {
		await processor.validate.run({
			block,
			lastBlock,
		});
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
				tx,
			});
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

	async _revert(block, processor) {
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
