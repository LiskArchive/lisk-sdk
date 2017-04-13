'use strict';

var node = require('../../node.js');

var scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');

var genesisblock = require('../../genesisBlock.json');

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
		clientSocket = scClient.connect(options);
		wampClient.upgradeToWAMP(clientSocket);
		clientSocket.on('connect', function () {
			console.log('CONNECTED');
			done();
		});

		clientSocket.on('error', function (err) {
			console.log('ERROR', err);
			done(err);
		});

	});

	it('should invoke dupaRpc', function (done) {

		var randNumber =  Math.floor( Math.random() * 5 );

		// clientSocket.emit('dupaEmit', randNumber);

		// done();
		// clientSocket.send('dupaRpc', randNumber);
		// var interval = setTimeout(function ()  {
		clientSocket.wampSend('dupaRpc', randNumber)
			.then(function (result) {
				console.log('RPC result: ' + randNumber + ' * 2 = ' + result);
				done();
			}).catch(function (err) {
				console.error('RPC multiply by two error', err);
				done(err);
			});
		// }, 1000);

		clientSocket.on('disconnect', function () {
			console.log('DISCONNECTED');
			clearInterval(interval);
		});


	});
});
