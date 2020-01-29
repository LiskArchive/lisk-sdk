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

const { config: DefaultConfig } = require('./defaults');
const Chain = require('./chain');
const { migrations } = require('./components');
const BaseModule = require('../../modules/base_module');

/* eslint-disable class-methods-use-this */

class ChainModule extends BaseModule {
	constructor(options) {
		super(options);

		this.chain = null;
	}

	static get alias() {
		return 'chain';
	}

	static get info() {
		return {
			author: 'LiskHQ',
			version: '0.1.0',
			name: 'lisk-framework-chain',
		};
	}

	static get migrations() {
		return migrations;
	}

	static get defaults() {
		return DefaultConfig;
	}

	get events() {
		return [
			'bootstrap',
			'blocks:change',
			'transactions:confirmed:change',
			'signature:change',
			'transactions:change',
			'rounds:change',
			'multisignatures:signature:change',
			'multisignatures:change',
			'delegates:fork',
			'loader:sync',
			'dapps:change',
			'rebuild',
			'processor:sync',
			'processor:deleteBlock',
			'processor:broadcast',
			'processor:newBlock',
		];
	}

	get actions() {
		return {
			calculateSupply: {
				handler: action => this.chain.actions.calculateSupply(action),
			},
			calculateMilestone: {
				handler: action => this.chain.actions.calculateMilestone(action),
			},
			calculateReward: {
				handler: action => this.chain.actions.calculateReward(action),
			},
			getForgerPublicKeysForRound: {
				handler: async action =>
					this.chain.actions.getForgerPublicKeysForRound(action),
			},
			updateForgingStatus: {
				handler: async action => this.chain.actions.updateForgingStatus(action),
			},
			postSignature: {
				handler: async action => this.chain.actions.postSignature(action),
			},
			getForgingStatusForAllDelegates: {
				handler: async () =>
					this.chain.actions.getForgingStatusForAllDelegates(),
			},
			getTransactionsFromPool: {
				handler: async action =>
					this.chain.actions.getTransactionsFromPool(action),
			},
			getTransactions: {
				handler: async action => this.chain.actions.getTransactions(action),
				isPublic: true,
			},
			getSignatures: {
				handler: async () => this.chain.actions.getSignatures(),
				isPublic: true,
			},
			postTransaction: {
				handler: async action => this.chain.actions.postTransaction(action),
			},
			getSlotNumber: {
				handler: async action => this.chain.actions.getSlotNumber(action),
			},
			calcSlotRound: {
				handler: async action => this.chain.actions.calcSlotRound(action),
			},
			getNodeStatus: {
				handler: async () => this.chain.actions.getNodeStatus(),
			},
			getLastBlock: {
				handler: async () => this.chain.actions.getLastBlock(),
				isPublic: true,
			},
			getBlocksFromId: {
				handler: async action => this.chain.actions.getBlocksFromId(action),
				isPublic: true,
			},
			getHighestCommonBlock: {
				handler: async action =>
					this.chain.actions.getHighestCommonBlock(action),
				isPublic: true,
			},
		};
	}

	async load(channel) {
		this.chain = new Chain(channel, this.options);
		await this.chain.bootstrap();
		channel.publish('chain:bootstrap');
	}

	async unload() {
		return this.chain.cleanup();
	}
}

module.exports = ChainModule;
