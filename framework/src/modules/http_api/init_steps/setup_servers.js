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

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const socketIO = require('socket.io');

module.exports = ({ components: { logger }, config }) => {
	const expressApp = express();

	if (config.coverage) {
		// eslint-disable-next-line import/no-extraneous-dependencies,global-require
		const im = require('istanbul-middleware');
		logger.debug(
			'Hook loader for coverage - Do not use in production environment!',
		);
		/** @TODO hookLoader path must be updated
		 * to be able to dynamically find the root folder */
		im.hookLoader(path.join(__dirname, '../../../'));
		expressApp.use('/coverage', im.createHandler());
	}

	if (config.trustProxy) {
		expressApp.enable('trust proxy');
	}

	const httpServer = http.createServer(expressApp);
	const wsServer = socketIO(httpServer);
	let wssServer;
	let httpsServer;

	let privateKey;
	let certificate;

	if (config.ssl && config.ssl.enabled) {
		privateKey = fs.readFileSync(config.ssl.options.key);
		certificate = fs.readFileSync(config.ssl.options.cert);

		httpsServer = https.createServer(
			{
				key: privateKey,
				cert: certificate,
				ciphers:
					'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
			},
			expressApp,
		);

		wssServer = socketIO(httpsServer);
	}

	return {
		expressApp,
		httpServer,
		httpsServer,
		wsServer,
		wssServer,
	};
};
