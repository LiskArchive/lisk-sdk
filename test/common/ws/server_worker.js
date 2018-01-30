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

var SCWorker = require('socketcluster/scworker');
var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var testConfig = require('../../data/config.json');

var worker = SCWorker.create({
	run: function () {
		var worker = this;
		var scServer = this.getSCServer();

		var slaveWAMPServer = new SlaveWAMPServer(worker, 20e3);

		slaveWAMPServer.reassignRPCSlaveEndpoints({
			updateMyself: function (data, callback) {
				callback(null);
			}
		});

		scServer.on('connection', function (socket) {
			slaveWAMPServer.upgradeToWAMP(socket);
			socket.emit('accepted');
		});
	}
});
