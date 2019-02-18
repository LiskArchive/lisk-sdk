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
		return [];
	}

	get actions() {
		return {};
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
