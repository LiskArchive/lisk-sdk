'use strict';

var schema = require('../../schema/transport');
var WAMPClient = require("wamp-socket-cluster").WAMPClient;
var WAMPServer = require("wamp-socket-cluster").WAMPServer;

var wsApi = require('../../helpers/wsApi');
var workersController = require('./workersController');

function TransportWSApi (transportModule, app, logger) {

	console.log('\x1b[36m%s\x1b[0m', 'TransportWSApi ----- invoke registerWorkerReceiver');



	app.socketCluster('workerMessage')


}

module.exports = TransportWSApi;

