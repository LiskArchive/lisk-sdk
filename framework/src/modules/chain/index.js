const defaults = require('./defaults/exceptions');
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

	get defaults() {
		return defaults;
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
			'system:updateNodeInfo',
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
			storageRead: async action => this.chain.actions.storageRead(action),
			getLastConsensus: async () => this.chain.actions.getLastConsensus(),
			loaderLoaded: async () => this.chain.actions.loaderLoaded(),
			loaderSyncing: async () => this.chain.actions.loaderSyncing(),
			getForgersKeyPairs: async () => this.chain.actions.getForgersKeyPairs(),
			getUnProcessedTransactions: async action =>
				this.chain.actions.getUnProcessedTransactions(action),
			getUnconfirmedTransactions: async action =>
				this.chain.actions.getUnconfirmedTransactions(action),
			getMultisignatureTransactions: async action =>
				this.chain.actions.getMultisignatureTransactions(action),
			getLastCommit: async () => this.chain.actions.getLastCommit(),
			getBuild: async () => this.chain.actions.getBuild(),
			postTransaction: async action =>
				this.chain.actions.postTransaction(action),
			getDelegateBlocksRewards: async action =>
				this.chain.actions.getDelegateBlocksRewards(action),
		};
	}

	async load(channel) {
		this.chain = new Chain(channel, this.options);

		channel.once('lisk:ready', () => {
			this.chain.bootstrap();
		});
	}

	async unload() {
		return this.chain.cleanup(0);
	}
};
