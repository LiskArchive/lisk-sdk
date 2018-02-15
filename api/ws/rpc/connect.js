/*
 * Copyright © 2018 Lisk Foundation
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

const async = require('async');
const scClient = require('socketcluster-client');
const System = require('../../../modules/system');

const connect = peer => {
	connectSteps.addConnectionOptions(peer);
	connectSteps.addSocket(peer);

	async.parallel([
		() => {
			connectSteps.upgradeSocket(peer);
			connectSteps.registerRPC(peer);
		},
		() => connectSteps.registerSocketListeners(peer),
	]);
	return peer;
};

const connectSteps = {
	addConnectionOptions: peer => {
		peer.connectionOptions = {
			autoConnect: false, // Lazy connection establishment
			port: peer.wsPort,
			hostname: peer.ip,
			query: System.getHeaders(),
		};
		return peer;
	},

	addSocket: peer => {
		peer.socket = scClient.connect(peer.connectionOptions);
		return peer;
	},

	upgradeSocket: () => {},

	registerRPC: () => {},

	registerSocketListeners: () => {},
};

module.exports = connect;
