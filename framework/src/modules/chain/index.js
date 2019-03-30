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
			name: 'lisk-core-chain',
		};
	}

	static get defaults() {
		return DefaultConfig;
	}

	get events() {
		return [
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
			calculateSupply: action => this.chain.actions.calculateSupply(action),
			calculateMilestone: action =>
				this.chain.actions.calculateMilestone(action),
			calculateReward: action => this.chain.actions.calculateReward(action),
			generateDelegateList: action =>
				this.chain.actions.generateDelegateList(action),
			getNetworkHeight: async action =>
				this.chain.actions.getNetworkHeight(action),
			getAllTransactionsCount: async () =>
				this.chain.actions.getAllTransactionsCount(),
			updateForgingStatus: async action =>
				this.chain.actions.updateForgingStatus(action),
			getPeers: async action => this.chain.actions.getPeers(action),
			getPeersCountByFilter: async action =>
				this.chain.actions.getPeersCountByFilter(action),
			postSignature: async action => this.chain.actions.postSignature(action),
			getLastConsensus: async () => this.chain.actions.getLastConsensus(),
			loaderLoaded: async () => this.chain.actions.loaderLoaded(),
			loaderSyncing: async () => this.chain.actions.loaderSyncing(),
			getForgersKeyPairs: async () => this.chain.actions.getForgersKeyPairs(),
			getForgingStatusForAllDelegates: async () =>
				this.chain.actions.getForgingStatusForAllDelegates(),
			getForgersPublicKeys: async () =>
				this.chain.actions.getForgersPublicKeys(),
			getTransactionsFromPool: async action =>
				this.chain.actions.getTransactionsFromPool(action),
			getLastCommit: async () => this.chain.actions.getLastCommit(),
			getBuild: async () => this.chain.actions.getBuild(),
			postTransaction: async action =>
				this.chain.actions.postTransaction(action),
			getDelegateBlocksRewards: async action =>
				this.chain.actions.getDelegateBlocksRewards(action),
			getSlotTime: async action => this.chain.actions.getSlotTime(action),
			getSlotNumber: async action => this.chain.actions.getSlotNumber(action),
			calcSlotRound: async action => this.chain.actions.calcSlotRound(action),
		};
	}

	async load(channel) {
		this.chain = new Chain(channel, this.options);

		channel.once('lisk:ready', async () => {
			await this.chain.bootstrap();
		});
	}

	async unload() {
		return this.chain.cleanup(0);
	}
};
