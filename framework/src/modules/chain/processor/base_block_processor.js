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

const { Pipeline } = require('./pipeline');

class BaseBlockProcessor {
	constructor() {
		/**
		 * init is called once when the application starts
		 * @return void
		 */
		this.init = new Pipeline();

		/**
		 * create is called for forging a block
		 * @return valid block
		 */
		this.create = new Pipeline();

		/**
		 * fork should return a valid fork status
		 * @return void
		 */
		this.forkStatus = new Pipeline();

		/**
		 * validate should statically check the block data without history of chain
		 * @return void
		 */
		this.validate = new Pipeline();
		this.validateNew = new Pipeline();

		/**
		 * verify should check the block data with history of chain
		 * @return void
		 */
		this.verify = new Pipeline();

		/**
		 * apply should apply a block to a new state
		 * @return void
		 */
		this.apply = new Pipeline();

		/**
		 * applyGenesis should apply a genesis block to a new state
		 * @return void
		 */
		this.applyGenesis = new Pipeline();

		/**
		 * undo should revert the changes done by apply
		 * @return void
		 */
		this.undo = new Pipeline();
	}

	// eslint-disable-next-line class-methods-use-this
	get version() {
		throw new Error('Version must be implemented');
	}

	_validateVersion({ block }) {
		if (block.version !== this.version) {
			throw new Error('Invalid version');
		}
	}
}

module.exports = {
	BaseBlockProcessor,
};
