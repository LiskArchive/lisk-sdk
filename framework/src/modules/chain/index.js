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
	events: [],
	actions: {},
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
