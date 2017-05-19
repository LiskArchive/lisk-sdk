'use strict';

var _ = require('lodash');
var fs = require('fs');
var Q = require('q');

var chai = require('chai');
var expect = require('chai').expect;

var scClient = require('socketcluster-client');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var child_process = require('child_process');
var waitUntilBlockchainReady = require('../common/globalBefore').waitUntilBlockchainReady;

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
		console.log(stdout);
		return cb(err);
	});
}

function runFunctionalTests (cb) {
	child_process.exec('npm run test-functional', {maxBuffer: require('buffer').kMaxLength - 1}, function (err, stdout) {
		console.log(stdout);
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

	var nodesReadyCnt = 0;
	var nodeReadyCb = function (err) {
		if (err) {
			return done(err);
		}
		nodesReadyCnt += 1;
		if (nodesReadyCnt === testNodeConfigs.length) {
			done();
		}
	};

	testNodeConfigs.forEach(function (testNodeConfig) {
		waitUntilBlockchainReady(nodeReadyCb, 10, 2000, 'http://' + testNodeConfig.ip + ':' + testNodeConfig.port);
	});
});

var sockets = [];

describe('Peers mutual connections', function () {

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

describe('propagation', function () {

	before(function (done) {
		runFunctionalTests(done);
	});

	describe('blocks', function () {

		var nodesBlocks;

		before(function (done) {
			Q.all(sockets.map(function (socket) {
				return socket.wampSend('blocks');
			})).then(function (results) {
				nodesBlocks = results.map(function (res) {
					return res.blocks;
				});
				expect(nodesBlocks).to.have.lengthOf(testNodeConfigs.length);
				done();
			}).catch(function (err) {
				done(err);
			});
		});

		it('should contain non empty blocks after running functional tests', function () {
			nodesBlocks.forEach(function (blocks) {
				expect(blocks).to.be.an('array').and.not.empty;
			});
		});

		it('should have all peers at the same height', function () {
			var uniquePeersHeights = _(nodesBlocks).map('length').uniq().value();
			expect(uniquePeersHeights).to.have.lengthOf(1);
		});

		it('should have all blocks the same at all peers', function () {
			var patternBlocks = nodesBlocks[0];
			for (var i = 0; i < patternBlocks.length; i += 1) {
				for (var j = 1; j < nodesBlocks.length; j += 1) {
					expect(_.isEqual(nodesBlocks[j][i], patternBlocks[i]));
				}
			}
		});
	});
});


after(function (done) {
	killTestNodes(done);
});
