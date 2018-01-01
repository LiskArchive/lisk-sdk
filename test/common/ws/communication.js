'use strict';

var _ = require('lodash');

var System = require('../../../modules/system');
var WSServer = require('./serverMaster');
var wsRPC = require('../../../api/ws/rpc/wsRPC');

var ClientRPCStub = wsRPC.ClientRPCStub;
var ConnectionState = wsRPC.ConnectionState;

var wsCommunication = {

	defaultConnectionState: null,
	defaultSocketPeerHeaders: null,

	// Get the given path
	call: function (procedure, data, done, includePeer) {
		if (!this.defaultConnectionState) {
			this.defaultConnectionState = new ConnectionState('127.0.0.1', 5000);
			this.defaultSocketPeerHeaders = WSServer.generatePeerHeaders({ip: '127.0.0.1', wsPort: 9999});
			System.setHeaders(this.defaultSocketPeerHeaders);
			this.caller = ClientRPCStub.prototype.sendAfterSocketReadyCb(this.defaultConnectionState);
		}
		if (includePeer && typeof data === 'object') {
			data.peer =  _.assign({
				ip: '127.0.0.1',
				wsPort: 9999
			}, this.defaultSocketPeerHeaders);
		}
		return this.caller(procedure)(data, done);
	}
};

module.exports = wsCommunication;
