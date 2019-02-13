const util = require('util');
const express = require('express');
const http = require('http');
const socket = require('socket.io');
const fs = require('fs');

module.exports = async (config, logger) => {
	const app = express();

	if (config.coverage) {
		// eslint-disable-next-line import/no-extraneous-dependencies
		const im = require('istanbul-middleware');
		logger.debug(
			'Hook loader for coverage - Do not use in production environment!'
		);
		im.hookLoader(__dirname);
		app.use('/coverage', im.createHandler());
	}

	if (config.trustProxy) {
		app.enable('trust proxy');
	}

	const server = http.createServer(app);
	const io = socket(server);

	let privateKey;
	let certificate;
	let https;
	let https_io;

	if (config.api.ssl && config.api.ssl.enabled) {
		privateKey = fs.readFileSync(config.api.ssl.options.key);
		certificate = fs.readFileSync(config.api.ssl.options.cert);

		https = require('https').createServer(
			{
				key: privateKey,
				cert: certificate,
				ciphers:
					'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
			},
			app
		);

		https_io = require('socket.io')(https);
	}

	const network = {
		express,
		app,
		server,
		io,
		https,
		https_io,
	};

	network.listen = () => {
		const serverListen = util.promisify(server.listen);
		// Listen to http
		// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
		server.headersTimeout = config.api.options.limits.headersTimeout;
		server.setTimeout(config.api.options.limits.serverSetTimeout);

		server.on('timeout', timeOutSocket => {
			logger.info(
				`Disconnecting idle socket: ${timeOutSocket.remoteAddress}:${
					timeOutSocket.remotePort
				}`
			);
			timeOutSocket.destroy();
		});

		return serverListen({ port: config.httpPort, host: config.address })
			.then(() => {
				logger.info(`Lisk started: ${config.address}:${config.httpPort}`);

				if (config.api.ssl.enabled) {
					// Security vulnerabilities fixed by Node v8.14.0 - "Slowloris (cve-2018-12122)"
					https.headersTimeout = config.api.options.limits.headersTimeout;
					https.setTimeout(config.api.options.limits.serverTimeout);
					https.on('timeout', timeOutSocket => {
						logger.info(
							`Disconnecting idle socket: ${timeOutSocket.remoteAddress}:${
								timeOutSocket.remotePort
							}`
						);
						timeOutSocket.destroy();
					});

					const httpsListen = util.promisify(https.listen);

					return httpsListen(
						config.api.ssl.options.port,
						config.api.ssl.options.address
					)
						.then(() => {
							logger.info(
								`Lisk https started: ${config.api.ssl.options.address}:${
									config.api.ssl.options.port
								}`
							);
						})
						.catch(httpsListenErr => {
							logger.error(`HTTP Server listening error: ${httpsListenErr}`);
							throw httpsListenErr;
						});
				}
				return true;
			})
			.catch(serverListenErr => {
				logger.error(`HTTP Server listening error: ${serverListenErr}`);
				throw serverListenErr;
			});
	};

	return network;
};
