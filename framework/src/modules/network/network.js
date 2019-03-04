const {
	P2P,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
} = require('@liskhq/lisk-p2p');
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
	constructor(options) {
		this.options = options;
		this.channel = null;
		this.logger = null;
		this.system = null;
	}

	async bootstrap(channel) {
		this.channel = channel;

		try {
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

			// Storage
			this.logger.debug('Initiating storage...');
			const storage = createStorageComponent(storageConfig, dbLogger);

			// System
			this.logger.debug('Initiating system...');
			this.system = createSystemComponent(systemConfig, this.logger, storage);
		} catch (error) {
			this.logger.fatal('Network initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);

			return;
		}

		const p2pConfig = {
			...this.options,
			nodeInfo: {
				...this.system.headers,
				wsPort: this.options.nodeInfo.wsPort,
			},
		};

		this.p2p = new P2P(p2pConfig);

		this._handleUpdateNodeInfo = event => {
			this.p2p.applyNodeInfo(event.data);
		};

		this.channel.subscribe('chain:system:updateNodeInfo', this._handleUpdateNodeInfo);

		this.p2p.on(EVENT_REQUEST_RECEIVED, async request => {
			try {
				const result = await this.channel.invoke(request.procedure, request.data);
				request.end(result); // Send the response back to the peer.
			} catch (error) {
				request.error(error); // Send an error back to the peer.
			}
		});

		this.p2p.on(EVENT_MESSAGE_RECEIVED, async packet => {
			this.channel.publish(`network:${packet.event}`, packet.data);
		});

		try {
			await this.p2p.start();
		} catch (error) {
			this.logger.fatal('Network initialization', {
				message: error.message,
				stack: error.stack,
			});
			process.emit('cleanup', error);
		}
	}

	get actions() {
		return {
			request: async action =>
				this.p2p.request({
					procedure: action.params.procedure,
					data: action.params.data,
				}),
			send: action => this.p2p.send({
					event: action.params.event,
					data: action.params.data,
				}),
		};
	}

	/* eslint-disable-next-line class-methods-use-this */
	async cleanup() {
		// TODO: Unsubscribe 'chain:system:updateNodeInfo' from channel.
	}
};
