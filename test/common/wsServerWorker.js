

var sinon = require('sinon');
var WAMPServer = require('wamp-socket-cluster/WAMPServer');
var testConfig = require('../config.json');

var necessaryRPCEndpoints = {
	status: sinon.stub().callsArgWith(1, {success: true, height: 1, broadhash: testConfig.nethash, nonce: testConfig.nethash}),
	list: sinon.stub().callsArgWith(1, {peers: []}),
	blocks:  sinon.stub().callsArgWith(1, {blocks: []}),
	getSignatures:  sinon.stub().callsArgWith(1, {signatures: []}),
	getTransactions:  sinon.stub().callsArgWith(1, {transactions: []}),
	updateMyself:  sinon.stub().callsArgWith(1, null),
	postTransactions: sinon.stub().callsArgWith(1, null),
	postSignatures: sinon.stub().callsArgWith(1, null),
	postBlock: sinon.stub().callsArgWith(1, sinon.stub().callsArg(1)),
	blocksCommon: sinon.stub().callsArgWith(1, {success: true, common: null})
};

module.exports = {
	run: function (worker) {
		var scServer = worker.scServer;
		this.testWampServer = new WAMPServer();
		this.testWampServer.registerRPCEndpoints(necessaryRPCEndpoints);
		scServer.on('connection', function (socket) {
			this.testWampServer.upgradeToWAMP(socket);
			socket.emit('accepted');
		}.bind(this));
	}
};
