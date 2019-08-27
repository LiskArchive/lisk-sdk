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
const { migrations } = require('./migrations');
const BaseModule = require('../base_module');

/* eslint-disable class-methods-use-this */

/**
 * Chain module specification
 *
 * @namespace Framework.Modules
 * @type {module.ChainModule}
 */
module.exports = class ChainModule extends BaseModule {
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
			generateDelegateList: {
				handler: action => this.chain.actions.generateDelegateList(action),
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
				handler: async () => this.chain.actions.getTransactions(),
				isPublic: true,
			},
			getSignatures: {
				handler: async () => this.chain.actions.getSignatures(),
				isPublic: true,
			},
			postTransaction: {
				handler: async action => this.chain.actions.postTransaction(action),
			},
			getDelegateBlocksRewards: {
				handler: async action =>
					this.chain.actions.getDelegateBlocksRewards(action),
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
			},
			blocks: {
				handler: async action => this.chain.actions.blocks(action),
				isPublic: true,
			},
			blocksCommon: {
				handler: async action => this.chain.actions.blocksCommon(action),
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
};
