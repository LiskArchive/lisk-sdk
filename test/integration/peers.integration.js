'use strict';

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
		port: 4000,
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
					port: 4000
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

function clearLogs (cb) {
	child_process.exec('rm -rf test/integration/logs/*', function (err, stdout) {
		return cb(err);
	});
}

function launchTestNodes (cb) {
	child_process.exec('node_modules/.bin/pm2 start test/integration/pm2.integration.json', function (err, stdout) {
		return cb(err);
	});
}

function killTestNodes (cb) {
	child_process.exec('node_modules/.bin/pm2 delete all', function (err, stdout) {
		return cb(err);
	});
}

function recreateDatabases (done) {
	var recreatedCnt = 0;
	testNodeConfigs.forEach(function (nodeConfig) {
		child_process.exec('dropdb ' + nodeConfig.database + ' && createdb ' + nodeConfig.database, function (err, stdout) {
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
	clearLogs(done);
});

before(function (done) {
	recreateDatabases(done);
});

before(function (done) {
	launchTestNodes(done);
});

before(function (done) {
	require('../common/globalBefore').waitUntilBlockchainReady(done, 10, 2000, 'http://' + testNodeConfigs[0].ip + ':' + testNodeConfigs[0].port);
});

describe('Peers mutual connections', function () {

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
					sockets.push(socket);
					connectedTo += 1;
					if (connectedTo === testNodeConfigs.length) {
						done();
					}
				});
				socket.on('error', function (err) {});
				socket.on('connectAbort', function (err) {
					done('Unable to establish WS connection with ' + testNodeConfig.ip + ':' + testNodeConfig.port);
				});
			}, 1000);
		});
	});

	it('should return a list of peer mutually interconnected', function (done) {

		Q.all(sockets.map(function (socket) {
			return socket.wampSend('list');
		})).then(function (results) {
			console.log('ALL LISTS RESULTS', JSON.stringify(results, null, 2));
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
					});
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
