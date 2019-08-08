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

const { StateStore } = require('../state_store');
const {
	FORK_STATUS_DISCARD,
	FORK_STATUS_REVERT,
	FORK_STATUS_SYNC,
} = require('../blocks');

class Processor {
	constructor({ channel, storage, logger, blocks }) {
		this.channel = channel;
		this.storage = storage;
		this.logger = logger;
		this.blocks = blocks;
		this.processors = {};
	}

	// register a block processor with particular version
	register(processor, { matcher }) {
		this.processors[processor.VERSION] = processor;
	}

	// process is for standard processing of block, especially when received from network
	async process(block) {
		const blockProcessor = this._getBlockProcessor(block);
		const { lastBlock } = this.blocks;
		blockProcessor.validateNew.exec({
			block,
			lastBlock,
			channel: this.channel,
		});
		this._validate(block, blockProcessor);
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

	// validate checks the block statically
	validate(block) {
		const blockProcessor = this._getBlockProcessor(block);
		this._validate(block, blockProcessor);
	}

	// processValidated processes a block assuming that statically it's valid
	async processValidated(block) {
		const blockProcessor = this._getProcessor(block);
		return this._processValidated(block, blockProcessor);
	}

	// apply processes a block assuming that statically it's valid without saving a block
	async apply(block) {
		const blockProcessor = this._getProcessor(block);
		return this._processValidated(block, blockProcessor, { skipSave: true });
	}

	_validate(block, processor) {
		const { lastBlock } = this.blocks;
		const blockBytes = processor.getBytes.exec({ block });
		processor.validate.exec({
			block,
			lastBlock,
			blockBytes,
			channel: this.channel,
		});
	}

	async _processValidated(block, processor, { skipSave } = {}) {
		const blockBytes = processor.getBytes.exec({ block });
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		stateStore.createSnapshot();
		await processor.verify.exec({
			block,
			blockBytes,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		stateStore.restoreSnapshot();
		await processor.apply.exec({
			block,
			blockBytes,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
			if (!skipSave) {
				await this.blocks.create(block, tx);
			}
		});
	}

	async _apply(block, processor) {
		const blockBytes = processor.getBytes.exec({ block });
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		stateStore.createSnapshot();
		await processor.verify.exec({
			block,
			blockBytes,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		stateStore.restoreSnapshot();
		await processor.apply.exec({
			block,
			blockBytes,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
		});
	}

	async _revert(block, processor) {
		const stateStore = new StateStore(this.storage);
		const { lastBlock } = this.blocks;
		await processor.undo.exec({
			block,
			lastBlock,
			stateStore,
			channel: this.channel,
		});
		await this.storage.begin(async tx => {
			await stateStore.finalize(tx);
			await this.blocks.deleteBlock(block, tx);
		});
	}

	_getBlockProcessor(block) {
		const { version } = block;
		if (!this.processors[version]) {
			throw new Error('Block processing version is not registered');
		}
		return this.processors[version];
	}
}

module.exports = {
	Processor,
};
