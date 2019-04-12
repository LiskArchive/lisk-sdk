const { config } = require('./defaults');
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

	static get defaults() {
		return config;
	}

	get events() {
		return ['ready'];
	}

	get actions() {
		return {
			request: async action => this.network.actions.request(action),
			send: action => this.network.actions.send(action),
			getNetworkStatus: () => this.network.actions.getNetworkStatus(),
			getPeers: action => this.network.actions.getPeers(action),
			getPeersCountByFilter: action =>
				this.network.actions.getPeersCountByFilter(action),
		};
	}

	async load(channel) {
		const options = {
			...config,
			...this.options,
		};
		this.network = new Network(options);

		channel.once('chain:ready', async () => {
			await this.network.bootstrap(channel);
			channel.publish('network:ready');
		});
	}

	async unload() {
		return this.network.cleanup(0);
	}
};
