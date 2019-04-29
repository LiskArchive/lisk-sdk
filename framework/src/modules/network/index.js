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
		return ['bootstrap', 'remoteEvent'];
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
		this.network = new Network(this.options);
		await this.network.bootstrap(channel);
		channel.publish('network:bootstrap');
	}

	async unload() {
		return this.network.cleanup(0);
	}
};
