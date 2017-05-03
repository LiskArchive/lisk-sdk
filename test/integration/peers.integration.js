'use strict';

// var node = require('../node.js');
var _ = require('lodash');
var fs = require('fs');
var Q = require('q');

var chai = require('chai');
var expect = require('chai').expect;

var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var child_process = require('child_process');


var testNodeConfigs = [
	{
		ip: '127.0.0.1',
		port: 4001,
		database: 'lisk_local_0',
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
		database: 'lisk_local_1',
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
	port: 'toOverwrite',
	autoReconnect: true,
	query: {
		port: 9999,
		nethash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		version: '0.0.0a',
		nonce: 'ABCD'
	}
};


function launchTestNodes (cb) {

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
		return cb(err);
	});
}

function killTestNodes (cb) {
	child_process.exec('pm2 delete all', function (err, stdout) {
		return cb(err);
	});
}

function recreateDatabases (done) {
	var recreatedCnt = 0;
	testNodeConfigs.forEach(function (nodeConfig) {
		child_process.exec('dropdb ' + nodeConfig.database + ' || createdb ' + nodeConfig.database, function (err, stdout) {
			if (err) {
				return done(err);
			}
			recreatedCnt += 1;
			if (recreatedCnt === testNodeConfigs.length) {
				done();
			}
		});
	});
}

before(function (done) {
	recreateDatabases(done);
});

before(function (done) {
	launchTestNodes(done);
});

describe('WS /peer/list', function () {

	var sockets = [];

	before(function (done) {
		var connectedTo = 0;
		var wampClient = new WAMPClient();
		//ToDo: more clever way for waiting until all test node being able to receive connections
		setTimeout(function () {
			testNodeConfigs.forEach(function (testNodeConfig) {
				monitorWSClient.port = testNodeConfig.port + 1000;
				var socket = scClient.connect(monitorWSClient);
				wampClient.upgradeToWAMP(socket);
				socket.on('connect', function () {
					console.log('CONNECTED');
					sockets.push(socket);
					connectedTo += 1;
					if (connectedTo === testNodeConfigs.length) {
						done()
					}
				});
				socket.on('error', function (err) {
					console.log('ERROR', err);
					done(err);
				});
			});
		}, 5000);

		function mockPeering () {
			testNodeConfigs.forEach(function (testNodeConfig) {
				connectedTo = 0;
				monitorWSClient.port = testNodeConfig.port + 1000;
				var fakeConnectionAttempt = Object.assign({}, monitorWSClient, {
					port: testNodeConfig.port + 1000,
					query: {
						port: 9999,
						nethash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
						version: '0.0.0a',
						nonce: 'ABCD'
					}
				});
				socket = scClient.connect(fakeConnectionAttempt);
				wampClient.upgradeToWAMP(socket);
				socket.on('connect', function () {
					console.log('CONNECTED');
					sockets.push(socket);
					connectedTo += 1;
					if (connectedTo === testNodeConfigs.length) {
						done();
					}
				});
				socket.on('error', function (err) {
					console.log('ERROR', err);
					done(err);
				});
			});
		}
	});

	it('should return a list of peer mutually interconnected', function (done) {

		Q.all(sockets.map(function (socket) {
			return socket.wampSend('list');
		})).then(function (results) {
			console.log("ALL LISTS RESULTS", JSON.stringify(results), null, 2);
			var resultsFrom = 0;
			results.forEach(function (result) {
				resultsFrom += 1;
				expect(result).to.have.property('success').to.be.ok;
				expect(result).to.have.property('peers').to.be.a('array');
				var peerPorts = result.peers.map(function (p) {
					return p.port;
				});
				var everyPeerPorts = _.flatten(testNodeConfigs.map(function (testNodeConfig) {
					return testNodeConfig.peers.list.map(function (p) {
						return p.port;
					})
				}));

				expect(_.intersection(everyPeerPorts, peerPorts)).to.be.an('array').and.not.to.be.empty;
				if (resultsFrom === testNodeConfigs.length) {
					done();
				}
			});


		}).catch(function (err) {
			done(err);
		});
	});
});


after(function (done) {
	killTestNodes(done);
});