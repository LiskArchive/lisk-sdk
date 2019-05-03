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

const { config: DefaultConfig } = require('./defaults');
const Chain = require('./chain');
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

	static get defaults() {
		return DefaultConfig;
	}

	get events() {
		return [
			'bootstrap',
			'blocks:change',
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
				public: true,
			},
			calculateMilestone: {
				handler: action =>
					this.chain.actions.calculateMilestone(action),
				public: true,
			},
			calculateReward: {
				handler: action =>
					action => this.chain.actions.calculateReward(action),
				public: true,
			},
			generateDelegateList: {
				handler: action =>
				this.chain.actions.generateDelegateList(action),
				public: true,
			},
			updateForgingStatus: {
				handler: async action =>
				this.chain.actions.updateForgingStatus(action),
				public: true,
			},
			postSignature: {
				handler: async action => this.chain.actions.postSignature(action),
				public: true,
			},
			getForgingStatusForAllDelegates: {
				handler: async () =>
				this.chain.actions.getForgingStatusForAllDelegates(),
				public: true,
			},
			getTransactionsFromPool: {
				handler: async action =>
				this.chain.actions.getTransactionsFromPool(action),
				public: true,
			},
			getTransactions: {
				handler: async () => this.chain.actions.getTransactions(),
				public: true,
			},
			getSignatures: {
				handler: async () => this.chain.actions.getSignatures(),
				public: true,
			},
			getLastCommit: {
				handler: async () => this.chain.actions.getLastCommit(),
				public: true,
			},
			getBuild: {
				handler: async () => this.chain.actions.getBuild(),
				public: true,
			},
			postTransaction: {
				handler: async action =>
				this.chain.actions.postTransaction(action),
				public: true,
			},
			getDelegateBlocksRewards: {
				handler: async action =>
				this.chain.actions.getDelegateBlocksRewards(action),
				public: true,
			},
			getSlotNumber: {
				handler: async action => this.chain.actions.getSlotNumber(action),
				public: true,
			},
			calcSlotRound: {
				handler: async action => this.chain.actions.calcSlotRound(action),
				public: true,
			},
			getNodeStatus: {
				handler: async () => this.chain.actions.getNodeStatus(),
				public: true,
			},
			blocks: {
				handler: async action => this.chain.actions.blocks(action),
				public: true,
			},
			blocksCommon: {
				handler: async action => this.chain.actions.blocksCommon(action),
				public: true,
			},
		};
	}

	async load(channel) {
		this.chain = new Chain(channel, this.options);
		await this.chain.bootstrap();
		channel.publish('chain:bootstrap');
	}

	async unload() {
		return this.chain.cleanup(0);
	}
};
