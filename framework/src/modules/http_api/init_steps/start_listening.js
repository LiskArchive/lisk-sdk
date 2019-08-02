/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

// There is an issue with promisify server.listen so used constructor
const startServer = async (server, port, host) =>
	new Promise((resolve, reject) => {
		server.listen({ host, port }, err => (err ? reject(err) : resolve()));
	});

const listen = async (
	{ components: { logger }, config },
	{ httpServer, httpsServer },
) => {
	httpServer.headersTimeout = config.options.limits.headersTimeout;
	// Disconnect idle clients
	httpServer.setTimeout(config.options.limits.serverSetTimeout);

	httpServer.on('timeout', socket => {
		logger.info(
			`Disconnecting idle socket: ${socket.remoteAddress}:${socket.remotePort}`,
		);
		socket.destroy();
	});

	await startServer(httpServer, config.httpPort, config.address);

	logger.info(`Lisk started: ${config.address}:${config.httpPort}`);

	if (config.ssl.enabled) {
		// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
		httpsServer.headersTimeout = config.options.limits.headersTimeout;
		httpsServer.setTimeout(config.options.limits.serverSetTimeout);
		httpsServer.on('timeout', socket => {
			logger.info(
				`Disconnecting idle socket: ${socket.remoteAddress}:${
					socket.remotePort
				}`,
			);
			socket.destroy();
		});

		await startServer(
			httpsServer,
			config.ssl.options.port,
			config.ssl.options.address,
		);

		logger.info(
			`Lisk https started: ${config.ssl.options.address}:${
				config.ssl.options.port
			}`,
		);
	}
};

module.exports = {
	listen,
};
