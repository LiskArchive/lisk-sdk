'use strict';

var _ = require('lodash');
var memored = require('memored');
var commander = require('commander');
var packageJson = require('../../package.json');
var url = require('url');

var SlaveWAMPServer = require('wamp-socket-cluster/SlaveWAMPServer');
var config = require('../../config.json');
var masterProcessController = require('./masterProcessController');
var endpoints = require('./endpoints');

var Peer = require('../../logic/peer');
var Config = require('../../helpers/config');
var System = require('../../modules/system');
var Handshake = require('../../helpers/wsApi').middleware.Handshake;

/**
 * @class WorkerController
 */
function WorkerController () {}

WorkerController.path = __dirname + 'workersController.js';

/**
 * Function is invoked by SocketCluster 
 * @param {Worker} worker
 */
WorkerController.prototype.run = function (worker) {
	console.log('\x1b[36m%s\x1b[0m', 'WORKERS CONTROLLER ----- RUN');

	var scServer = worker.getSCServer();

	var slaveWAMPServer = new SlaveWAMPServer(worker);

	initializeHandshake(scServer, slaveWAMPServer, function (err, handshake) {
		scServer.on('connection', function (socket) {
			console.log('\x1b[36m%s\x1b[0m', 'WORKER CONNECTION');
			slaveWAMPServer.upgradeToWAMP(socket);

			socket.on('error', function (err) {
				//ToDo: Again logger here- log errors somewhere like err.message: 'Socket hung up'
				console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- ERROR', err);
			});

			socket.on('disconnect', function () {
				slaveWAMPServer.onSocketDisconnect(socket);
				console.log('\x1b[36m%s\x1b[0m', 'WorkerController:SOCKET-ON --- DISCONNECTED', socket.id);
			}.bind(this));
		});
	});
};

console.log('\x1b[36m%s\x1b[0m', 'WORKER CONTROLLER ACCESSED:');

function initializeHandshake (scServer, slaveWAMPServer, cb) {
	var config = getProcessConfig();
	console.log('\x1b[36m%s\x1b[0m', 'WORKER initializeHandshake: config', config.port);

	new System(function (err, system) {
		var handshake = Handshake(system);
		scServer.addMiddleware(scServer.MIDDLEWARE_HANDSHAKE, function (req, next) {

			var headers = _.get(url.parse(req.url, true), 'query', {});
			console.log('\x1b[36m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE: connection', headers);
			console.log('\x1b[36m%s\x1b[0m', 'WORKER MIDDLEWARE_HANDSHAKE: socketId', req.headers.host);
			handshake(headers, function (err, peer) {
				console.log('\x1b[36m%s\x1b[0m', 'WORKER handshake res: ', err, "peer:", peer);


				slaveWAMPServer.sendToMaster(err ? 'removePeer' : 'acceptPeer', {
					peer: peer,
					extraMessage: 'extraMessage'
				}, req.headers.host, function (err, peer) {
					return next(err);
				});
			});
		});
		cb(null, handshake);
	}, {config: config});
}

function getProcessConfig () {

	commander
		.version(packageJson.version)
		.option('-c, --config <path>', 'config file path')
		.option('-p, --port <port>', 'listening port number')
		.option('-a, --address <ip>', 'listening host name or ip')
		.option('-x, --peers [peers...]', 'peers list')
		.option('-l, --log <level>', 'log level')
		.option('-s, --snapshot <round>', 'verify snapshot')
		.parse(process.argv);

	return require('../../helpers/config.js')(commander);

}
module.exports =  new WorkerController();

