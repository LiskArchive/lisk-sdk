'use strict';

var node = require('../../node.js');

var scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');

var options = {
	protocol: 'http',
	hostname: '127.0.0.1',
	port: 8000,
	autoReconnect: true
};

describe('WS /peer/dupaRpc', function () {

	var socket;

	before(function (done) {
		var wampClient = new WAMPClient();
		socket = scClient.connect(options);
		wampClient.upgradeToWAMP(socket);
		socket.on('connect', function () {
			console.log('CONNECTED');
			done();
		});

		socket.on('error', function (err) {
			console.log('ERROR', err);
			done(err);
		});

	});

	it('should invoke dupaRpc', function (done) {

		var randNumber =  Math.floor( Math.random() * 5 );

		socket.wampSend('dupaRpc', randNumber)
			.then(function (result) {
				console.log('RPC result: ' + randNumber + ' * 2 = ' + result);
				done();
			}).catch(function (err) {
				console.error('RPC multiply by two error', err);
				done(err);
			});

		socket.on('disconnect', function () {
			console.log('DISCONNECTED');
		});


	});
});
