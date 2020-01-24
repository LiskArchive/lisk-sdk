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

// Initialize global variables
require('../../mocha/setup');

const testConfig = __testContext.config;
const random = require('../random');

const generatePeerHeader = function(headers = {}) {
	const operatingSystems = ['win32', 'win64', 'ubuntu', 'debian', 'centos'];
	const httpPort = headers.httpPort || random.number(1025, 65536);

	const defaults = {
		networkId: testConfig.app.networkId,
		height: 1,
		wsPort: headers.wsPort || httpPort - 1,
		httpPort,
		os: operatingSystems[random.number(0, operatingSystems.length)],
		version: testConfig.app.version,
		minVersion: testConfig.app.minVersion,
		protocolVersion: testConfig.app.protocolVersion,
	};

	const nodeInfo = {
		...defaults,
		...headers,
	};

	return {
		blacklistedIPs: ['127.1.0.1'],
		seedPeers: testConfig.network.seedPeers.map(v => ({
			ipAddress: v.ip,
			wsPort: v.wsPort,
		})),
		ackTimeout: 20000,
		nodeInfo,
	};
};

module.exports = {
	generatePeerHeader,
};
