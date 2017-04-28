'use strict';

// var node = require('../node.js');
var _ = require('lodash');
var fs = require('fs');

var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var child_process = require('child_process');


var testNodeConfigs = [
	{
		ip: '127.0.0.1',
		port: 4001,
		database: "lisk_local_0",
		peers: {list: [
			{
				ip: '127.0.0.1',
				port: 4002
			}
		]}
	},
	{
		ip: '127.0.0.1',
		port: 4002,
		database: "lisk_local_1",
		peers: {
		list: [
			{
				ip: '127.0.0.1',
				port: 4001
			}
		]}
	}
];

var monitorWSClient = {
	protocol: 'http',
	hostname: '127.0.0.1',
	port: 8000,
	autoReconnect: true
};


function launchTestNodes (testNodeConfigs) {

	// var integrartionConfigPath = __dirname + '/config.integration.json';
	// var initialConfig = require(integrartionConfigPath);
	//
	// testNodeConfigs.forEach(function (testNodeConfig) {
	// 	var config = _.assign({}, initialConfig);
	//
	// 	child_process.exec('dropdb ' + initialConfig.database + ' || createdb ' + initialConfig.database, function (err, stdout) {
	// 		// if (err) {
	// 		// 	throw new Error(err);
	// 		// }
	// 		config.address = testNodeConfig.ip;
	// 		config.port = testNodeConfig.port;
	// 		config.db.database = testNodeConfig.database;
	// 		config.peers.list = testNodeConfig.peers.list;
	//
	// 		fs.writeFileSync(integrartionConfigPath, JSON.stringify(config, null, 4));
	//
	//
	// 		child_process.exec('node app.js -c ' + integrartionConfigPath, function (err, stdout) {
	// 			console.log(stdout);
	// 		});
	//
	// 		// child_process.exec('node app.js -c ' + integrartionConfigPath, function (err, stdout) {
	// 		// 	console.log(stdout);
	// 		// });
	// 	});
	// });


	child_process.exec('pm2 start test/integration/pm2.integration.json', function (err, stdout) {

	});
}

launchTestNodes(testNodeConfigs);

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
