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

const {
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
} = require('../blocks');

class Processor {
	constructor({ channel, storage, logger, blocksModule }) {
		this.channel = channel;
		this.storage = storage;
		this.logger = logger;
		this.blocksModule = blocksModule;
		this.processors = {};
		this.matchers = {};
	}

	// register a block processor with particular version
	register(processor, { matcher } = {}) {
		this.processors[processor.version] = processor;
		this.matchers[processor.version] = matcher || (() => true);
	}

	// eslint-disable-next-line no-unused-vars,class-methods-use-this
	async init(genesisBlock) {
		// do init check for block state
	}

	// process is for standard processing of block, especially when received from network
	async process(block) {
		const blockProcessor = this._getBlockProcessor(block);
		const { lastBlock } = this.blocksModule;
		blockProcessor.validateNew.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
		await this._validate(block, blockProcessor);
		const forkStatus = blockProcessor.fork.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
		if (forkStatus === FORK_STATUS_DISCARD) {
			return;
		}

		if (forkStatus === FORK_STATUS_SYNC) {
			this.channel.publish('chain:process:sync');
			return;
		}

		if (forkStatus === FORK_STATUS_REVERT) {
			await this._revert(lastBlock, blockProcessor);
		}

		await this._processValidated(block, blockProcessor);
	}

	create(values) {
		const heghestVersion = Math.max.apply(null, Object.keys(this.processors));
		const processor = this.processors[heghestVersion];
		return processor.create.execSync(values);
	}

	// validate checks the block statically
	async validate(block) {
		const blockProcessor = this._getBlockProcessor(block);
		await this._validate(block, blockProcessor);
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processValidated(block, blockProcessor, {
			skipBroadcast: true,
		});
	}

	// apply processes a block assuming that statically it's valid without saving a block
	async apply(block) {
		const blockProcessor = this._getBlockProcessor(block);
		return this._processValidated(block, blockProcessor, {
			skipSave: true,
			skipBroadcast: true,
		});
	}

	async _validate(block, processor) {
		const { lastBlock } = this.blocksModule;
		const blockBytes = processor.getBytes.execSync({ block });
		await processor.validate.exec({
			block,
			lastBlock,
			blockBytes,
			channel: this.channel,
		});
	}

	async _processValidated(block, processor, { skipSave, skipBroadcast } = {}) {
		const blockBytes = processor.getBytes.exec({ block });
		const { lastBlock } = this.blocksModule;
		return this.storage.entities.Block.begin('Chain:processBlock', async tx => {
			await processor.verify.exec({
				block,
				blockBytes,
				lastBlock,
				tx,
				channel: this.channel,
			});
			if (!skipBroadcast) {
				this.blocksModule.broadcast(block);
			}
			await processor.apply.exec({
				block,
				blockBytes,
				lastBlock,
				tx,
				channel: this.channel,
			});
			if (!skipSave) {
				await this.blocksModule.save({ block, tx });
			}
			return block;
		});
	}

	async _revert(block, processor) {
		await this.storage.entities.Block.begin('Chain:revertBlock', async tx => {
			const { lastBlock } = this.blocksModule;
			await processor.undo.exec({
				block,
				lastBlock,
				tx,
				channel: this.channel,
			});
			await this.blocksModule.remove({ block, tx });
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
