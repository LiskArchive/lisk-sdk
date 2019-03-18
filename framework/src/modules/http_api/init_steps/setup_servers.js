const fs = require('fs');
const path = require('path');
const express = require('express');

module.exports = ({ components: { logger }, config }) => {
	const expressApp = express();

	if (config.coverage) {
		// eslint-disable-next-line import/no-extraneous-dependencies
		const im = require('istanbul-middleware');
		logger.debug(
			'Hook loader for coverage - Do not use in production environment!'
		);
		/** @TODO hookLoader path must be updated
		 * to be able to dynamically find the root folder */
		im.hookLoader(path.join(__dirname, '../../../'));
		expressApp.use('/coverage', im.createHandler());
	}

	if (config.trustProxy) {
		expressApp.enable('trust proxy');
	}

	const httpServer = require('http').createServer(expressApp);
	const wsServer = require('socket.io')(httpServer);
	let wssServer;
	let httpsServer;

	let privateKey;
	let certificate;

	if (config.api.ssl && config.api.ssl.enabled) {
		privateKey = fs.readFileSync(config.api.ssl.options.key);
		certificate = fs.readFileSync(config.api.ssl.options.cert);

		httpsServer = require('https').createServer(
			{
				key: privateKey,
				cert: certificate,
				ciphers:
					'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
			},
			expressApp
		);

		wssServer = require('socket.io')(httpsServer);
	}

	return {
		expressApp,
		httpServer,
		httpsServer,
		wsServer,
		wssServer,
	};
};
