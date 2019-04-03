const {
	P2P,
	EVENT_CLOSE_OUTBOUND,
	EVENT_CONNECT_OUTBOUND,
	EVENT_DISCOVERED_PEER,
	EVENT_FAILED_TO_FETCH_PEER_INFO,
	EVENT_FAILED_TO_PUSH_NODE_INFO,
	EVENT_OUTBOUND_SOCKET_ERROR,
	EVENT_INBOUND_SOCKET_ERROR,
	EVENT_UPDATED_PEER_INFO,
	EVENT_FAILED_PEER_INFO_UPDATE,
	EVENT_REQUEST_RECEIVED,
	EVENT_MESSAGE_RECEIVED,
} = require('@liskhq/lisk-p2p');
const randomstring = require('randomstring');
const { createLoggerComponent } = require('../../components/logger');

const hasNamespaceReg = /:/;

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

		// TODO: Nonce overwrite should be removed once the Network module has been fully integreated into core and the old peer system has been fully removed.
		// We need this because the old peer system which runs in parallel will conflict with the new one if they share the same nonce.
		const moduleNonce = randomstring.generate(16);
		const sanitizeNodeInfo = nodeInfo => ({
			...nodeInfo,
			state: 2, // TODO: Delete state property
			nonce: moduleNonce,
			wsPort: this.options.nodeInfo.wsPort,
		});

		const initialNodeInfo = sanitizeNodeInfo(
			await this.channel.invoke('chain:getNodeInfo')
		);

		const p2pConfig = {
			...this.options,
			nodeInfo: initialNodeInfo,
		};

		this.p2p = new P2P(p2pConfig);

		this._handleUpdateNodeInfo = event => {
			const newNodeInfo = sanitizeNodeInfo(event.data);
			this.p2p.applyNodeInfo(newNodeInfo);
		};

		this.channel.subscribe(
			'chain:system:updateNodeInfo',
			this._handleUpdateNodeInfo
		);

		// ---- START: Bind event handlers ----

		this.p2p.on(EVENT_CLOSE_OUTBOUND, closePacket => {
			this.logger.debug(
				`Outbound connection of peer ${closePacket.peerInfo.ipAddress}:${
					closePacket.peerInfo.wsPort
				} was closed with code ${closePacket.code} and reason: ${
					closePacket.reason
				}`
			);
		});

		this.p2p.on(EVENT_CONNECT_OUTBOUND, peerInfo => {
			this.logger.info(
				`Connected to peer ${peerInfo.ipAddress}:${peerInfo.wsPort}`
			);
		});

		this.p2p.on(EVENT_DISCOVERED_PEER, peerInfo => {
			this.logger.info(
				`Discovered peer ${peerInfo.ipAddress}:${peerInfo.wsPort}`
			);
		});

		this.p2p.on(EVENT_FAILED_TO_FETCH_PEER_INFO, error => {
			this.logger.error(error.message || error);
		});

		this.p2p.on(EVENT_FAILED_TO_PUSH_NODE_INFO, error => {
			this.logger.error(error.message || error);
		});

		this.p2p.on(EVENT_OUTBOUND_SOCKET_ERROR, error => {
			this.logger.debug(error.message || error);
		});

		this.p2p.on(EVENT_INBOUND_SOCKET_ERROR, error => {
			this.logger.debug(error.message || error);
		});

		this.p2p.on(EVENT_UPDATED_PEER_INFO, peerInfo => {
			this.logger.info(
				`Updated info of peer ${peerInfo.ipAddress}:${
					peerInfo.wsPort
				} to ${JSON.stringify(peerInfo)}`
			);
		});

		this.p2p.on(EVENT_FAILED_PEER_INFO_UPDATE, error => {
			this.logger.error(error.message || error);
		});

		this.p2p.on(EVENT_REQUEST_RECEIVED, async request => {
			this.logger.info(
				`Received inbound request for procedure ${request.procedure}`
			);
			// If the request has already been handled internally by the P2P library, we ignore.
			if (request.wasResponseSent) {
				return;
			}
			const hasTargetModule = hasNamespaceReg.test(request.procedure);
			// If the request has no target module, default to chain (to support legacy protocol).
			const sanitizedProcedure = hasTargetModule
				? request.procedure
				: `chain:${request.procedure}`;
			try {
				const result = await this.channel.invoke(
					sanitizedProcedure,
					request.data
				);
				this.logger.info(`Responsed to peer request ${request.procedure}`);
				request.end(result); // Send the response back to the peer.
			} catch (error) {
				this.logger.error(
					`Could not respond to peer request ${
						request.procedure
					} because of error: ${error.message || error.message}`
				);
				request.error(error); // Send an error back to the peer.
			}
		});

		this.p2p.on(EVENT_MESSAGE_RECEIVED, async packet => {
			const hasSourceModule = hasNamespaceReg.test(packet.event);
			// If the request has no source module, default to chain (to support legacy protocol).
			const sanitizedEvent = hasSourceModule
				? packet.event
				: `chain:${packet.event}`;
			this.logger.info(`Received inbound message for event ${packet.event}`);
			this.channel.publish(`network:${sanitizedEvent}`, packet.data);
		});

		// ---- END: Bind event handlers ----

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

	async cleanup() {
		// TODO: Unsubscribe 'chain:system:updateNodeInfo' from channel.
		return this.p2p.stop();
	}
};
