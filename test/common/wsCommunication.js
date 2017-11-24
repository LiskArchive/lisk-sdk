'use strict';

var _ = require('lodash');
var ClientRPCStub = require('../../api/ws/rpc/wsRPC').ClientRPCStub;
var ConnectionState = require('../../api/ws/rpc/wsRPC').ConnectionState;
var System = require('../../modules/system');
var WSClient = require('../common/wsClient');

var wsCommunication = {

	defaultConnectionState: null,
	defaultSocketPeerHeaders: null,

	// Get the given path
	call: function (procedure, data, done, includePeer) {
		if (!this.defaultConnectionState) {
			this.defaultConnectionState = new ConnectionState('127.0.0.1', 5000);
			this.defaultSocketPeerHeaders = WSClient.generatePeerHeaders('127.0.0.1', 9999);
			System.setHeaders(this.defaultSocketPeerHeaders);
			this.caller = ClientRPCStub.prototype.sendAfterSocketReadyCb(this.defaultConnectionState);
		}
		if (includePeer && typeof data === 'object') {
			data.peer =  _.assign({
				ip: '127.0.0.1',
				port: 9999
			}, this.defaultSocketPeerHeaders);
		}
		return this.caller(procedure)(data, done);
	}
};

module.exports = wsCommunication;
