const defaults = require('./defaults/exceptions');
const Chain = require('./chain');

let blockchain = null;

module.exports = {
	alias: 'chain',
	info: {
		author: 'LiskHQ',
		version: '0.0.1',
		name: 'lisk-core-chain',
	},
	defaults,
	events: [],
	actions: {},
	async load(channel, options) {
		blockchain = new Chain(channel, options);
		channel.once('lisk:ready', async () => {
			blockchain.bootstrap();
		});
	},
	// eslint-disable-next-line no-unused-vars
	async unload(channel, options) {
		return blockchain.cleanup(0);
	},
};
