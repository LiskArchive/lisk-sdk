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
 * @param {Object} peer
 * @param {function} cb
 */
SlaveToMasterSender.prototype.send = function (procedureName, peer, cb) {
	this.slaveWAMPServer.sendToMaster(procedureName, {peer: peer, authKey: this.slaveWAMPServer.worker.options.authKey}, peer.nonce, cb);
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
