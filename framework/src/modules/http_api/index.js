const defaults = require('./defaults/exceptions');
const HttpApi = require('./httpApi');

let httpApi = null;

/**
 * Chain Module specification
 *
 * @namespace Framework.modules.chain
 * @type {{defaults, load(*=, *=): Promise<void>, unload(*, *): Promise<*>, alias: string, actions: {}, events: Array, info: {author: string, name: string, version: string}}}
 */
module.exports = {
	alias: 'http_api',
	info: {
		author: 'LiskHQ',
		version: '0.1.0',
		name: 'lisk-core-http-api',
	},
	defaults,
	events: [],
	actions: {},
	async load(channel, options) {
		httpApi = new HttpApi(channel, options);
		channel.once('lisk:ready', () => {
			httpApi.bootstrap();
		});
	},
	// eslint-disable-next-line no-unused-vars
	async unload(channel, options) {
		// return blockchain.cleanup(0);
	},
};
