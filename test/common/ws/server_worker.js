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

const SCWorker = require('socketcluster/scworker');
const SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');

const worker = SCWorker.create({
	run() {
		const worker = this;
		const scServer = this.getSCServer();

		const slaveWAMPServer = new SlaveWAMPServer(worker, 20e3);

		slaveWAMPServer.reassignRPCSlaveEndpoints({
			updateMyself(data, callback) {
				callback(null);
			},
		});

		scServer.on('connection', socket => {
			slaveWAMPServer.upgradeToWAMP(socket);
			socket.emit('accepted');
		});
	},
});

module.exports = worker;
