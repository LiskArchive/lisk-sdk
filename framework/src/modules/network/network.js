const P2P = require('@liskhq/lisk-p2p').P2P;
const { createSystemComponent } = require('../../components/system');
const { createStorageComponent } = require('../../components/storage');
const { createLoggerComponent } = require('../../components/logger');

/**
 * Network Module
 *
 * @namespace Framework.modules.network
 * @type {module.Network}
 */
module.exports = class Network {
	constructor(channel, options) {
		this.channel = channel;
		this.options = options;
		this.logger = null;
	}

	async bootstrap() {
		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);
		const storageConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'storage'
		);
		const systemConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'system'
		);

		this.logger = createLoggerComponent(loggerConfig);
		const dbLogger =
			storageConfig.logFileName &&
			storageConfig.logFileName === loggerConfig.logFileName
				? this.logger
				: createLoggerComponent(
						Object.assign({}, loggerConfig, {
							logFileName: storageConfig.logFileName,
						})
					);

		try {
			// Storage
			this.logger.debug('Initiating storage...');
			const storage = createStorageComponent(storageConfig, dbLogger);

			// System
			this.logger.debug('Initiating system...');
			const system = createSystemComponent(systemConfig, this.logger, storage);

			const p2pConfig = {
				...this.options,
				nodeInfo: {
					...system.headers,
					wsPort: this.options.nodeInfo.wsPort,
				},
			};

			this.p2p = new P2P(p2pConfig);

			this._handleUpdateNodeInfo = (event) => {
				this.p2p.applyNodeInfo(event.data);
			};

			this.channel.subscribe('chain:updateNodeInfo', this._handleUpdateNodeInfo);

			await this.p2p.start();
		} catch (error) {
			this.logger.fatal('Network initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
	}

	async cleanup() {
		// TODO: Unsubscribe 'chain:updateNodeInfo' from channel.
	}
};
