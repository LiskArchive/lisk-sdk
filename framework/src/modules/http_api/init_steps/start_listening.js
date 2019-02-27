module.exports = async ({ components: { logger }, config }, { httpServer, httpsServer }) => {
	// There is an issue with promisify server.listen so used constructor
	const startServer = async (server, port, host) =>
		new Promise((resolve, reject) => {
			server.listen({ host, port }, err => (err ? reject(err) : resolve()));
		});

	httpServer.headersTimeout = config.api.options.limits.headersTimeout;
	// Disconnect idle clients
	httpServer.setTimeout(
		config.api.options.limits.serverSetTimeout
	);

	httpServer.on('timeout', socket => {
		logger.info(
			`Disconnecting idle socket: ${socket.remoteAddress}:${
				socket.remotePort
				}`
		);
		socket.destroy();
	});

	await startServer(
		httpServer,
		config.httpPort,
		config.address
	);

	logger.info(
		`Lisk started: ${config.address}:${
			config.httpPort
			}`
	);

	if (config.api.ssl.enabled) {
		// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
		httpsServer.headersTimeout = config.api.options.limits.headersTimeout;
		httpsServer.setTimeout(
			config.api.options.limits.serverTimeout
		);
		httpsServer.on('timeout', socket => {
			logger.info(
				`Disconnecting idle socket: ${socket.remoteAddress}:${
					socket.remotePort
					}`
			);
			socket.destroy();
		});

		await startServer(
			httpsServer,
			config.api.ssl.options.port,
			config.api.ssl.options.address
		);

		logger.info(
			`Lisk https started: ${config.api.ssl.options.address}:${
				config.api.ssl.options.port
				}`
		);
	}
};
