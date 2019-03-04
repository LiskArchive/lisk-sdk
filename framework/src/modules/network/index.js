const defaults = require('./defaults');
const Network = require('./network');
const BaseModule = require('../base_module');

/* eslint-disable class-methods-use-this */

/**
 * Network module specification
 *
 * @namespace Framework.Modules
 * @type {module.NetworkModule}
 */
module.exports = class NetworkModule extends BaseModule {
	/* eslint-disable-next-line no-useless-constructor */
	constructor(options) {
		super(options);
	}

	static get alias() {
		return 'network';
	}

	static get info() {
		return {
			author: 'LiskHQ',
			version: '0.1.0',
			name: 'lisk-core-network',
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
		const options = {
			...defaults,
			...this.options,
		};
		this.network = new Network(channel, options);

		channel.once('lisk:ready', () => {
			this.network.bootstrap();
		});
	}

	async unload() {
		return this.network.cleanup(0);
	}
};
