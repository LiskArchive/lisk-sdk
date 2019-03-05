const {
	P2P,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
} = require('@liskhq/lisk-p2p');
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
	}

	async bootstrap(channel) {
		this.channel = channel;

		const loggerConfig = await this.channel.invoke(
			'lisk:getComponentConfig',
			'logger'
		);

		this.logger = createLoggerComponent(loggerConfig);

		const initialNodeInfo = await this.channel.invoke('chain:getNodeInfo');

		const p2pConfig = {
			...this.options,
			nodeInfo: {
				...initialNodeInfo,
				wsPort: this.options.nodeInfo.wsPort,
			},
		};

		this.p2p = new P2P(p2pConfig);

		this._handleUpdateNodeInfo = event => {
			this.p2p.applyNodeInfo(event.data);
		};

		this.channel.subscribe(
			'chain:system:updateNodeInfo',
			this._handleUpdateNodeInfo
		);

		this.p2p.on(EVENT_REQUEST_RECEIVED, async request => {
			try {
				const result = await this.channel.invoke(
					request.procedure,
					request.data
				);
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
			send: action =>
				this.p2p.send({
					event: action.params.event,
					data: action.params.data,
				}),
			getNetworkStatus: () => this.p2p.getNetworkStatus(),
			applyPenalty: action => this.p2p.applyPenalty(action.params),
		};
	}

	/* eslint-disable-next-line class-methods-use-this */
	async cleanup() {
		// TODO: Unsubscribe 'chain:system:updateNodeInfo' from channel.
		await this.p2p.stop();
	}
};
