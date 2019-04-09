const path = require('path');
const SocketCluster = require('socketcluster');
const MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');
const wsRPC = require('../api/ws/rpc/ws_rpc').wsRPC;
const WsTransport = require('../api/ws/transport');

const workersControllerPath = path.join(__dirname, '../workers_controller');

module.exports = async ({
	config,
	modules: { transport },
	components: { logger },
}) => {
	const webSocketConfig = {
		workers: 1,
		port: config.wsPort,
		host: '0.0.0.0',
		wsEngine: config.peers.options.wsEngine,
		workerController: workersControllerPath,
		perMessageDeflate: false,
		secretKey: 'liskSecretKey',
		// Because our node is constantly sending messages, we don't
		// need to use the ping feature to detect bad connections.
		pingTimeoutDisabled: true,
		// Maximum amount of milliseconds to wait before force-killing
		// a process after it was passed a 'SIGTERM' or 'SIGUSR2' signal
		processTermTimeout: 10000,
		logLevel: 0,
	};

	const childProcessOptions = {
		version: config.version,
		minVersion: config.minVersion,
		protocolVersion: config.protocolVersion,
		nethash: config.nethash,
		port: config.wsPort,
		nonce: config.nonce,
		blackListedPeers: config.peers.access.blackList,
	};

	const socketCluster = new SocketCluster(webSocketConfig);
	wsRPC.setServer(new MasterWAMPServer(socketCluster, childProcessOptions));

	// The 'fail' event aggregates errors from all SocketCluster processes.
	socketCluster.on('fail', err => {
		logger.error(err);
		if (err.name === 'WSEngineInitError') {
			const extendedError = logger.error(extendedError);
		}
	});

	socketCluster.on('workerExit', workerInfo => {
		let exitMessage = `Worker with pid ${workerInfo.pid} exited`;
		if (workerInfo.signal) {
			exitMessage += ` due to signal: '${workerInfo.signal}'`;
		}
		logger.error(exitMessage);
	});

	return new Promise((resolve, reject) => {
		socketCluster.once('ready', error => {
			if (error) return reject(error);

			logger.info('Socket Cluster ready for incoming connections');

			socketCluster.listen = () => {
				if (config.peers.enabled) {
					new WsTransport(transport);
				}
			};

			return resolve(socketCluster);
		});
	});
};
