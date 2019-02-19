const defaults = require('./defaults/exceptions');
const Chain = require('./chain');

let blockchain = null;

/**
 * Chain Module specification
 *
 * @namespace Framework.modules.chain
 * @type {{defaults, load(*=, *=): Promise<void>, unload(*, *): Promise<*>, alias: string, actions: {}, events: Array, info: {author: string, name: string, version: string}}}
 */
module.exports = {
	alias: 'chain',
	info: {
		author: 'LiskHQ',
		version: '0.1.0',
		name: 'lisk-core-chain',
	},
	defaults,
	events: [
		'blocks:change',
		'signature:change',
		'transactions:change',
		'rounds:change',
		'multisignatures:signature:change',
		'delegates:fork',
		'loader:sync',
	],
	actions: {
		calculateSupply: action => blockchain.actions().calculateSupply(action),
		calculateMilestone: action =>
			blockchain.actions().calculateMilestone(action),
		calculateReward: action => blockchain.actions().calculateReward(action),
		generateDelegateList: action =>
			blockchain.actions().generateDelegateList(action),
		getNetworkHeight: async action =>
			blockchain.actions().getNetworkHeight(action),
		getTransactionsCount: async () =>
			blockchain.actions().getTransactionsCount(),
		updateForgingStastus: async action =>
			blockchain.actions().updateForgingStastus(action),
		getPeers: async action => blockchain.actions().getPeers(action),
		getPeersCountByFilter: async action =>
			blockchain.actions().getPeersCountByFilter(action),
		postSignature: async action => blockchain.actions().postSignature(action),
		storageRead: async action => blockchain.actions().storageRead(action),
		getLastConsensus: async () => blockchain.actions().getLastConsensus(),
		loaderLoaded: async () => blockchain.actions().loaderLoaded(),
		loaderSyncing: async () => blockchain.actions().loaderSyncing(),
		getForgersKeyPairs: async () => blockchain.actions().getForgersKeyPairs(),
		getUnprocessedTransactions: async () =>
			blockchain.actions().getUnprocessedTransactions(),
		getUnconfirmedTransactions: async () =>
			blockchain.actions().getUnconfirmedTransactions(),
		getMultisignatureTransactions: async () =>
			blockchain.actions().getMultisignatureTransactions(),
	},
	async load(channel, options) {
		blockchain = new Chain(channel, options);
		channel.once('lisk:ready', () => {
			blockchain.bootstrap();
		});
	},
	// eslint-disable-next-line no-unused-vars
	async unload(channel, options) {
		return blockchain.cleanup(0);
	},
};
