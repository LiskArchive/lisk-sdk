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

/**
 * Sends messages from slave processes to master
 * @param {SlaveWAMPServer} slaveWAMPServer - used to send verified update requests to master process.
 * @constructor
 */
function SlaveToMasterSender (slaveWAMPServer) {
	this.slaveWAMPServer = slaveWAMPServer;
}

/**
 * Sends requests to main process with SocketCluster authKey attached
 * @param {string} procedureName
 * @param {number} updateType
 * @param {Object} peer
 * @param {function} cb
 */
SlaveToMasterSender.prototype.send = function (procedureName, updateType, peer, cb) {
	this.slaveWAMPServer.sendToMaster(procedureName, {
		peer: peer,
		authKey: this.slaveWAMPServer.worker.options.authKey,
		updateType: updateType
	}, peer.nonce, cb);
};

/**
 * @param {string} nonce
 * @param {function} cb
 */
SlaveToMasterSender.prototype.getPeer = function (nonce, cb) {
	this.slaveWAMPServer.sendToMaster('list', {query: {nonce: nonce}}, nonce, function (err, result) {
		if (err) {
			return setImmediate(cb, err);
		}
		return setImmediate(cb, null, !!result.peers.length);
	});
};

module.exports = SlaveToMasterSender;
