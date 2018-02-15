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
	addConnectionOptions: () => {},

	addSocket: () => {},

	upgradeSocket: () => {},

	registerRPC: () => {},

	registerSocketListeners: () => {},
};

module.exports = connect;
