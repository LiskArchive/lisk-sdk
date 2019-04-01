const HttpApi = require('./http_api');
const BaseModule = require('../base_module');
const { config: defaultConfig } = require('./defaults');

/* eslint-disable class-methods-use-this */

/**
 * Http API module specification
 *
 * @namespace Framework.Modules
 * @type {module.HttpAPIModule}
 */
class HttpAPIModule extends BaseModule {
	constructor(options) {
		super(options);
		this.httpApi;
	}

	static get alias() {
		return 'http_api';
	}

	static get info() {
		return {
			author: 'LiskHQ',
			version: '0.1.0',
			name: 'lisk-core-http-api',
		};
	}

	static get defaults() {
		return defaultConfig;
	}

	get events() {
		return [];
	}

	get actions() {
		return {};
	}

	async load(channel) {
		this.httpApi = new HttpApi(channel, this.options);

		channel.once('lisk:ready', async () => {
			await this.httpApi.bootstrap();
		});
	}

	async unload() {
		return this.httpApi ? this.httpApi.cleanup(0) : true;
	}
}

module.exports = HttpAPIModule;
